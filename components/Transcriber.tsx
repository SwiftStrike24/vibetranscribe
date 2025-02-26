"use client";

import { useState, useEffect, useCallback } from "react";

interface TranscriberProps {
  audioBlob: Blob | null;
  onTranscriptionComplete: (text: string) => void;
  onTranscriptionStart: () => void;
}

export default function Transcriber({ audioBlob, onTranscriptionComplete, onTranscriptionStart }: TranscriberProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Set isMounted to true once component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Define transcribeAudio as a useCallback to avoid recreating it on every render
  const transcribeAudio = useCallback(async (blob: Blob) => {
    if (!blob || !isMounted) return;
    
    setIsTranscribing(true);
    setError(null);
    onTranscriptionStart();

    try {
      // Convert blob to File object
      const file = new File([blob], "recording.wav", { type: "audio/wav" });
      
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("model", "whisper-1");
      
      // Make a request to our API route that will handle the OpenAI API call
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      onTranscriptionComplete(data.text);
    } catch (err) {
      console.error("Transcription error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsTranscribing(false);
    }
  }, [isMounted, onTranscriptionComplete, onTranscriptionStart]);

  // Automatically start transcription when a new audioBlob is received
  useEffect(() => {
    if (audioBlob && isMounted) {
      transcribeAudio(audioBlob);
    }
  }, [audioBlob, isMounted, transcribeAudio]);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="transcriber">
      {isTranscribing && <p>Transcribing...</p>}
      {error && <p className="error">Error: {error}</p>}
    </div>
  );
} 