import { StatusBar } from 'expo-status-bar';
import { User } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { firebaseService } from '../services/firebase';

// Import our screens
import ModernAIInterface from '../components/ai/ModernAIInterface';
import ModernLoginScreen from '../components/auth/ModernLoginScreen';
import DeviceSelectionScreen, { DeviceType } from '../components/device/DeviceSelectionScreen';
import FirebaseRealtimeHealthMonitor from '../components/device/FirebaseRealtimeHealthMonitor';
import OnboardingScreen from '../components/onboarding/OnboardingScreen';
import DeviceSetupScreen from '../components/setup/DeviceSetupScreen';
import RStethoscope from '../components/stethoscope/RStethoscope';

interface AppState {
    user: User | null;
    isOnboardingComplete: boolean;
    isDeviceSelectionComplete: boolean;
    selectedDevice: DeviceType | null;
    isDeviceSetupComplete: boolean;
    isBluetoothSetupComplete: boolean;
    isLoading: boolean;
    showStethoscope: boolean;
    showAIInterface: boolean;
    interfaceMode: 'traditional' | 'ai';
}

export default function MainApp() {
  const [appState, setAppState] = useState<AppState>({
    user: null,
    isOnboardingComplete: false,
    isDeviceSelectionComplete: false,
    selectedDevice: null,
    isDeviceSetupComplete: false,
    isBluetoothSetupComplete: false,
    isLoading: true,
    showStethoscope: false,
    showAIInterface: false,
    interfaceMode: 'traditional'
  });

  useEffect(() => {
    // Check if user is already authenticated
    const currentUser = firebaseService.auth.getCurrentUser();
    
    // Subscribe to auth state changes
    const unsubscribe = firebaseService.auth.onAuthStateChanged((user: User | null) => {
      setAppState(prev => ({
        ...prev,
        user,
        isLoading: false 
      }));
    });

    // Initial state
    setAppState(prev => ({
      ...prev,
      user: currentUser,
      isLoading: false
    }));

    return unsubscribe;
  }, []);

  const handleOnboardingComplete = () => {
    setAppState(prev => ({
      ...prev,
      isOnboardingComplete: true
    }));
  };

  const handleLoginSuccess = () => {
    // Firebase auth state will be handled by the auth listener
    // Just trigger any additional logic here if needed
  };

  const handleDeviceSelected = (device: DeviceType) => {
    setAppState(prev => ({
      ...prev,
      selectedDevice: device,
      isDeviceSelectionComplete: true,
      // For mmwave, skip setup flows and go directly to Firebase real-time monitoring
      isDeviceSetupComplete: device === 'mmwave' ? true : prev.isDeviceSetupComplete,
      isBluetoothSetupComplete: device === 'mmwave' ? true : prev.isBluetoothSetupComplete,
      // Set interface mode based on device selection
      interfaceMode: device === 'ai-rstethoscope' ? 'ai' : 'traditional',
      showStethoscope: device === 'rstethoscope',
      showAIInterface: device === 'ai-rstethoscope'
    }));
  };

  const handleDeviceSetupComplete = () => {
    setAppState(prev => ({
      ...prev,
      isDeviceSetupComplete: true
    }));
  };

  const handleBluetoothSetupComplete = () => {
    setAppState(prev => ({
      ...prev,
      isBluetoothSetupComplete: true
    }));
  };

  const handleStethoscopeClose = () => {
    setAppState(prev => ({
      ...prev,
      showStethoscope: false,
      showAIInterface: false,
      selectedDevice: null,  // Reset to go back to device selection
      isDeviceSelectionComplete: false  // Reset device selection state
    }));
  };

  const handleSwitchToAI = () => {
    setAppState(prev => ({
      ...prev,
      interfaceMode: 'ai',
      showStethoscope: false,
      showAIInterface: true
    }));
  };

  const handleAIInterfaceClose = () => {
    setAppState(prev => ({
      ...prev,
      showAIInterface: false,
      selectedDevice: null,  // Reset to go back to device selection
      isDeviceSelectionComplete: false  // Reset device selection state
    }));
  };

  const handleSignOut = () => {
    setAppState(prev => ({
      ...prev,
      user: null,
      isDeviceSelectionComplete: false,
      selectedDevice: null,
      isDeviceSetupComplete: false,
      isBluetoothSetupComplete: false
    }));
  };

  // Loading state
  if (appState.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
        <StatusBar style="light" />
      </View>
    );
  }

  // Onboarding flow
  if (!appState.isOnboardingComplete) {
    return (
      <>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
        <StatusBar style="light" />
      </>
    );
  }

  // Authentication flow
  if (!appState.user) {
    return (
      <>
        <ModernLoginScreen onLoginSuccess={handleLoginSuccess} />
        <StatusBar style="light" />
      </>
    );
  }

  // Device selection flow
  if (!appState.isDeviceSelectionComplete) {
    return (
      <>
        <DeviceSelectionScreen onDeviceSelected={handleDeviceSelected} user={appState.user} />
        <StatusBar style="light" />
      </>
    );
  }

  // Device setup flow (WiFi for mmWave device) - Skip for Firebase implementation
  if (appState.selectedDevice === 'mmwave' && !appState.isDeviceSetupComplete) {
    return (
      <>
        <DeviceSetupScreen onSetupComplete={handleDeviceSetupComplete} />
        <StatusBar style="light" />
      </>
    );
  }

  // Show AI interface for AI R-Stethoscope selection
  if (appState.showAIInterface || appState.selectedDevice === 'ai-rstethoscope') {
    return (
      <>
        <ModernAIInterface 
          user={appState.user} 
          onClose={handleAIInterfaceClose}
          firebaseService={firebaseService}
          loadUserRecordings={() => {/* Add logic to refresh recordings if needed */}}
        />
        <StatusBar style="light" />
      </>
    );
  }

  // Show traditional stethoscope interface 
  if (appState.showStethoscope || appState.selectedDevice === 'rstethoscope') {
    return (
      <>
        <RStethoscope 
          user={appState.user} 
          onClose={handleStethoscopeClose}
          onSwitchToAI={handleSwitchToAI}
        />
        <StatusBar style="light" />
      </>
    );
  }

  // Main app dashboard (for mmWave device with Firebase real-time monitoring)
  if (appState.selectedDevice === 'mmwave') {
    return (
      <>
        <FirebaseRealtimeHealthMonitor 
          onBack={handleStethoscopeClose}
          deviceId="device1"
        />
        <StatusBar style="light" />
      </>
    );
  }

  // Fallback to device selection
  return (
    <>
      <DeviceSelectionScreen onDeviceSelected={handleDeviceSelected} user={appState.user} />
      <StatusBar style="light" />
    </>
  );
}
