"use client";

import { useState, useEffect } from "react";
import { AudioVisualizerComponent } from "./audio-visualizer";

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

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-96 z-50">
      <AudioVisualizerComponent isRecording={isRecording} />
    </div>
  );
} 