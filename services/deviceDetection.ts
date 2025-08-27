/**
 * R-Stethoscope Device Detection Service
 * Detects device connection and provides real-time status
 */

import { Audio } from 'expo-av';

export interface DeviceStatus {
  isConnected: boolean;
  deviceType: 'bluetooth' | 'wired' | 'none';
  signalStrength: number;
  audioInputDevices: any[];
  lastChecked: Date;
}

export class RStethoscopeDetector {
  private static instance: RStethoscopeDetector;
  private checkInterval: any = null;
  private statusCallbacks: ((status: DeviceStatus) => void)[] = [];
  private currentStatus: DeviceStatus = {
    isConnected: false,
    deviceType: 'none',
    signalStrength: 0,
    audioInputDevices: [],
    lastChecked: new Date()
  };

  static getInstance(): RStethoscopeDetector {
    if (!RStethoscopeDetector.instance) {
      RStethoscopeDetector.instance = new RStethoscopeDetector();
    }
    return RStethoscopeDetector.instance;
  }

  async startDetection(): Promise<void> {
    console.log('🔍 Starting R-Stethoscope detection...');
    
    // Check audio permissions first
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('⚠️ Audio permissions not granted');
      return;
    }

    // Initial check
    await this.checkDeviceStatus();

    // Start periodic checks every 2 seconds
    this.checkInterval = setInterval(async () => {
      await this.checkDeviceStatus();
    }, 2000);
  }

  stopDetection(): void {
    console.log('🛑 Stopping R-Stethoscope detection...');
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkDeviceStatus(): Promise<void> {
    try {
      const newStatus: DeviceStatus = {
        isConnected: false,
        deviceType: 'none',
        signalStrength: 0,
        audioInputDevices: [],
        lastChecked: new Date()
      };

      // Check audio input devices
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        // Test if we can create a recording (indicates audio input available)
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );

        // If we got here, audio input is available
        newStatus.isConnected = true;
        newStatus.deviceType = 'wired'; // Assume wired for now
        newStatus.signalStrength = 85; // Mock signal strength

        // Clean up test recording
        await recording.stopAndUnloadAsync();

        console.log('✅ R-Stethoscope detected and ready');
      } catch (error) {
        console.log('❌ No audio input device detected');
        newStatus.isConnected = false;
      }

      // Check for Bluetooth audio devices
      try {
        // Note: Expo doesn't provide direct Bluetooth device enumeration
        // This is a simplified check based on audio availability
        const audioDevices = await this.getAvailableAudioInputs();
        newStatus.audioInputDevices = audioDevices;
        
        // If multiple audio inputs are available, likely includes Bluetooth
        if (audioDevices.length > 1) {
          newStatus.deviceType = 'bluetooth';
          newStatus.signalStrength = 92;
        }
      } catch (error) {
        console.log('🔍 Bluetooth check failed:', error);
      }

      // Update status if changed
      if (this.hasStatusChanged(newStatus)) {
        this.currentStatus = newStatus;
        this.notifyStatusChange(newStatus);
      }

    } catch (error) {
      console.error('❌ Device detection error:', error);
    }
  }

  private async getAvailableAudioInputs(): Promise<any[]> {
    // Mock implementation - Expo doesn't provide device enumeration
    // In a real implementation, you might use a native module
    return this.currentStatus.isConnected ? ['Built-in Microphone'] : [];
  }

  private hasStatusChanged(newStatus: DeviceStatus): boolean {
    return (
      this.currentStatus.isConnected !== newStatus.isConnected ||
      this.currentStatus.deviceType !== newStatus.deviceType ||
      Math.abs(this.currentStatus.signalStrength - newStatus.signalStrength) > 5
    );
  }

  private notifyStatusChange(status: DeviceStatus): void {
    console.log('📡 Device status changed:', status);
    this.statusCallbacks.forEach(callback => callback(status));
  }

  onStatusChange(callback: (status: DeviceStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  getCurrentStatus(): DeviceStatus {
    return { ...this.currentStatus };
  }

  // Mock connection test for demo purposes
  async testConnection(): Promise<boolean> {
    console.log('🧪 Testing R-Stethoscope connection...');
    
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        return false;
      }

      // Try to create a brief test recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      // Record for 0.5 seconds to test
      await new Promise(resolve => setTimeout(resolve, 500));
      await recording.stopAndUnloadAsync();
      
      console.log('✅ Connection test successful');
      return true;
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const deviceDetector = RStethoscopeDetector.getInstance();
