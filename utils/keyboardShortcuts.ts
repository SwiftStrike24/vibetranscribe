'use client';

type ShortcutHandler = () => void;

// Keep track of whether keyboard shortcuts are set up
let isInitialized = false;

export const setupKeyboardShortcuts = (
  startRecordingHandler: ShortcutHandler,
  stopRecordingHandler: ShortcutHandler
) => {
  // Only run on the client side
  if (typeof window === 'undefined') {
    console.log('Not in browser environment, skipping keyboard setup');
    return () => {}; // Return empty cleanup function for SSR
  }

  // Avoid setting up multiple event listeners
  if (isInitialized) {
    console.log('Keyboard shortcuts already initialized');
    return () => {}; // Return empty cleanup function
  }

  console.log('Setting up keyboard shortcuts with native event listeners');

  // Function to handle keydown events
  const handleKeyDown = (event: KeyboardEvent) => {
    // Check for Ctrl+Alt+R
    if (event.ctrlKey && event.altKey && event.key === 'r') {
      console.log('Ctrl+Alt+R pressed!');
      event.preventDefault();
      startRecordingHandler();
    }
    
    // Check for Escape
    if (event.key === 'Escape') {
      console.log('Escape pressed!');
      event.preventDefault();
      stopRecordingHandler();
    }
  };

  // Add the event listener
  window.addEventListener('keydown', handleKeyDown);
  isInitialized = true;
  console.log('Keyboard shortcuts set up successfully');

  // Return a cleanup function
  return () => {
    console.log('Cleaning up keyboard shortcuts');
    window.removeEventListener('keydown', handleKeyDown);
    isInitialized = false;
  };
}; 