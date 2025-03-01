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

  // Function to handle keydown events with high priority
  const handleKeyDown = (event: KeyboardEvent) => {
    // Check for Ctrl+Shift+R with case-insensitive 'r' check
    if (event.ctrlKey && event.shiftKey && (event.key === 'r' || event.key === 'R')) {
      console.log('Ctrl+Shift+R pressed!');
      
      // Stop propagation to prevent other handlers from capturing this event
      event.stopPropagation();
      event.stopImmediatePropagation();
      event.preventDefault();
      
      // Delay execution slightly to ensure the event doesn't get captured elsewhere
      setTimeout(() => {
        startRecordingHandler();
      }, 0);
      
      return false;
    }
    
    // Check for Escape
    if (event.key === 'Escape') {
      console.log('Escape pressed!');
      event.preventDefault();
      stopRecordingHandler();
      return false;
    }
  };

  // Add the event listener with capture phase to get it early in the event chain
  window.addEventListener('keydown', handleKeyDown, { capture: true });
  
  // Also register a lower-priority backup handler in case the high-priority one doesn't catch it
  const backupHandler = (event: KeyboardEvent) => {
    // Only handle Ctrl+Shift+R and intentionally let other events pass through
    if (event.ctrlKey && event.shiftKey && (event.key === 'r' || event.key === 'R')) {
      console.log('Ctrl+Shift+R caught by backup handler!');
      event.preventDefault();
      startRecordingHandler();
    }
  };
  
  window.addEventListener('keydown', backupHandler);
  
  isInitialized = true;
  console.log('Keyboard shortcuts set up successfully');

  // Return a cleanup function
  return () => {
    console.log('Cleaning up keyboard shortcuts');
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
    window.removeEventListener('keydown', backupHandler);
    isInitialized = false;
  };
}; 