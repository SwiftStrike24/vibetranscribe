// utils/audioDevices.ts

export interface AudioDevice {
  deviceId: string;
  label: string;
  isDefault: boolean;
}

/**
 * Get available audio input devices (microphones)
 * @returns Promise resolving to an array of audio input devices
 */
export async function getAudioInputDevices(): Promise<AudioDevice[]> {
  // Check if browser supports the required APIs
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.error("MediaDevices API not available");
    return [];
  }

  try {
    // First, request permission to use microphone (required to get labels)
    // This is a temporary stream that will be stopped immediately
    const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Get all input/output devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    // Stop the temporary stream
    tempStream.getTracks().forEach(track => track.stop());
    
    // Filter for audio input devices and map to our interface
    const audioInputDevices: AudioDevice[] = devices
      .filter(device => device.kind === 'audioinput')
      .map(device => ({
        deviceId: device.deviceId,
        // Use a generic label if the label is empty (happens when permission isn't granted)
        label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`,
        // Device with empty string as deviceId is typically the default device
        isDefault: device.deviceId === 'default' || device.deviceId === ''
      }));
    
    // If there are multiple devices, move the default to the top
    if (audioInputDevices.length > 1) {
      // Sort so default device is first, if both have same isDefault status, maintain original order
      audioInputDevices.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
      });
    }
    
    return audioInputDevices;
  } catch (error) {
    console.error("Error getting audio devices:", error);
    return [];
  }
}

/**
 * Get the label of a device by its ID
 */
export function getDeviceLabel(devices: AudioDevice[], deviceId: string): string {
  const device = devices.find(d => d.deviceId === deviceId);
  return device ? device.label : 'Unknown Microphone';
} 