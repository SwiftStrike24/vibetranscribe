"use client";

import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';

// Dynamically import the AudioVisualizer component
const AudioVisualizer = dynamic(() => import('./audio-visualizer'), { ssr: false });

interface VisualizerProps {
  isRecording: boolean;
  selectedMicDevice?: string;
}

export default function Visualizer({ isRecording, selectedMicDevice }: VisualizerProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Set isMounted to true once component mounts
  useEffect(() => {
    setIsMounted(true);
    
    // Log that visualizer is ready
    console.log("Visualizer component mounted and ready");
  }, []);

  // Don't render anything on the server side
  if (!isMounted) {
    return null;
  }

  // Always render the AudioVisualizer - it will handle its own visibility logic
  return <AudioVisualizer isRecording={isRecording} selectedMicDevice={selectedMicDevice} />;
} 