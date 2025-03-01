import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // From main to renderer
  onStartRecording: (callback: () => void) => {
    // Remove any existing listeners first to avoid duplicates
    ipcRenderer.removeAllListeners('start-recording');
    
    // Register the new listener
    ipcRenderer.on('start-recording', () => {
      console.log('Renderer received start-recording event');
      callback();
    });
    
    return () => {
      ipcRenderer.removeAllListeners('start-recording');
    };
  },
  
  onStopRecording: (callback: () => void) => {
    // Remove any existing listeners first to avoid duplicates
    ipcRenderer.removeAllListeners('stop-recording');
    
    // Register the new listener
    ipcRenderer.on('stop-recording', () => {
      console.log('Renderer received stop-recording event');
      callback();
    });
    
    return () => {
      ipcRenderer.removeAllListeners('stop-recording');
    };
  },
  
  // Check if shortcut registration is successful
  checkShortcutRegistration: () => {
    return new Promise((resolve) => {
      // Set up a one-time listener for the response
      ipcRenderer.once('shortcut-registration-result', (_event, success) => {
        resolve(success);
      });
      
      // Send the request to check
      ipcRenderer.send('check-shortcut-registration');
    });
  },
  
  // From renderer to main
  sendTranscriptionComplete: (text: string) => {
    ipcRenderer.send('transcription-complete', text);
  },
  
  hideWindow: () => {
    ipcRenderer.send('hide-window');
  },
  
  // Add show window method
  showWindow: () => {
    ipcRenderer.send('show-window');
  },
  
  // Add window resize method
  setWindowSize: (expanded: boolean) => {
    ipcRenderer.send('set-window-size', expanded);
  },
  
  // Request to re-register shortcuts (can be called if shortcuts stop working)
  refreshShortcuts: () => {
    ipcRenderer.send('refresh-shortcuts');
    return new Promise((resolve) => {
      ipcRenderer.once('shortcuts-refreshed', () => {
        resolve(true);
      });
    });
  }
}); 