import { exec } from 'child_process';
import * as os from 'os';
import * as util from 'util';

const execPromise = util.promisify(exec);

// Interface for audio device information
export interface AudioDevice {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

/**
 * Detects audio input devices across different platforms
 */
export class DeviceDetector {
  /**
   * Get the current operating system platform
   */
  public static getPlatform(): string {
    return os.platform();
  }

  /**
   * Get all available audio input devices
   */
  public static async getAudioDevices(): Promise<AudioDevice[]> {
    const platform = this.getPlatform();
    
    switch (platform) {
      case 'win32':
        return this.getWindowsAudioDevices();
      case 'darwin':
        return this.getMacOSAudioDevices();
      case 'linux':
        return this.getLinuxAudioDevices();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Get audio devices on Windows using PowerShell
   */
  private static async getWindowsAudioDevices(): Promise<AudioDevice[]> {
    try {
      // Use PowerShell to get audio input devices
      const { stdout } = await execPromise(
        'powershell -Command "Get-WmiObject Win32_SoundDevice | Select-Object DeviceID, Name, Status | ConvertTo-Json"'
      );

      if (!stdout.trim()) {
        return [];
      }

      // Parse the JSON output
      const devices = JSON.parse(stdout);
      const audioDevices: AudioDevice[] = Array.isArray(devices) 
        ? devices.map((device: any, index: number) => ({
            id: device.DeviceID || `win-device-${index}`,
            name: device.Name || 'Unknown Device',
            description: `Status: ${device.Status || 'Unknown'}`,
            isDefault: index === 0 // Assume first device is default
          }))
        : [{
            id: devices.DeviceID || 'win-device-0',
            name: devices.Name || 'Unknown Device',
            description: `Status: ${devices.Status || 'Unknown'}`,
            isDefault: true
          }];

      return audioDevices;
    } catch (error) {
      console.error('Error detecting Windows audio devices:', error);
      return [];
    }
  }

  /**
   * Get audio devices on macOS using system_profiler
   */
  private static async getMacOSAudioDevices(): Promise<AudioDevice[]> {
    try {
      // Use system_profiler to get audio devices
      const { stdout } = await execPromise(
        'system_profiler SPAudioDataType -json'
      );

      if (!stdout.trim()) {
        return [];
      }

      // Parse the JSON output
      const data = JSON.parse(stdout);
      const audioDevices: AudioDevice[] = [];
      
      if (data && data.SPAudioDataType) {
        data.SPAudioDataType.forEach((item: any, index: number) => {
          if (item['_name'] && item['coreaudio_device_input']) {
            audioDevices.push({
              id: `mac-device-${index}`,
              name: item['_name'],
              description: `Input: ${item['coreaudio_device_input']}`,
              isDefault: index === 0 // Assume first device is default
            });
          }
        });
      }

      return audioDevices;
    } catch (error) {
      console.error('Error detecting macOS audio devices:', error);
      return [];
    }
  }

  /**
   * Get audio devices on Linux using ALSA
   */
  private static async getLinuxAudioDevices(): Promise<AudioDevice[]> {
    try {
      // Try to use arecord to list capture devices
      const { stdout } = await execPromise(
        'arecord -l'
      );

      if (!stdout.trim()) {
        return [];
      }

      // Parse the output
      const lines = stdout.split('\n');
      const audioDevices: AudioDevice[] = [];
      
      let currentId = '';
      let currentName = '';
      
      for (const line of lines) {
        // Look for lines that start with "card"
        const cardMatch = line.match(/card\s+(\d+):\s+(.+?),/i);
        if (cardMatch) {
          currentId = `hw:${cardMatch[1]}`;
          currentName = cardMatch[2].trim();
          
          // Extract device description if available
          const deviceMatch = line.match(/device\s+(\d+):\s+(.+?)(\s+\[|\s*$)/i);
          if (deviceMatch) {
            const deviceId = deviceMatch[1];
            const deviceName = deviceMatch[2].trim();
            
            audioDevices.push({
              id: `${currentId},${deviceId}`,
              name: `${currentName}: ${deviceName}`,
              isDefault: audioDevices.length === 0 // First device is default
            });
          }
        }
      }

      return audioDevices;
    } catch (error) {
      console.error('Error detecting Linux audio devices:', error);
      
      // Fallback to using /proc/asound
      try {
        const { stdout } = await execPromise(
          'ls -1 /proc/asound/card*/id'
        );
        
        const cardPaths = stdout.trim().split('\n');
        const audioDevices: AudioDevice[] = [];
        
        for (let i = 0; i < cardPaths.length; i++) {
          const cardPath = cardPaths[i];
          const cardMatch = cardPath.match(/\/proc\/asound\/card(\d+)\/id/);
          
          if (cardMatch) {
            const cardNum = cardMatch[1];
            
            // Get the card name
            const { stdout: cardName } = await execPromise(
              `cat ${cardPath}`
            );
            
            audioDevices.push({
              id: `hw:${cardNum}`,
              name: cardName.trim() || `Audio Device ${cardNum}`,
              isDefault: i === 0 // First device is default
            });
          }
        }
        
        return audioDevices;
      } catch (fallbackError) {
        console.error('Error with fallback Linux audio detection:', fallbackError);
        return [];
      }
    }
  }
}
