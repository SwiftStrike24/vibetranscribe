'use client';

import { KeyboardEvent } from '@/types/keyboard';

// Import keyboard.js directly
// We're using 'use client' directive to ensure this only runs on the client
import keyboard from 'keyboardjs';

type ShortcutHandler = () => void;

export const setupKeyboardShortcuts = (
  startRecordingHandler: ShortcutHandler,
  stopRecordingHandler: ShortcutHandler
) => {
  // Only run on the client side
  if (typeof window === 'undefined') {
    return () => {}; // Return empty cleanup function for SSR
  }
  
  // Bind Ctrl + Alt + R to toggle recording
  keyboard.bind('ctrl + alt + r', (e: KeyboardEvent) => {
    e.preventDefault();
    startRecordingHandler();
  });

  // Bind Escape to stop recording
  keyboard.bind('escape', (e: KeyboardEvent) => {
    e.preventDefault();
    stopRecordingHandler();
  });

  // Return a cleanup function
  return () => {
    keyboard.unbind('ctrl + alt + r');
    keyboard.unbind('escape');
  };
}; 