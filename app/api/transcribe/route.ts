import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import os from 'os';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validate the OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables');
}

// Define a type for OpenAI errors
interface OpenAIError extends Error {
  response?: {
    json: () => Promise<{ error: { message: string } }>;
    statusText?: string;
  };
  status?: number;
  code?: string;
}

export async function POST(request: NextRequest) {
  let tempFilePath = '';
  
  try {
    // Check if the request is a multipart form
    if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Request must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Parse the form data
    const formData = await request.formData();
    const audioFile = formData.get('file') as File;
    const model = formData.get('model') as string || 'whisper-1';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    console.log('Received audio file:', audioFile.name, 'Size:', audioFile.size, 'Type:', audioFile.type);

    // Validate the file
    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Audio file is empty' },
        { status: 400 }
      );
    }

    // Get the system's temporary directory
    const tempDir = os.tmpdir();
    console.log('Using temporary directory:', tempDir);
    
    // Extract file extension from the file name or use a default
    const fileExtension = audioFile.name.split('.').pop() || 'webm';
    
    // Create a temporary file path with a unique name
    tempFilePath = join(tempDir, `${uuidv4()}.${fileExtension}`);
    console.log('Temporary file path:', tempFilePath);
    
    // Write the file to disk
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(tempFilePath, buffer);
    console.log('File written to disk');
    
    // Verify the file exists and has content
    const stats = await fs.promises.stat(tempFilePath);
    console.log('File size on disk:', stats.size);
    
    if (stats.size === 0) {
      throw new Error('File was written but has zero size');
    }
    
    // Validate the OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }
    
    // Call OpenAI API with the file
    console.log('Calling OpenAI API with model:', model);
    
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: model,
        response_format: 'json',
      });
      
      console.log('Transcription received:', transcription.text.substring(0, 50) + '...');

      // Clean up the temporary file
      try {
        await fs.promises.unlink(tempFilePath);
        console.log('Temporary file deleted');
      } catch (cleanupError) {
        console.error('Error deleting temporary file:', cleanupError);
        // Continue despite cleanup error
      }

      return NextResponse.json({ text: transcription.text });
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      
      // Extract the error message from the OpenAI error
      let errorMessage = 'OpenAI API error';
      const typedError = openaiError as OpenAIError;
      
      if (typedError.response) {
        try {
          const errorData = await typedError.response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // If we can't parse the JSON, use the status text
          errorMessage = typedError.response.statusText || errorMessage;
        }
      } else if (typedError.message) {
        errorMessage = typedError.message;
      }
      
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
  } catch (error) {
    console.error('Transcription error:', error);
    
    // Clean up the temporary file if it exists
    if (tempFilePath) {
      try {
        await fs.promises.unlink(tempFilePath);
        console.log('Temporary file deleted after error');
      } catch (cleanupError) {
        console.error('Error deleting temporary file after error:', cleanupError);
        // Continue despite cleanup error
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 