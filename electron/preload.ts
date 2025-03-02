import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing all of its capabilities
contextBridge.exposeInMainWorld('electronAPI', {
  // Send methods (from renderer to main)
  sendTranscriptionComplete: (text: string) => {
    ipcRenderer.send('transcription-complete', text);
  },
  setWindowSize: (expanded: boolean) => {
    ipcRenderer.send('set-window-size', expanded);
  },
  showWindow: () => {
    ipcRenderer.send('show-window');
  },
  hideWindow: () => {
    ipcRenderer.send('hide-window');
  },
  checkShortcutRegistration: () => {
    return new Promise((resolve) => {
      ipcRenderer.once('shortcut-registration-result', (_event, isRegistered) => {
        resolve(isRegistered);
      });
      ipcRenderer.send('check-shortcut-registration');
    });
  },
  refreshShortcuts: () => {
    return new Promise((resolve) => {
      ipcRenderer.once('shortcuts-refreshed', () => {
        resolve(true);
      });
      ipcRenderer.send('refresh-shortcuts');
    });
  },
  sendMouseEvent: (type: 'enter' | 'leave') => {
    ipcRenderer.send('mouse-event', type);
  },
  updateInteractiveRegion: (region: { reset?: boolean } | null) => {
    ipcRenderer.send('update-interactive-region', region);
  },

  // Receive methods (from main to renderer)
  onStartRecording: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('start-recording', listener);
    return () => {
      ipcRenderer.removeListener('start-recording', listener);
    };
  },
  onStopRecording: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('stop-recording', listener);
    return () => {
      ipcRenderer.removeListener('stop-recording', listener);
    };
  }
}); 