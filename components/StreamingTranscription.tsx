"use client";

import { useState, useEffect, useRef } from "react";

interface StreamingTranscriptionProps {
  text: string;
  isTranscribing: boolean;
  typingSpeed?: number; // milliseconds per character
  onClose?: () => void; // Add close callback
}

export default function StreamingTranscription({
  text,
  isTranscribing,
  typingSpeed = 15, // default typing speed
  onClose,
}: StreamingTranscriptionProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const textToTypeRef = useRef("");
  const previousTextRef = useRef("");
  const cursorRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Control visibility based on transcription state and content
  useEffect(() => {
    if (isTranscribing || text.length > 0) {
      // Show immediately when transcribing or has content
      setIsVisible(true);
    } else if (!isTranscribing && text.length === 0) {
      // Add a delay before hiding to allow for exit animation
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        
        // Also reset displayed text when hiding
        setDisplayedText("");
        textToTypeRef.current = "";
        previousTextRef.current = "";
        cursorRef.current = 0;
      }, 3000); // Longer delay before hiding to allow user to read completed transcription
      
      return () => clearTimeout(hideTimer);
    }
  }, [isTranscribing, text]);

  // When text changes, update the text to type without showing the full text first
  useEffect(() => {
    if (text !== textToTypeRef.current) {
      // Store the full text to type, but don't display it all at once
      textToTypeRef.current = text;
      
      // Find common prefix with previous text
      const commonPrefix = getCommonPrefix(previousTextRef.current, text);
      previousTextRef.current = text;
      
      // Only update the cursor position, not the displayed text directly
      cursorRef.current = commonPrefix.length;
      
      if (text.length > commonPrefix.length && !isTyping) {
        setIsTyping(true);
      }
    }
  }, [text, isTyping]);

  // Helper function to find common prefix between two strings
  function getCommonPrefix(str1: string, str2: string): string {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++;
    }
    return str1.substring(0, i);
  }

  // Handle typing animation with requestAnimationFrame for smoother animation
  useEffect(() => {
    if (isTyping && textToTypeRef.current) {
      // Clear any existing animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const animateTyping = () => {
        if (cursorRef.current < textToTypeRef.current.length) {
          timerRef.current = setTimeout(() => {
            setDisplayedText(textToTypeRef.current.substring(0, cursorRef.current + 1));
            cursorRef.current += 1;
            animationFrameRef.current = requestAnimationFrame(animateTyping);
          }, typingSpeed);
        } else {
          setIsTyping(false);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animateTyping);
    }

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isTyping, typingSpeed]);

  // Use CSS animations for transitions
  const transitionClasses = `
    w-full p-4 bg-neutral-800/90 backdrop-blur-md rounded-lg shadow-lg border border-violet-500/20
    transform transition-all duration-500 ease-in-out
    ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95 pointer-events-none'}
  `;

  if (!isVisible && !isTranscribing && text.length === 0) {
    return null;
  }

  return (
    <div className={transitionClasses}>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <span className="mr-2">Transcription</span>
          {isTranscribing && (
            <span className="inline-block h-3 w-3 bg-violet-500 rounded-full animate-pulse"></span>
          )}
        </h2>
        {onClose && (
          <button 
            onClick={onClose} 
            className="text-neutral-400 hover:text-white p-1.5 rounded-full hover:bg-neutral-700/50 transition-colors"
            title="Close transcription"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="min-h-[60px] max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-violet-500/30 scrollbar-track-transparent text-neutral-200 pr-1">
        {displayedText}
        {isTyping && (
          <span className="inline-block w-2 h-4 bg-violet-400 ml-1 animate-pulse"></span>
        )}
        {!displayedText && !isTranscribing && (
          <span className="text-neutral-400 italic">Your transcription will appear here...</span>
        )}
      </div>
    </div>
  );
}