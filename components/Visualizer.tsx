"use client";

import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';

// Dynamically import the AudioVisualizer component
const AudioVisualizer = dynamic(() => import('./audio-visualizer'), { ssr: false });

interface VisualizerProps {
  isRecording: boolean;
}

export default function Visualizer({ isRecording }: VisualizerProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Set isMounted to true once component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <AudioVisualizer isRecording={isRecording} />;
} 