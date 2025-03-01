"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from 'next/dynamic';
import { setupKeyboardShortcuts } from "@/utils/keyboardShortcuts";
import ClientOnly from "@/components/ClientOnly";
import "./electron.css"; // Import the electron-specific CSS

// Force dynamic rendering
export const dynamicConfig = 'force-dynamic';

// Dynamically import components with no SSR
const Recorder = dynamic(() => import('@/components/Recorder'), { ssr: false });
const Transcriber = dynamic(() => import('@/components/Transcriber'), { ssr: false });
const Visualizer = dynamic(() => import('@/components/Visualizer'), { ssr: false });
const StreamingTranscription = dynamic(() => import('@/components/StreamingTranscription'), { ssr: false });

// Check if we're in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [progressText, setProgressText] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isElectronMode, setIsElectronMode] = useState(false);
  const [isTranscriptionClosed, setIsTranscriptionClosed] = useState(false);
  
  // Debounce timer ref for window resizing
  const resizeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastResizeStateRef = useRef<boolean | null>(null);

  // Ref for debouncing transcription progress updates
  const progressUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressTextRef = useRef<string>("");

  // Startup protection flag
  const startupCompleteRef = useRef<boolean>(false);

  // Set isMounted to true once component mounts and check if we're in Electron
  useEffect(() => {
    setIsMounted(true);
    setIsElectronMode(isElectron());
    console.log("Component mounted, Electron mode:", isElectron());
    
    // Add electron class to body if in Electron mode
    if (isElectron()) {
      document.body.classList.add('electron');
    }
    
    // After a short delay, consider startup complete
    const startupTimer = setTimeout(() => {
      console.log("Startup phase complete, enabling resize operations");
      startupCompleteRef.current = true;
    }, 2000);
    
    return () => {
      clearTimeout(startupTimer);
      // Remove electron class when component unmounts
      document.body.classList.remove('electron');
    };
  }, []);

  // Define handlers as useCallbacks to avoid recreating them on every render
  const startRecordingHandler = useCallback(() => {
    console.log("Start recording handler called");
    if (!isRecording && !isTranscribing) {
      console.log("Starting recording...");
      setIsRecording(true);
      
      // Reset progress text and hide transcription box when starting a new recording
      setProgressText("");
      
      // Reset the closed state when starting a new recording
      setIsTranscriptionClosed(false);
    } else {
      console.log("Cannot start recording: already recording or transcribing");
    }
  }, [isRecording, isTranscribing]);

  const stopRecordingHandler = useCallback(() => {
    console.log("Stop recording handler called");
    if (isRecording) {
      console.log("Stopping recording...");
      setIsRecording(false);
    } else {
      console.log("Cannot stop recording: not currently recording");
    }
  }, [isRecording]);

  // Handler for manually closing the transcription box
  const handleCloseTranscription = useCallback(() => {
    console.log("Closing transcription box");
    setIsTranscriptionClosed(true);
    
    // Also reset text state to ensure clean state for next recording
    setProgressText("");
    
    // In Electron mode, shrink window back to minimal size
    if (isElectronMode && window.electronAPI) {
      window.electronAPI.setWindowSize(false);
    }
  }, [isElectronMode]);

  // Effect to track when there's been no transcription activity for a while
  const [shouldRenderTranscription, setShouldRenderTranscription] = useState(false);
  
  useEffect(() => {
    // If transcribing, we should render and the box isn't manually closed
    if (isTranscribing && !isTranscriptionClosed) {
      setShouldRenderTranscription(true);
      return;
    }
    
    // If there's text and the box isn't manually closed, we should render
    if (progressText && !isTranscriptionClosed) {
      setShouldRenderTranscription(true);
      return;
    }
    
    // If recording, we shouldn't show the transcription box (hide previous content)
    if (isRecording) {
      setShouldRenderTranscription(false);
      return;
    }
    
    // If manually closed or no content, schedule removal after animations
    const cleanupTimer = setTimeout(() => {
      setShouldRenderTranscription(false);
    }, 500); // Shorter time for hiding when manually closed or no content
    
    return () => clearTimeout(cleanupTimer);
  }, [isTranscribing, progressText, isTranscriptionClosed, isRecording]);

  // Effect to handle window resizing for transcription box in Electron mode
  useEffect(() => {
    if (!isMounted || !isElectronMode || !window.electronAPI) return;
    
    // Skip all resize operations during startup phase
    if (!startupCompleteRef.current) {
      console.log("Skipping resize during startup - app not fully initialized");
      return;
    }
    
    // Determine if we need expanded mode
    const shouldBeExpanded = (isTranscribing || !!progressText) && !isTranscriptionClosed;
    
    // Skip if same as last state
    if (lastResizeStateRef.current === shouldBeExpanded) {
      return;
    }
    
    // Clear any pending resize timer
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = null;
    }
    
    // Set a debounced timer to actually perform the resize
    resizeTimerRef.current = setTimeout(() => {
      // Only resize if we're past the startup phase
      if (!startupCompleteRef.current) {
        console.log("Resize operation cancelled - still in startup phase");
        resizeTimerRef.current = null;
        return;
      }
      
      // Only resize if the state is still the same after debounce
      if (shouldBeExpanded) {
        console.log("Expanding window for transcription (debounced)");
        window.electronAPI.setWindowSize(true); // Expanded mode
      } else {
        console.log("Collapsing window after transcription (debounced)");
        window.electronAPI.setWindowSize(false); // Collapsed mode
      }
      
      // Update last state
      lastResizeStateRef.current = shouldBeExpanded;
      resizeTimerRef.current = null;
    }, 300); // Shorter debounce time
    
    // Cleanup
    return () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, [isElectronMode, isTranscribing, progressText, isMounted, isTranscriptionClosed]);

  // Effect to ensure window stays visible in Electron mode - but with a delay to prevent flicker
  useEffect(() => {
    if (!isMounted || !isElectronMode || !window.electronAPI) return;
    
    console.log("App component mounted in Electron mode");
    
    // Don't call showWindow immediately - this might trigger unwanted visibility
    // Let the main process handle the initial visibility
    
    return () => {
      // No cleanup needed
    };
  }, [isMounted, isElectronMode]);

  // Setup keyboard shortcuts (browser mode)
  useEffect(() => {
    if (!isMounted || isElectronMode) return;

    console.log("Setting up browser keyboard shortcuts");
    const cleanup = setupKeyboardShortcuts(
      startRecordingHandler,
      stopRecordingHandler
    );

    // Return cleanup function
    return () => {
      console.log("Cleaning up browser keyboard shortcuts");
      cleanup();
    };
  }, [isMounted, isElectronMode, startRecordingHandler, stopRecordingHandler]);

  // Setup Electron IPC listeners
  useEffect(() => {
    if (!isMounted || !isElectronMode) return;
    
    console.log("Setting up Electron IPC listeners");
    
    // Set up event listeners for Electron IPC
    const removeStartListener = window.electronAPI.onStartRecording(() => {
      console.log("Start recording message received from main process");
      startRecordingHandler();
    });
    
    const removeStopListener = window.electronAPI.onStopRecording(() => {
      console.log("Stop recording message received from main process");
      stopRecordingHandler();
    });
    
    // Clean up Electron IPC listeners
    return () => {
      console.log("Cleaning up Electron IPC listeners");
      removeStartListener();
      removeStopListener();
    };
  }, [isMounted, isElectronMode, startRecordingHandler, stopRecordingHandler]);

  // Handle recording completion
  const handleRecordingComplete = useCallback((blob: Blob) => {
    console.log("Recording complete, blob size:", blob.size);
    setAudioBlob(blob);
  }, []);

  // Handle transcription start
  const handleTranscriptionStart = useCallback(() => {
    console.log("Transcription started");
    setIsTranscribing(true);
    setProgressText("");
    setIsTranscriptionClosed(false); // Ensure transcription is not considered closed when a new one starts
  }, []);

  // Handle transcription progress with debouncing
  const handleTranscriptionProgress = useCallback((text: string) => {
    // Skip if text hasn't changed significantly
    if (text === lastProgressTextRef.current || 
        (text.length > 0 && lastProgressTextRef.current.length > 0 && 
         text.length - lastProgressTextRef.current.length < 5)) {
      return;
    }
    
    // Update the reference immediately to prevent multiple similar updates
    lastProgressTextRef.current = text;
    
    // Clear any existing timer
    if (progressUpdateTimerRef.current) {
      clearTimeout(progressUpdateTimerRef.current);
    }
    
    // Set a debounced timer to update the UI
    progressUpdateTimerRef.current = setTimeout(() => {
      console.log("Transcription progress (debounced):", text.substring(0, 20) + "...");
      setProgressText(text);
      progressUpdateTimerRef.current = null;
    }, 200);
  }, []);

  // Handle transcription completion
  const handleTranscriptionComplete = useCallback((text: string) => {
    console.log("Transcription complete:", text);
    setProgressText(text);
    setIsTranscribing(false);
    
    // In Electron mode, send to main process
    if (isElectronMode) {
      window.electronAPI.sendTranscriptionComplete(text);
    } 
    // In browser mode, use the browser's clipboard API
    else if (isMounted && navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          console.log("Text copied to clipboard");
        })
        .catch((err) => {
          console.error("Could not copy text: ", err);
        });
    }
  }, [isMounted, isElectronMode]);

  // Add a manual trigger for testing (mostly for browser mode)
  const handleManualStartRecording = () => {
    startRecordingHandler();
  };

  const handleManualStopRecording = () => {
    stopRecordingHandler();
  };

  // Cleanup the timers when component unmounts
  useEffect(() => {
    return () => {
      if (progressUpdateTimerRef.current) {
        clearTimeout(progressUpdateTimerRef.current);
      }
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
    };
  }, []);

  // In Electron mode, we only show the minimal UI
  if (isElectronMode) {
    return (
      <div className="electron-mode h-full">
        {/* Streaming Transcription Component - conditionally rendered */}
        {shouldRenderTranscription && (
          <div 
            className={`fixed bottom-16 left-0 right-0 px-4 mb-2 transform transition-all duration-500 z-10
              ${(isTranscribing || progressText) && !isTranscriptionClosed 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-8 pointer-events-none'}`}
          >
            <div className="max-w-xl mx-auto transcription-container">
              <ClientOnly>
                <StreamingTranscription 
                  text={progressText} 
                  isTranscribing={isTranscribing} 
                  typingSpeed={10}
                  onClose={handleCloseTranscription}
                />
              </ClientOnly>
            </div>
          </div>
        )}
        
        {/* Status indicator - centered at the bottom */}
        <div className="fixed bottom-0 left-0 right-0 flex justify-center items-center pb-2 z-20">
          <div className="transform transition-all duration-300 ease-in-out rounded-full bg-neutral-800/80 backdrop-blur-md px-4 py-2.5 flex items-center space-x-2.5 shadow-lg border border-violet-500/20 hover:bg-neutral-800/90 hover:border-violet-500/30">
            {isRecording ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <p className="text-red-400 text-sm font-medium whitespace-nowrap">Recording</p>
                {/* Stop recording button */}
                <button 
                  onClick={stopRecordingHandler}
                  className="ml-2 p-1.5 bg-red-500/20 hover:bg-red-500/30 hover:scale-105 rounded-full transition-all duration-300 group"
                  title="Stop recording"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400 group-hover:text-red-300 transform transition-transform group-hover:rotate-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              </>
            ) : isTranscribing ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                <p className="text-blue-400 text-sm font-medium whitespace-nowrap">Transcribing</p>
              </>
            ) : (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-50"></span>
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75 delay-150"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500 shadow-sm shadow-violet-500/50"></span>
                </span>
                <p className="text-violet-400 text-sm font-medium whitespace-nowrap status-ready">VibeTranscribe Ready • Press Ctrl+Alt+R</p>
                {/* Start recording button */}
                <button 
                  onClick={startRecordingHandler}
                  disabled={isTranscribing}
                  className={`ml-2 p-1.5 ${isTranscribing ? 'bg-violet-500/10 cursor-not-allowed' : 'bg-violet-500/20 hover:bg-violet-500/30 hover:scale-105'} rounded-full transition-all duration-300 group`}
                  title="Start recording"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isTranscribing ? 'text-violet-400/50' : 'text-violet-400 group-hover:text-violet-300'} transform transition-transform group-hover:rotate-3 mic-subtle-animation`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="8" y1="22" x2="16" y2="22" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Client-only components for functionality - but no visible UI */}
        <ClientOnly>
          <Recorder 
            onRecordingComplete={handleRecordingComplete}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
          />
          
          {audioBlob && (
            <Transcriber 
              audioBlob={audioBlob}
              onTranscriptionComplete={handleTranscriptionComplete}
              onTranscriptionStart={handleTranscriptionStart}
              onTranscriptionProgress={handleTranscriptionProgress}
            />
          )}
          
          <Visualizer isRecording={isRecording} />
        </ClientOnly>
      </div>
    );
  }

  // Default UI for browser mode
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
          {isTranscribing && !isRecording && (
            <p className="mt-4 text-blue-400">Transcribing...</p>
          )}
        </div>
        
        {/* Streaming Transcription Component */}
        <ClientOnly>
          <StreamingTranscription 
            text={progressText} 
            isTranscribing={isTranscribing} 
            typingSpeed={10}
            onClose={handleCloseTranscription}
          />
        </ClientOnly>
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
            onTranscriptionProgress={handleTranscriptionProgress}
          />
        )}
        
        {/* Visualizer component */}
        <Visualizer isRecording={isRecording} />
      </ClientOnly>
    </div>
  );
}

