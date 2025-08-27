/**
 * Device Setup API Service
 * Handles mmWave device configuration and connection via backend APIs
 */

export interface DeviceConnectionResult {
  success: boolean;
  message: string;
  device?: {
    ip: string;
    signalStrength: number;
    firmware: string;
    deviceId: string;
    status: 'connected' | 'disconnected' | 'error';
  };
}

export interface WiFiNetworkInfo {
  ssid: string;
  password?: string;
  security: 'open' | 'wep' | 'wpa' | 'wpa2';
}

export interface DeviceConfigResponse {
  success: boolean;
  message: string;
  deviceInfo?: {
    ip: string;
    macAddress: string;
    signalQuality: number;
    firmwareVersion: string;
    lastSeen: string;
  };
}

export interface DeviceStatus {
  isOnline: boolean;
  signalStrength: number;
  batteryLevel?: number;
  temperature?: number;
  firmware: string;
  lastUpdate: string;
}

class DeviceSetupService {
  private static instance: DeviceSetupService;
  private baseUrl: string;

  private constructor() {
    // Use the same backend URL as other services
    this.baseUrl = 'http://192.168.1.2:8001';
  }

  static getInstance(): DeviceSetupService {
    if (!DeviceSetupService.instance) {
      DeviceSetupService.instance = new DeviceSetupService();
    }
    return DeviceSetupService.instance;
  }

  /**
   * Helper function to make fetch requests with timeout
   */
  private async fetchWithTimeout(
    url: string, 
    options: RequestInit & { timeout?: number } = {}
  ): Promise<Response> {
    const { timeout = 8000, ...fetchOptions } = options;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Check if the device API is available
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('⚠️ Device API not available:', error);
      return false;
    }
  }

  /**
   * Scan for available WiFi networks on the device
   */
  async scanWiFiNetworks(deviceIP: string): Promise<WiFiNetworkInfo[]> {
    try {
      const response = await fetch(`http://${deviceIP}/api/wifi/scan`, {
        method: 'GET',
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error('Failed to scan WiFi networks');
      }

      const data = await response.json();
      return data.networks || [];
    } catch (error) {
      console.error('❌ WiFi scan failed:', error);
      throw error;
    }
  }

  /**
   * Connect device to WiFi network
   */
  async connectToWiFi(
    deviceIP: string,
    networkInfo: WiFiNetworkInfo
  ): Promise<DeviceConnectionResult> {
    try {
      const response = await fetch(`http://${deviceIP}/api/wifi/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ssid: networkInfo.ssid,
          password: networkInfo.password || '',
          security: networkInfo.security,
        }),
        timeout: 15000,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'WiFi connection failed');
      }

      return {
        success: true,
        message: 'Device connected to WiFi successfully',
        device: data.device,
      };
    } catch (error) {
      console.error('❌ WiFi connection failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'WiFi connection failed',
      };
    }
  }

  /**
   * Test device connection and get status
   */
  async testDeviceConnection(deviceIP: string): Promise<DeviceConnectionResult> {
    try {
      console.log('🔍 Testing device connection to:', deviceIP);

      const response = await fetch(`http://${deviceIP}/api/status`, {
        method: 'GET',
        timeout: 8000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        message: 'Device connected successfully',
        device: {
          ip: deviceIP,
          signalStrength: data.signalStrength || 85,
          firmware: data.firmware || 'v1.2.3',
          deviceId: data.deviceId || `mmwave_${Date.now()}`,
          status: 'connected',
        },
      };
    } catch (error) {
      console.error('❌ Device connection test failed:', error);
      
      // Return specific error messages based on error type
      let message = 'Unable to connect to device';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          message = 'Connection timeout - device may not be reachable';
        } else if (error.message.includes('network')) {
          message = 'Network error - check your connection';
        } else {
          message = error.message;
        }
      }

      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Configure device settings
   */
  async configureDevice(
    deviceIP: string,
    config: {
      deviceName?: string;
      updateInterval?: number;
      enableHealthTracking?: boolean;
    }
  ): Promise<DeviceConfigResponse> {
    try {
      const response = await fetch(`http://${deviceIP}/api/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
        timeout: 10000,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Device configuration failed');
      }

      return {
        success: true,
        message: 'Device configured successfully',
        deviceInfo: data.deviceInfo,
      };
    } catch (error) {
      console.error('❌ Device configuration failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Configuration failed',
      };
    }
  }

  /**
   * Get device status and health
   */
  async getDeviceStatus(deviceIP: string): Promise<DeviceStatus | null> {
    try {
      const response = await fetch(`http://${deviceIP}/api/status/detailed`, {
        method: 'GET',
        timeout: 5000,
      });

      if (!response.ok) {
        throw new Error('Failed to get device status');
      }

      const data = await response.json();
      return {
        isOnline: true,
        signalStrength: data.signalStrength || 0,
        batteryLevel: data.batteryLevel,
        temperature: data.temperature,
        firmware: data.firmware || 'Unknown',
        lastUpdate: data.lastUpdate || new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Failed to get device status:', error);
      return null;
    }
  }

  /**
   * Reset device to factory settings
   */
  async resetDevice(deviceIP: string): Promise<DeviceConnectionResult> {
    try {
      const response = await fetch(`http://${deviceIP}/api/reset`, {
        method: 'POST',
        timeout: 10000,
      });

      const data = await response.json();

      return {
        success: response.ok,
        message: data.message || (response.ok ? 'Device reset successfully' : 'Reset failed'),
      };
    } catch (error) {
      console.error('❌ Device reset failed:', error);
      return {
        success: false,
        message: 'Failed to reset device',
      };
    }
  }

  /**
   * Update device firmware
   */
  async updateFirmware(deviceIP: string): Promise<DeviceConnectionResult> {
    try {
      const response = await fetch(`http://${deviceIP}/api/firmware/update`, {
        method: 'POST',
        timeout: 30000, // Firmware updates take longer
      });

      const data = await response.json();

      return {
        success: response.ok,
        message: data.message || (response.ok ? 'Firmware update initiated' : 'Update failed'),
      };
    } catch (error) {
      console.error('❌ Firmware update failed:', error);
      return {
        success: false,
        message: 'Failed to update firmware',
      };
    }
  }

  /**
   * Register device with backend for cloud monitoring
   */
  async registerWithBackend(deviceInfo: {
    deviceId: string;
    ip: string;
    name: string;
    userId: string;
  }): Promise<DeviceConnectionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/devices/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deviceInfo),
        timeout: 10000,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Device registration failed');
      }

      return {
        success: true,
        message: 'Device registered with backend successfully',
        device: data.device,
      };
    } catch (error) {
      console.error('❌ Backend registration failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Simulate device connection for testing/demo purposes
   */
  async simulateConnection(deviceIP: string): Promise<DeviceConnectionResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

    // Simulate success/failure (90% success rate)
    const success = Math.random() > 0.1;

    if (success) {
      return {
        success: true,
        message: 'Device connected successfully',
        device: {
          ip: deviceIP,
          signalStrength: Math.floor(70 + Math.random() * 30), // 70-100%
          firmware: 'v1.2.3',
          deviceId: `mmwave_${Date.now()}`,
          status: 'connected',
        },
      };
    } else {
      return {
        success: false,
        message: 'Connection failed - device not responding',
      };
    }
  }
}

export default DeviceSetupService.getInstance();
