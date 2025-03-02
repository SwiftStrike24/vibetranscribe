interface ElectronAPI {
  onStartRecording: (callback: () => void) => () => void;
  onStopRecording: (callback: () => void) => () => void;
  sendTranscriptionComplete: (text: string) => void;
  hideWindow: () => void;
  showWindow: () => void;
  setWindowSize: (expanded: boolean) => void;
  checkShortcutRegistration: () => Promise<boolean>;
  refreshShortcuts: () => Promise<boolean>;
  sendMouseEvent: (type: 'enter' | 'leave') => void;
  updateInteractiveRegion: (region: { reset?: boolean } | null) => void;
}

interface Window {
  electronAPI: ElectronAPI;
} 