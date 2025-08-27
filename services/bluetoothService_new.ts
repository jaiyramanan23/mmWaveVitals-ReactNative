// services/bluetoothService.ts - Clean version with react-native-ble-plx
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device, State, Subscription } from 'react-native-ble-plx';

// BLE Service and Characteristic UUIDs (matching Arduino code)
export const SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';
export const CHAR_HEART_UUID = '12345678-1234-1234-1234-1234567890ac';
export const CHAR_BREATH_UUID = '12345678-1234-1234-1234-1234567890ad';
export const CHAR_DISTANCE_UUID = '12345678-1234-1234-1234-1234567890ae';
export const CHAR_STATUS_UUID = '12345678-1234-1234-1234-1234567890af';

// Types
export type ConnectionStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error';

export interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number;
  isConnectable: boolean;
}

export interface VitalSigns {
  heartRate: number;
  breathRate: number;
  distance: number;
  signalQuality: number;
  presenceDetected: boolean;
  timestamp: number;
}

// BLE Manager Service
class MMWaveBluetoothService {
  private bleManager: BleManager;
  private connectedDevice: Device | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private vitalSignsCallback: ((vitals: VitalSigns) => void) | null = null;
  private statusCallback: ((status: ConnectionStatus) => void) | null = null;
  private heartRateSubscription: Subscription | null = null;
  private breathRateSubscription: Subscription | null = null;
  private distanceSubscription: Subscription | null = null;
  private statusSubscription: Subscription | null = null;
  private currentVitals: Partial<VitalSigns> = {};

  constructor() {
    this.bleManager = new BleManager();
    this.setupBleManager();
  }

  private setupBleManager() {
    // Monitor Bluetooth state changes
    this.bleManager.onStateChange((state) => {
      console.log('📶 Bluetooth state changed:', state);
      if (state === State.PoweredOn) {
        console.log('✅ Bluetooth is ready');
      } else if (state === State.PoweredOff) {
        this.updateConnectionStatus('error');
        Alert.alert(
          'Bluetooth Disabled',
          'Please enable Bluetooth to connect to your mmWave sensor.',
          [{ text: 'OK' }]
        );
      }
    });
  }

  private updateConnectionStatus(status: ConnectionStatus) {
    this.connectionStatus = status;
    this.statusCallback?.(status);
  }

