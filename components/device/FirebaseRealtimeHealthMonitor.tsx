// components/device/FirebaseRealtimeHealthMonitor.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Easing,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { firebaseService } from '../../services/firebase';

const { width } = Dimensions.get('window');

interface DeviceVitals {
  heartRate: number;
  breathRate: number;
  distance: number;
  lightLevel: number;
  humanDetected: boolean;
  timestamp: number;
  uptime: number;
  wifiRSSI: number;
}

interface DeviceData {
  [deviceId: string]: DeviceVitals;
}

interface FirebaseRealtimeHealthMonitorProps {
  onBack?: () => void;
  deviceId?: string;
}

const FirebaseRealtimeHealthMonitor: React.FC<FirebaseRealtimeHealthMonitorProps> = ({ 
  onBack, 
  deviceId = 'device1' 
}) => {
  // State management
  const [deviceData, setDeviceData] = useState<DeviceData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [firebaseUnsubscribe, setFirebaseUnsubscribe] = useState<(() => void) | null>(null);

  // Animation refs
  const heartbeatAnim = useRef(new Animated.Value(1)).current;
  const breathingAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;

  // Start Firebase real-time listener
  const startFirebaseListener = async () => {
    try {
      setIsLoading(true);
      setConnectionStatus('connecting');

      console.log('🔄 Starting Firebase listener for device:', deviceId);

      // Check if user is authenticated first
      const currentUser = firebaseService.auth.getCurrentUser();
      if (!currentUser) {
        console.log('❌ User not authenticated');
        setConnectionStatus('disconnected');
        setIsLoading(false);
        Alert.alert('Authentication Required', 'Please log in to access real-time data');
        return;
      }

      console.log('✅ User authenticated:', currentUser.email);

      // Create direct listener for your Firebase structure: devices/device1
      const { ref, onValue, getDatabase } = await import('firebase/database');
      const db = getDatabase();
      const deviceRef = ref(db, `devices/${deviceId}`);
      
      const unsubscribe = onValue(deviceRef, (snapshot) => {
        console.log('📊 Firebase snapshot received for', deviceId, '- exists:', snapshot.exists());
        
        if (snapshot.exists()) {
          const firebaseData = snapshot.val();
          console.log('🔍 Raw Firebase data:', firebaseData);
          
          // Use actual Firebase values without fallbacks that override real data
          const vitalsData: DeviceVitals = {
            heartRate: firebaseData.heartRate !== undefined ? firebaseData.heartRate : 0,
            breathRate: firebaseData.breathRate !== undefined ? firebaseData.breathRate : 0,
            distance: firebaseData.distance !== undefined ? firebaseData.distance : 0,
            lightLevel: firebaseData.lightLevel !== undefined ? firebaseData.lightLevel : 0,
            humanDetected: firebaseData.humanDetected !== undefined ? firebaseData.humanDetected : false,
            timestamp: firebaseData.timestamp !== undefined ? firebaseData.timestamp : Date.now(),
            uptime: firebaseData.uptime !== undefined ? firebaseData.uptime : 0,
            wifiRSSI: firebaseData.wifiRSSI !== undefined ? firebaseData.wifiRSSI : 0,
          };
          
          console.log('✅ Processed vitals data:', vitalsData);
          
          const transformedData: DeviceData = {
            [deviceId]: vitalsData
          };

          setDeviceData(transformedData);
          setLastUpdate(new Date());
          setConnectionStatus('connected');
          setIsLoading(false);
          
        } else {
          console.log('❌ No data available in Firebase for device:', deviceId);
          setConnectionStatus('disconnected');
          setIsLoading(false);
        }
      }, (error: any) => {
        console.error('❌ Firebase listener error:', error);
        
        if (error.code === 'PERMISSION_DENIED') {
          console.log('🔒 Permission denied - checking Firebase rules');
          Alert.alert('Permission Error', 'Firebase database access denied. Please check your authentication and database rules.');
        } else {
          Alert.alert('Connection Error', `Failed to connect: ${error.message}`);
        }
        
        setConnectionStatus('disconnected');
        setIsLoading(false);
      });

      // Store the unsubscribe function
      setFirebaseUnsubscribe(() => unsubscribe);
      
    } catch (error) {
      console.error('❌ Firebase listener error:', error);
      setConnectionStatus('disconnected');
      setIsLoading(false);
      Alert.alert('Connection Error', 'Failed to connect to Firebase real-time database');
    }
  };

  // Animation effects
  const startHeartbeatAnimation = (heartRate: number) => {
    const duration = 60000 / heartRate; // Convert BPM to milliseconds per beat
    
    const heartbeatSequence = Animated.sequence([
      Animated.timing(heartbeatAnim, {
        toValue: 1.2,
        duration: duration * 0.1,
        useNativeDriver: true,
      }),
      Animated.timing(heartbeatAnim, {
        toValue: 1,
        duration: duration * 0.1,
        useNativeDriver: true,
      }),
      Animated.timing(heartbeatAnim, {
        toValue: 1.15,
        duration: duration * 0.1,
        useNativeDriver: true,
      }),
      Animated.timing(heartbeatAnim, {
        toValue: 1,
        duration: duration * 0.7,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(heartbeatSequence).start();
  };

  const startBreathingAnimation = (breathRate: number) => {
    const duration = 60000 / breathRate; // Convert breaths per minute to milliseconds per breath
    
    const breathingSequence = Animated.sequence([
      Animated.timing(breathingAnim, {
        toValue: 1.1,
        duration: duration * 0.4,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(breathingAnim, {
        toValue: 1,
        duration: duration * 0.6,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(breathingSequence).start();
  };

  const startPulseAnimation = () => {
    const pulseSequence = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulseSequence).start();
  };

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate refresh delay
    setIsRefreshing(false);
  };

  // Effects
  useEffect(() => {
    startFirebaseListener();
    startPulseAnimation();

    // Fade in animation
    Animated.timing(fadeInAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    return () => {
      if (firebaseUnsubscribe) {
        firebaseUnsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    const currentVitals = deviceData[deviceId];
    if (currentVitals) {
      startHeartbeatAnimation(currentVitals.heartRate);
      startBreathingAnimation(currentVitals.breathRate);
    }
  }, [deviceData, deviceId]);

  // Get current device vitals
  const currentVitals = deviceData[deviceId];

  // Helper functions
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getHeartRateColor = (heartRate: number) => {
    if (heartRate < 60) return '#3B82F6'; // Blue - Low
    if (heartRate > 100) return '#EF4444'; // Red - High
    return '#10B981'; // Green - Normal
  };

  const getBreathRateColor = (breathRate: number) => {
    if (breathRate < 12) return '#3B82F6'; // Blue - Low
    if (breathRate > 20) return '#EF4444'; // Red - High
    return '#10B981'; // Green - Normal
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#10B981';
      case 'connecting': return '#F59E0B';
      case 'disconnected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const renderVitalCard = (
    icon: keyof typeof MaterialIcons.glyphMap,
    title: string,
    value: string | number,
    unit: string,
    color: string,
    animatedValue?: Animated.Value
  ) => (
    <Animated.View 
      style={[
        styles.vitalCard,
        { transform: animatedValue ? [{ scale: animatedValue }] : [] }
      ]}
    >
      <LinearGradient
        colors={[color + '20', color + '10']}
        style={styles.vitalCardGradient}
      >
        <View style={styles.vitalCardHeader}>
          <MaterialIcons name={icon} size={24} color={color} />
          <Text style={styles.vitalCardTitle}>{title}</Text>
        </View>
        <Text style={[styles.vitalCardValue, { color }]}>{value}</Text>
        <Text style={styles.vitalCardUnit}>{unit}</Text>
      </LinearGradient>
    </Animated.View>
  );

  const renderEnvironmentCard = (
    icon: keyof typeof MaterialIcons.glyphMap,
    title: string,
    value: string | number,
    unit: string,
    color: string
  ) => (
    <View style={styles.environmentCard}>
      <MaterialIcons name={icon} size={20} color={color} />
      <View style={styles.environmentCardContent}>
        <Text style={styles.environmentCardTitle}>{title}</Text>
        <Text style={[styles.environmentCardValue, { color }]}>
          {value} {unit}
        </Text>
      </View>
    </View>
  );

  if (isLoading && !currentVitals) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.loadingContainer}
        >
          <Animated.View style={{ opacity: pulseAnim }}>
            <MaterialIcons name="favorite" size={60} color="#FFFFFF" />
          </Animated.View>
          <Text style={styles.loadingText}>Connecting to mmWave Device...</Text>
          <Text style={styles.loadingSubtext}>Establishing real-time connection</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>mmWave Health Monitor</Text>
          <Text style={styles.headerSubtitle}>Device: {deviceId.toUpperCase()}</Text>
        </View>

        <View style={[styles.connectionIndicator, { backgroundColor: getConnectionStatusColor() }]}>
          <MaterialIcons 
            name={connectionStatus === 'connected' ? 'wifi' : connectionStatus === 'connecting' ? 'wifi-off' : 'wifi-off'} 
            size={16} 
            color="#FFFFFF" 
          />
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={[styles.content, { opacity: fadeInAnim }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#667eea']}
            tintColor="#667eea"
          />
        }
      >
        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusRow}>
            <MaterialIcons 
              name={currentVitals?.humanDetected ? 'person' : 'person-outline'} 
              size={20} 
              color={currentVitals?.humanDetected ? '#10B981' : '#6B7280'} 
            />
            <Text style={[styles.statusText, { color: currentVitals?.humanDetected ? '#10B981' : '#6B7280' }]}>
              {currentVitals?.humanDetected ? 'Human Detected' : 'No Human Detected'}
            </Text>
          </View>
          <Text style={styles.lastUpdateText}>
            Last Update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
          </Text>
        </View>

        {/* Debug Section - Raw Firebase Data */}
        {currentVitals && (
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>🔍 Raw Firebase Values</Text>
            <View style={styles.debugGrid}>
              <Text style={styles.debugText}>Heart Rate: {currentVitals.heartRate}</Text>
              <Text style={styles.debugText}>Breath Rate: {currentVitals.breathRate}</Text>
              <Text style={styles.debugText}>Distance: {currentVitals.distance} cm</Text>
              <Text style={styles.debugText}>Light: {currentVitals.lightLevel} lux</Text>
              <Text style={styles.debugText}>Human: {currentVitals.humanDetected ? 'Yes' : 'No'}</Text>
              <Text style={styles.debugText}>WiFi: {currentVitals.wifiRSSI} dBm</Text>
              <Text style={styles.debugText}>Uptime: {currentVitals.uptime}s</Text>
              <Text style={styles.debugText}>Timestamp: {new Date(currentVitals.timestamp).toLocaleTimeString()}</Text>
            </View>
          </View>
        )}

        {/* Main Vitals */}
        <View style={styles.vitalsGrid}>
          {currentVitals && (
            <>
              {renderVitalCard(
                'favorite',
                'Heart Rate',
                currentVitals.heartRate,
                'BPM',
                getHeartRateColor(currentVitals.heartRate),
                heartbeatAnim
              )}
              
              {renderVitalCard(
                'air',
                'Breathing',
                currentVitals.breathRate,
                'BPM',
                getBreathRateColor(currentVitals.breathRate),
                breathingAnim
              )}
            </>
          )}
        </View>

        {/* Environment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Environmental Data</Text>
          <View style={styles.environmentGrid}>
            {currentVitals && (
              <>
                {renderEnvironmentCard('straighten', 'Distance', currentVitals.distance, 'cm', '#3B82F6')}
                {renderEnvironmentCard('wb-sunny', 'Light Level', currentVitals.lightLevel, 'lux', '#F59E0B')}
                {renderEnvironmentCard('wifi', 'WiFi Signal', currentVitals.wifiRSSI, 'dBm', '#8B5CF6')}
                {renderEnvironmentCard('schedule', 'Uptime', formatUptime(currentVitals.uptime), '', '#06B6D4')}
              </>
            )}
          </View>
        </View>

        {/* Device Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Information</Text>
          <View style={styles.deviceInfo}>
            <View style={styles.deviceInfoRow}>
              <MaterialIcons name="device-hub" size={20} color="#6B7280" />
              <Text style={styles.deviceInfoText}>Device ID: {deviceId}</Text>
            </View>
            <View style={styles.deviceInfoRow}>
              <MaterialIcons name="access-time" size={20} color="#6B7280" />
              <Text style={styles.deviceInfoText}>
                Timestamp: {currentVitals ? new Date(currentVitals.timestamp).toLocaleString() : 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 44,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  content: {
    flex: 1,
  },
  statusBanner: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  lastUpdateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  vitalsGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  vitalCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  vitalCardGradient: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  vitalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vitalCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  vitalCardValue: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  vitalCardUnit: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  environmentGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  environmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  environmentCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  environmentCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  environmentCardValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  deviceInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  deviceInfoText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
  },
  debugSection: {
    backgroundColor: '#F3F4F6',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  debugGrid: {
    gap: 8,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#6B7280',
    paddingVertical: 2,
  },
});

export default FirebaseRealtimeHealthMonitor;
