interface ElectronAPI {
  onStartRecording: (callback: () => void) => () => void;
  onStopRecording: (callback: () => void) => () => void;
  sendTranscriptionComplete: (text: string) => void;
  hideWindow: () => void;
  showWindow: () => void;
  setWindowSize: (expanded: boolean) => void;
}

interface Window {
  electronAPI: ElectronAPI;
} 