"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface RecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  selectedMicDevice?: string;
}

export default function Recorder({ onRecordingComplete, isRecording, setIsRecording, selectedMicDevice }: RecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Set isMounted to true once component mounts
  useEffect(() => {
    setIsMounted(true);
    
    // Clean up function to stop recording and release media resources on unmount
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
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
    
    audioChunksRef.current = [];
    
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
        
        if (audioChunksRef.current.length === 0) {
          console.error("No audio chunks recorded");
          setIsRecording(false);
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log("Audio blob created, size:", audioBlob.size);
        
        if (audioBlob.size > 0) {
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
  }, [onRecordingComplete, setIsRecording, isMounted, selectedMicDevice]);

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