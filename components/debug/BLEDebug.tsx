// components/debug/BLEDebug.tsx
import React, { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

// Test different import methods for BLE Manager
let BleManager: any = null;
let BleManagerModule: any = null;

try {
  BleManager = require('react-native-ble-manager').default;
  console.log('✅ BLE Manager imported with .default');
} catch (error1) {
  try {
    BleManager = require('react-native-ble-manager');
    console.log('✅ BLE Manager imported without .default');
  } catch (error2) {
    console.log('❌ Failed to import BLE Manager:', error1, error2);
  }
}

try {
  const { NativeModules } = require('react-native');
  BleManagerModule = NativeModules.BleManager;
  console.log('BleManagerModule available:', !!BleManagerModule);
} catch (error) {
  console.log('❌ Failed to get BleManagerModule:', error);
}

const BLEDebug: React.FC = () => {
  const [status, setStatus] = useState<string>('Not tested');
  const [bleState, setBleState] = useState<string>('unknown');

  const testBLEManager = async () => {
    setStatus('Testing...');
    
    if (!BleManager) {
      setStatus('❌ BLE Manager not available');
      Alert.alert('Error', 'BLE Manager is not available. Please check installation.');
      return;
    }

    try {
      console.log('Starting BLE Manager...');
      await BleManager.start({ showAlert: false });
      setStatus('✅ BLE Manager started');
      
      // Check Bluetooth state
      try {
        const state = await BleManager.checkState();
        setBleState(state);
        setStatus(`✅ BLE Manager working. State: ${state}`);
      } catch (stateError) {
        console.log('Error checking state:', stateError);
        setStatus(`✅ BLE Manager started, but state check failed: ${stateError}`);
      }
    } catch (error) {
      console.log('Error starting BLE Manager:', error);
      setStatus(`❌ Error: ${error}`);
      Alert.alert('BLE Error', `Failed to start BLE Manager: ${error}`);
    }
  };

  useEffect(() => {
    // Auto-test on mount
    testBLEManager();
  }, []);

  return (
    <View style={{ padding: 20, backgroundColor: '#f5f5f5', margin: 10, borderRadius: 10 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        BLE Manager Debug
      </Text>
      
      <Text style={{ marginBottom: 5 }}>
        BLE Manager Available: {BleManager ? '✅ Yes' : '❌ No'}
      </Text>
      
      <Text style={{ marginBottom: 5 }}>
        Native Module Available: {BleManagerModule ? '✅ Yes' : '❌ No'}
      </Text>
      
      <Text style={{ marginBottom: 5 }}>
        Status: {status}
      </Text>
      
      <Text style={{ marginBottom: 15 }}>
        Bluetooth State: {bleState}
      </Text>
      
      <TouchableOpacity
        onPress={testBLEManager}
        style={{
          backgroundColor: '#007AFF',
          padding: 10,
          borderRadius: 5,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          Test BLE Manager
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default BLEDebug;
