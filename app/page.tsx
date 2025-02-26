"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from 'next/dynamic';
import { setupKeyboardShortcuts } from "@/utils/keyboardShortcuts";
import ClientOnly from "@/components/ClientOnly";

// Dynamically import components with no SSR
const Recorder = dynamic(() => import('@/components/Recorder'), { ssr: false });
const Transcriber = dynamic(() => import('@/components/Transcriber'), { ssr: false });
const Visualizer = dynamic(() => import('@/components/Visualizer'), { ssr: false });

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  
  // Use a ref for notification timer to avoid memory leaks
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Show a temporary notification
  const showTemporaryNotification = useCallback((message: string) => {
    console.log("Showing notification:", message);
    
    // Clear any existing timer
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }
    
    setNotificationMessage(message);
    setShowNotification(true);
    
    notificationTimerRef.current = setTimeout(() => {
      setShowNotification(false);
      notificationTimerRef.current = null;
    }, 3000);
  }, []);

  // Set isMounted to true once component mounts
  useEffect(() => {
    setIsMounted(true);
    console.log("Component mounted");
    
    // Clean up notification timer on unmount
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  // Define handlers as useCallbacks to avoid recreating them on every render
  const startRecordingHandler = useCallback(() => {
    console.log("Start recording handler called");
    if (!isRecording && !isTranscribing) {
      console.log("Starting recording...");
      setIsRecording(true);
      showTemporaryNotification("Recording started. Press Esc to stop.");
    } else {
      console.log("Cannot start recording: already recording or transcribing");
    }
  }, [isRecording, isTranscribing, showTemporaryNotification]);

  const stopRecordingHandler = useCallback(() => {
    console.log("Stop recording handler called");
    if (isRecording) {
      console.log("Stopping recording...");
      setIsRecording(false);
      showTemporaryNotification("Recording stopped. Transcribing...");
    } else {
      console.log("Cannot stop recording: not currently recording");
    }
  }, [isRecording, showTemporaryNotification]);

  // Setup keyboard shortcuts
  useEffect(() => {
    if (!isMounted) return;

    console.log("Setting up keyboard shortcuts");
    const cleanup = setupKeyboardShortcuts(
      startRecordingHandler,
      stopRecordingHandler
    );

    // Return cleanup function
    return () => {
      console.log("Cleaning up keyboard shortcuts");
      cleanup();
    };
  }, [isMounted, startRecordingHandler, stopRecordingHandler]);

  // Handle recording completion
  const handleRecordingComplete = useCallback((blob: Blob) => {
    console.log("Recording complete, blob size:", blob.size);
    setAudioBlob(blob);
  }, []);

  // Handle transcription start
  const handleTranscriptionStart = useCallback(() => {
    console.log("Transcription started");
    setIsTranscribing(true);
  }, []);

  // Handle transcription completion
  const handleTranscriptionComplete = useCallback((text: string) => {
    console.log("Transcription complete:", text);
    setTranscribedText(text);
    setIsTranscribing(false);
    
    // Copy to clipboard (only in browser)
    if (isMounted && navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          console.log("Text copied to clipboard");
          showTemporaryNotification("Transcription copied to clipboard!");
        })
        .catch((err) => {
          console.error("Could not copy text: ", err);
          showTemporaryNotification("Failed to copy to clipboard.");
        });
    }
  }, [isMounted, showTemporaryNotification]);

  // Add a manual trigger for testing
  const handleManualStartRecording = () => {
    startRecordingHandler();
  };

  const handleManualStopRecording = () => {
    stopRecordingHandler();
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-white text-center mb-8">
          VibeTranscribe
          <span className="text-violet-400 ml-2">🎙️</span>
        </h1>
        
        <div className="text-center mb-8">
          <p className="text-neutral-400 text-sm text-center mt-4">
            Press <kbd className="px-2 py-1 bg-neutral-800 rounded text-xs">Ctrl</kbd> +{" "}
            <kbd className="px-2 py-1 bg-neutral-800 rounded text-xs">Alt</kbd> +{" "}
            <kbd className="px-2 py-1 bg-neutral-800 rounded text-xs">R</kbd> to start recording
          </p>
          <p className="text-neutral-400 text-sm text-center mt-2">
            Press <kbd className="px-2 py-1 bg-neutral-800 rounded text-xs">Esc</kbd> to stop recording
          </p>
          
          {/* Manual buttons for testing */}
          <div className="mt-4 flex justify-center space-x-4">
            <button
              onClick={handleManualStartRecording}
              disabled={isRecording || isTranscribing}
              className={`px-4 py-2 rounded-md ${
                isRecording || isTranscribing
                  ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                  : "bg-violet-600 text-white hover:bg-violet-700"
              }`}
            >
              Start Recording
            </button>
            <button
              onClick={handleManualStopRecording}
              disabled={!isRecording}
              className={`px-4 py-2 rounded-md ${
                !isRecording
                  ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              Stop Recording
            </button>
          </div>
          
          {/* Recording status */}
          {isRecording && (
            <p className="mt-4 text-violet-400 animate-pulse">Recording in progress...</p>
          )}
          {isTranscribing && (
            <p className="mt-4 text-blue-400">Transcribing...</p>
          )}
        </div>
        
        {transcribedText && (
          <div className="w-full p-4 bg-neutral-800 rounded-lg">
            <h2 className="text-xl font-semibold mb-2 text-white">Last Transcription:</h2>
            <p className="text-neutral-200">{transcribedText}</p>
          </div>
        )}
        
        {/* Notification */}
        {showNotification && (
          <div className="fixed top-4 right-4 bg-violet-600 text-white px-4 py-2 rounded-md shadow-lg">
            {notificationMessage}
          </div>
        )}
      </div>
      
      {/* Client-only components */}
      <ClientOnly>
        {/* Recorder component (invisible) */}
        <Recorder 
          onRecordingComplete={handleRecordingComplete}
          isRecording={isRecording}
          setIsRecording={setIsRecording}
        />
        
        {/* Transcriber component */}
        {audioBlob && (
          <Transcriber 
            audioBlob={audioBlob}
            onTranscriptionComplete={handleTranscriptionComplete}
            onTranscriptionStart={handleTranscriptionStart}
          />
        )}
        
        {/* Visualizer component */}
        <Visualizer isRecording={isRecording} />
      </ClientOnly>
    </div>
  );
}

