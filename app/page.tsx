"use client";

import { useState, useEffect } from "react";
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

  // Set isMounted to true once component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Setup keyboard shortcuts
  useEffect(() => {
    if (!isMounted) return;

    const cleanup = setupKeyboardShortcuts(
      // Start recording handler
      () => {
        if (!isRecording && !isTranscribing) {
          setIsRecording(true);
          showTemporaryNotification("Recording started. Press Esc to stop.");
        }
      },
      // Stop recording handler
      () => {
        if (isRecording) {
          setIsRecording(false);
          showTemporaryNotification("Recording stopped. Transcribing...");
        }
      }
    );

    return cleanup;
  }, [isRecording, isTranscribing, isMounted]);

  // Handle recording completion
  const handleRecordingComplete = (blob: Blob) => {
    setAudioBlob(blob);
  };

  // Handle transcription start
  const handleTranscriptionStart = () => {
    setIsTranscribing(true);
  };

  // Handle transcription completion
  const handleTranscriptionComplete = (text: string) => {
    setTranscribedText(text);
    setIsTranscribing(false);
    
    // Copy to clipboard (only in browser)
    if (isMounted && navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          showTemporaryNotification("Transcription copied to clipboard!");
        })
        .catch((err) => {
          console.error("Could not copy text: ", err);
          showTemporaryNotification("Failed to copy to clipboard.");
        });
    }
  };

  // Show a temporary notification
  const showTemporaryNotification = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
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

