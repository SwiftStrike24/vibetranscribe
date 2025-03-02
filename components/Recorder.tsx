"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface RecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  selectedMicDevice?: string;
}

// Define WebKit AudioContext type for cross-browser compatibility
interface WebkitWindow extends Window {
  webkitAudioContext: typeof AudioContext;
}

export default function Recorder({ onRecordingComplete, isRecording, setIsRecording, selectedMicDevice }: RecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Sound detection metrics
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const hasMeaningfulAudioRef = useRef<boolean>(false);
  const silentFramesCountRef = useRef<number>(0);
  const audioLevelCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Set isMounted to true once component mounts
  useEffect(() => {
    setIsMounted(true);
    
    // Clean up function to stop recording and release media resources on unmount
    return () => {
      stopAudioLevelCheck();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Function to check audio levels during recording
  const startAudioLevelCheck = useCallback((stream: MediaStream) => {
    console.log("Starting audio level monitoring");
    
    // Reset audio detection state
    hasMeaningfulAudioRef.current = false;
    silentFramesCountRef.current = 0;
    
    try {
      // Create audio context for level monitoring
      const AudioContext = window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      // Create analyzer
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      // Create source from stream
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Create data array for analysis
      const bufferLength = analyserRef.current.frequencyBinCount;
      audioDataRef.current = new Uint8Array(bufferLength);
      
      // Start periodic checking
      audioLevelCheckIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !audioDataRef.current) return;
        
        // Get current audio data
        analyserRef.current.getByteFrequencyData(audioDataRef.current);
        
        // Calculate average level
        const sum = audioDataRef.current.reduce((acc, val) => acc + val, 0);
        const avg = sum / audioDataRef.current.length;
        
        // Check if we have meaningful audio (adjust threshold as needed)
        const threshold = 10; // Threshold for considering meaningful audio
        
        if (avg > threshold) {
          hasMeaningfulAudioRef.current = true;
          silentFramesCountRef.current = 0;
          // console.log("Meaningful audio detected, level:", avg.toFixed(2));
        } else {
          silentFramesCountRef.current++;
          // console.log("Silent frame detected, count:", silentFramesCountRef.current);
        }
      }, 500);
    } catch (error) {
      console.error("Error setting up audio level monitoring:", error);
    }
  }, []);
  
  // Stop audio level checking
  const stopAudioLevelCheck = useCallback(() => {
    if (audioLevelCheckIntervalRef.current) {
      clearInterval(audioLevelCheckIntervalRef.current);
      audioLevelCheckIntervalRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    audioDataRef.current = null;
  }, []);

  // Define startRecording as a useCallback to avoid recreating it on every render
  const startRecording = useCallback(async () => {
    if (!isMounted) return;
    
    console.log("Starting recording...");
    
    // Clean up any existing recording session
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    stopAudioLevelCheck();
    audioChunksRef.current = [];
    hasMeaningfulAudioRef.current = false;
    
    try {
      // Ensure we're on the client side
      if (typeof window === 'undefined' || !navigator.mediaDevices) {
        console.error("MediaDevices API not available");
        setIsRecording(false);
        return;
      }
      
      console.log("Requesting microphone access...");
      
      // Configure audio constraints with device ID if provided
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };
      
      // Add deviceId constraint if a specific microphone is selected
      if (selectedMicDevice) {
        console.log("Using selected microphone device:", selectedMicDevice);
        audioConstraints.deviceId = { exact: selectedMicDevice };
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints
      });
      console.log("Microphone access granted");
      
      streamRef.current = stream;
      
      // Start monitoring audio levels
      startAudioLevelCheck(stream);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      
      console.log("MediaRecorder created with mimeType:", mediaRecorder.mimeType);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log("Received audio chunk of size:", event.data.size);
          audioChunksRef.current.push(event.data);
        } else {
          console.warn("Received empty audio chunk");
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped, creating audio blob...");
        console.log("Number of audio chunks:", audioChunksRef.current.length);
        
        // Stop audio level monitoring
        stopAudioLevelCheck();
        
        if (audioChunksRef.current.length === 0) {
          console.error("No audio chunks recorded");
          setIsRecording(false);
          return;
        }
        
        // Create the audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log("Audio blob created, size:", audioBlob.size);
        
        // Check if we had meaningful audio and the blob has a reasonable size
        const minBlobSize = 1000; // Minimum valid blob size in bytes
        
        if (!hasMeaningfulAudioRef.current || audioBlob.size < minBlobSize) {
          console.warn("No meaningful audio detected during recording. Skipping transcription.");
          // We could show a message to the user here
          onRecordingComplete(new Blob([], { type: 'audio/webm' })); // Empty blob as a signal
        } else if (audioBlob.size > 0) {
          console.log("Meaningful audio detected, proceeding with transcription");
          onRecordingComplete(audioBlob);
        } else {
          console.error("Created audio blob is empty");
        }
        
        // Release media resources
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      // Set a data available interval (e.g., every 1 second)
      mediaRecorder.start(1000);
      console.log("MediaRecorder started");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setIsRecording(false);
    }
  }, [onRecordingComplete, setIsRecording, isMounted, selectedMicDevice, startAudioLevelCheck, stopAudioLevelCheck]);

  // Define stopRecording as a useCallback
  const stopRecording = useCallback(() => {
    console.log("Stopping recording...");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      console.log("MediaRecorder stopped");
    } else {
      console.warn("Cannot stop recording: MediaRecorder is not active");
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    if (isRecording) {
      startRecording();
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      stopRecording();
    }
  }, [isRecording, startRecording, stopRecording, isMounted]);

  // This component doesn't render anything visible
  return null;
} 