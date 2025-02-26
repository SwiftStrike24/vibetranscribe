"use client";

import { useState, useEffect, useRef } from "react";

interface StreamingTranscriptionProps {
  text: string;
  isTranscribing: boolean;
  typingSpeed?: number; // milliseconds per character
}

export default function StreamingTranscription({
  text,
  isTranscribing,
  typingSpeed = 15, // default typing speed
}: StreamingTranscriptionProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textToTypeRef = useRef("");
  const previousTextRef = useRef("");
  const cursorRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  return (
    <div className="w-full p-4 bg-neutral-800 rounded-lg shadow-lg border border-violet-500/20">
      <h2 className="text-xl font-semibold mb-2 text-white flex items-center">
        <span className="mr-2">Transcription</span>
        {isTranscribing && (
          <span className="inline-block h-3 w-3 bg-violet-500 rounded-full animate-pulse"></span>
        )}
      </h2>
      <div className="min-h-[100px] text-neutral-200">
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