  // Request necessary permissions
  private async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allPermissionsGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allPermissionsGranted) {
          Alert.alert(
            'Permissions Required',
            'Bluetooth and location permissions are required to scan for devices.',
            [{ text: 'OK' }]
          );
          return false;
        }

        return true;
      } catch (error) {
        console.error('❌ Permission request failed:', error);
        return false;
      }
    }
    return true; // iOS permissions are handled automatically
  }

  // Scan for mmWave devices
  public async scanForDevices(): Promise<BluetoothDevice[]> {
    try {
      console.log('🔍 Starting Bluetooth scan...');
      
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Bluetooth permissions not granted');
      }

      const state = await this.bleManager.state();
      if (state !== State.PoweredOn) {
        throw new Error('Bluetooth is not enabled');
      }

      this.updateConnectionStatus('scanning');
      const foundDevices: BluetoothDevice[] = [];

      // Start scanning
      this.bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('❌ Scan error:', error);
          this.updateConnectionStatus('error');
          return;
        }

        if (device && device.name && device.name.includes('MR60BHA2')) {
          if (!foundDevices.find(d => d.id === device.id)) {
            console.log('📱 Found mmWave device:', device.name, device.id);
            foundDevices.push({
              id: device.id,
              name: device.name,
              rssi: device.rssi || -100,
              isConnectable: device.isConnectable || false,
            });
          }
        }
      });

      // Stop scanning after 10 seconds
      setTimeout(() => {
        this.bleManager.stopDeviceScan();
        this.updateConnectionStatus('disconnected');
        console.log(`📋 Scan completed. Found ${foundDevices.length} device(s)`);
      }, 10000);

      // Wait for scan to complete
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      return foundDevices;
    } catch (error) {
      console.error('❌ Scan failed:', error);
      this.updateConnectionStatus('error');
      throw error;
    }
  }

  // Connect to a specific device
  public async connectToDevice(deviceId: string): Promise<boolean> {
    try {
      console.log('🔗 Connecting to device:', deviceId);
      this.updateConnectionStatus('connecting');

      // Connect to device
      const device = await this.bleManager.connectToDevice(deviceId);
      console.log('✅ Connected to device:', device.name);

      // Discover services and characteristics
      await device.discoverAllServicesAndCharacteristics();
      console.log('✅ Services discovered');

      this.connectedDevice = device;
      this.updateConnectionStatus('connected');

      // Set up notifications
      await this.setupNotifications(device);

      return true;
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.updateConnectionStatus('error');
      return false;
    }
  }

  // Set up characteristic notifications
  private async setupNotifications(device: Device) {
    try {
      console.log('📡 Setting up notifications...');

      // Heart rate notifications
      this.heartRateSubscription = device.monitorCharacteristicForService(
        SERVICE_UUID,
        CHAR_HEART_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('❌ Heart rate notification error:', error);
            return;
          }
          if (characteristic?.value) {
            const heartRate = this.parseFloat32(characteristic.value);
            this.updateVitalSigns({ heartRate });
          }
        }
      );

      // Breath rate notifications
      this.breathRateSubscription = device.monitorCharacteristicForService(
        SERVICE_UUID,
        CHAR_BREATH_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('❌ Breath rate notification error:', error);
            return;
          }
          if (characteristic?.value) {
            const breathRate = this.parseFloat32(characteristic.value);
            this.updateVitalSigns({ breathRate });
          }
        }
      );

      // Distance notifications
      this.distanceSubscription = device.monitorCharacteristicForService(
        SERVICE_UUID,
        CHAR_DISTANCE_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('❌ Distance notification error:', error);
            return;
          }
          if (characteristic?.value) {
            const distance = this.parseFloat32(characteristic.value);
            this.updateVitalSigns({ distance });
          }
        }
      );

      // Status notifications
      this.statusSubscription = device.monitorCharacteristicForService(
        SERVICE_UUID,
        CHAR_STATUS_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('❌ Status notification error:', error);
            return;
          }
          if (characteristic?.value) {
            this.parseStatusUpdate(characteristic.value);
          }
        }
      );

      console.log('✅ All notifications set up successfully');
    } catch (error) {
      console.error('❌ Failed to setup notifications:', error);
    }
  }

  // Parse Float32 from base64 encoded data
  private parseFloat32(base64Data: string): number {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const view = new DataView(buffer.buffer);
      return view.getFloat32(0, true); // little-endian
    } catch (error) {
      console.error('❌ Failed to parse float32:', error);
      return 0;
    }
  }

  // Parse status update from base64 encoded data
  private parseStatusUpdate(base64Data: string) {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const view = new DataView(buffer.buffer);
      
      const sensorReady = view.getUint8(0) === 1;
      const dataValid = view.getUint8(1) === 1;
      const signalQuality = view.getUint8(2);
      const uptime = view.getUint32(4, true);
      const updateCount = view.getUint16(8, true);

      console.log('📊 Status update:', { 
        sensorReady, 
        dataValid, 
        signalQuality, 
        uptime, 
        updateCount 
      });

      // Update signal quality in current vitals
      this.updateVitalSigns({ signalQuality });
    } catch (error) {
      console.error('❌ Failed to parse status update:', error);
    }
  }

  // Update vital signs and trigger callback
  private updateVitalSigns(newData: Partial<VitalSigns>) {
    this.currentVitals = { ...this.currentVitals, ...newData };
    
    // Trigger callback even with partial data for real-time updates
    const vitals: VitalSigns = {
      heartRate: this.currentVitals.heartRate || 0,
      breathRate: this.currentVitals.breathRate || 0,
      distance: this.currentVitals.distance || 0,
      signalQuality: this.currentVitals.signalQuality || 0,
      presenceDetected: (this.currentVitals.distance || 0) > 0 && (this.currentVitals.distance || 0) < 300,
      timestamp: Date.now(),
    };

    this.vitalSignsCallback?.(vitals);
  }

  // Disconnect from device
  public async disconnect(): Promise<void> {
    try {
      if (this.connectedDevice) {
        // Stop all notifications
        this.heartRateSubscription?.remove();
        this.breathRateSubscription?.remove();
        this.distanceSubscription?.remove();
        this.statusSubscription?.remove();

        // Reset subscriptions
        this.heartRateSubscription = null;
        this.breathRateSubscription = null;
        this.distanceSubscription = null;
        this.statusSubscription = null;

        // Disconnect device
        await this.connectedDevice.cancelConnection();
        console.log('✅ Disconnected from device');

        this.connectedDevice = null;
        this.currentVitals = {};
        this.updateConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('❌ Disconnect failed:', error);
    }
  }

  // Set callbacks
  public setVitalSignsCallback(callback: (vitals: VitalSigns) => void) {
    this.vitalSignsCallback = callback;
  }

  public setStatusCallback(callback: (status: ConnectionStatus) => void) {
    this.statusCallback = callback;
  }

  // Get current connection status
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  // Get connected device ID
  public getConnectedDeviceId(): string | null {
    return this.connectedDevice?.id || null;
  }

  // Cleanup resources
  public cleanup() {
    this.disconnect();
    this.bleManager.destroy();
  }
}

// Export singleton instance
export const bluetoothService = new MMWaveBluetoothService();
