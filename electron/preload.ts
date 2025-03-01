import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // From main to renderer
  onStartRecording: (callback: () => void) => {
    ipcRenderer.on('start-recording', () => callback());
    return () => {
      ipcRenderer.removeAllListeners('start-recording');
    };
  },
  
  onStopRecording: (callback: () => void) => {
    ipcRenderer.on('stop-recording', () => callback());
    return () => {
      ipcRenderer.removeAllListeners('stop-recording');
    };
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
  }
}); 