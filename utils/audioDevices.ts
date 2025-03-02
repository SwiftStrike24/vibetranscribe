// utils/audioDevices.ts

export interface AudioDevice {
  deviceId: string;
  label: string;
  displayName: string; // User-friendly name for UI display
  isDefault: boolean;
}

/**
 * Extracts a clean, user-friendly display name from a device label
 * @param label Original device label
 * @returns Clean display name
 */
function extractDisplayName(label: string): string {
  // Remove prefix like "Default - " or "Communications - "
  let displayName = label.replace(/^(Default|Communications) - /, '');
  
  // Remove "Microphone" prefix if present
  displayName = displayName.replace(/^Microphone\s+/, '');
  
  // Try to extract the device name from parentheses
  // Example: "Microphone (AVerMedia PW315) (07ca:315a)" -> "AVerMedia PW315"
  const deviceNameMatch = displayName.match(/\(([^)]+)\)/);
  if (deviceNameMatch && !deviceNameMatch[1].match(/^[\da-fA-F]{2,4}:[\da-fA-F]{2,4}$/)) {
    // If what's in parentheses isn't a hardware ID, use it as the display name
    displayName = deviceNameMatch[1];
  } else {
    // Otherwise, remove the hardware ID part if present
    displayName = displayName.replace(/\s*\([\da-fA-F]{2,4}:[\da-fA-F]{2,4}\)$/, '');
    // And remove any remaining parentheses if they're at the end
    displayName = displayName.replace(/\s*\([^)]*\)$/, '');
  }
  
  // Trim any extra whitespace
  return displayName.trim();
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
      .map(device => {
        const label = device.label || `Microphone ${device.deviceId.slice(0, 5)}...`;
        return {
          deviceId: device.deviceId,
          // Use a generic label if the label is empty (happens when permission isn't granted)
          label: label,
          // Create a user-friendly display name
          displayName: extractDisplayName(label),
          // Device with empty string as deviceId is typically the default device
          isDefault: device.deviceId === 'default' || device.deviceId === ''
        };
      });
    
    console.log("All detected microphones:", audioInputDevices.map(d => `${d.displayName} (${d.label})`));
    
    // Filter out duplicate microphones based on hardware ID
    const uniqueDevices = filterDuplicateMicrophones(audioInputDevices);
    
    console.log("Unique microphones after filtering:", uniqueDevices.map(d => `${d.displayName} (${d.label})`));
    
    // If there are multiple devices, move the default to the top
    if (uniqueDevices.length > 1) {
      // Sort so default device is first, if both have same isDefault status, maintain original order
      uniqueDevices.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
      });
    }
    
    return uniqueDevices;
  } catch (error) {
    console.error("Error getting audio devices:", error);
    return [];
  }
}

/**
 * Filter duplicate microphones based on hardware ID
 * @param devices Array of audio devices
 * @returns Array of unique audio devices
 */
function filterDuplicateMicrophones(devices: AudioDevice[]): AudioDevice[] {
  // Keep track of unique hardware IDs
  const hardwareIds = new Set<string>();
  // Keep track of base device names (without prefixes)
  const deviceNames = new Map<string, boolean>();
  const uniqueDevices: AudioDevice[] = [];
  
  // First pass: always include default devices
  const defaultDevices = devices.filter(device => device.isDefault);
  const nonDefaultDevices = devices.filter(device => !device.isDefault);
  
  // Process devices in priority order
  const orderedDevices = [...defaultDevices, ...nonDefaultDevices];
  
  for (const device of orderedDevices) {
    // Try to extract hardware ID from label (typically in format "(XXXX:YYYY)" at the end)
    const hardwareIdMatch = device.label.match(/\(([\da-fA-F]{2,4}:[\da-fA-F]{2,4})\)$/);
    
    if (hardwareIdMatch) {
      const hardwareId = hardwareIdMatch[1];
      
      // If we haven't seen this hardware ID yet, add it and keep the device
      if (!hardwareIds.has(hardwareId)) {
        hardwareIds.add(hardwareId);
        uniqueDevices.push(device);
      } else if (device.isDefault) {
        // For default devices with seen hardware IDs, prefer the one with "Default -" prefix
        const existingDefaultIndex = uniqueDevices.findIndex(d => 
          d.label.includes(hardwareId) && d.isDefault
        );
        
        if (existingDefaultIndex >= 0) {
          if (device.label.startsWith('Default -')) {
            // Replace the existing default with this one
            uniqueDevices[existingDefaultIndex] = device;
          }
        } else {
          uniqueDevices.push(device);
        }
      }
    } else {
      // If no hardware ID match, try to extract the main device name
      // Remove prefixes like "Default - ", "Communications - ", etc.
      let baseName = device.label
        .replace(/^(Default|Communications) - /, '')
        .trim();
      
      // Clean up common patterns in names
      baseName = baseName.replace(/^Microphone\s+/, '');
      
      // If we haven't seen this base name, add it
      if (!deviceNames.has(baseName)) {
        deviceNames.set(baseName, true);
        uniqueDevices.push(device);
      } else if (device.isDefault) {
        // For default devices with seen names, prefer the one with "Default -" prefix
        const existingDefaultIndex = uniqueDevices.findIndex(d => 
          d.label.replace(/^(Default|Communications) - /, '').trim() === baseName && 
          d.isDefault
        );
        
        if (existingDefaultIndex >= 0) {
          if (device.label.startsWith('Default -')) {
            // Replace the existing default with this one
            uniqueDevices[existingDefaultIndex] = device;
          }
        } else {
          uniqueDevices.push(device);
        }
      }
    }
  }
  
  return uniqueDevices;
}

/**
 * Get the label of a device by its ID
 */
export function getDeviceLabel(devices: AudioDevice[], deviceId: string): string {
  const device = devices.find(d => d.deviceId === deviceId);
  return device ? device.label : 'Unknown Microphone';
} 