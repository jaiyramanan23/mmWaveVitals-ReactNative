// mmWaveVitals/components/wificonfig/HealthMonitor.tsx
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/DesignSystem';
import { firebaseService } from '../../services/firebase';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface HealthMonitorProps {
  onLogout: () => void;
  user?: any;
}

interface DeviceInfo {
  device_id: string;
  ip_address: string;
  mac_address: string;
  registered_at: number;
}

interface Vitals {
  breath_rate_bpm: number;
  distance_cm: number;
  heart_rate_bpm: number;
  motion_detected: number;
  presence_detected: number;
  signal_quality: number;
  target_count: number;
  timestamp_ms: number;
}

interface HealthData {
  deviceId: string;
  device_info: DeviceInfo;
  vitals: Vitals;
  timestamp?: number;
}

const HealthMonitor: React.FC<HealthMonitorProps> = ({ onLogout, user }) => {
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [currentVitals, setCurrentVitals] = useState<Vitals | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  // Fetch health data from Firebase
  const fetchHealthData = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      console.log('🔍 Fetching health data from Firebase...');
      const healthDataArray = await firebaseService.database.getHealthData();
      
      if (healthDataArray && healthDataArray.length > 0) {
        setHealthData(healthDataArray);
        
        // Get the latest vitals data
        const latestData = healthDataArray[0]; // Assuming data is sorted by timestamp
        if (latestData && latestData.vitals) {
          setCurrentVitals(latestData.vitals);
          setConnectionStatus('connected');
          setLastUpdate(new Date(latestData.vitals.timestamp_ms).toLocaleTimeString());
          console.log('✅ Health data loaded successfully');
        }
      } else {
        console.log('ℹ️ No health data available');
        setCurrentVitals(null);
        setConnectionStatus('disconnected');
      }
    } catch (error: any) {
      console.error('❌ Error fetching health data:', error);
      Alert.alert(
        'Data Fetch Error',
        'Unable to load health data. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial data fetch
    fetchHealthData();
    
    // Set up real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchHealthData(false); // Don't show loading for background updates
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchHealthData(false);
    setIsRefreshing(false);
  };

  const getVitalStatus = (value: number, type: 'heart' | 'breath' | 'signal') => {
    switch (type) {
      case 'heart':
        if (value < 60) return { status: 'Low', color: Colors.warning[500] };
        if (value > 100) return { status: 'High', color: Colors.error[500] };
        return { status: 'Normal', color: Colors.success[500] };
      case 'breath':
        if (value < 12) return { status: 'Low', color: Colors.warning[500] };
        if (value > 20) return { status: 'High', color: Colors.error[500] };
        return { status: 'Normal', color: Colors.success[500] };
      case 'signal':
        if (value < 50) return { status: 'Poor', color: Colors.error[500] };
        if (value < 80) return { status: 'Fair', color: Colors.warning[500] };
        return { status: 'Excellent', color: Colors.success[500] };
      default:
        return { status: 'Normal', color: Colors.neutral[500] };
    }
  };

  const VitalCard = ({ 
    title, 
    value, 
    unit, 
    icon, 
    type 
  }: {
    title: string;
    value: number;
    unit: string;
    icon: string;
    type: 'heart' | 'breath' | 'signal';
  }) => {
    const vitalStatus = getVitalStatus(value, type);
    
    return (
      <Card style={styles.vitalCard}>
        <View style={styles.vitalHeader}>
          <MaterialIcons name={icon as any} size={24} color={vitalStatus.color} />
          <Text style={styles.vitalTitle}>{title}</Text>
        </View>
        <Text style={[styles.vitalValue, { color: vitalStatus.color }]}>
          {type === 'signal' ? Math.round(value) : value.toFixed(1)}
          <Text style={styles.vitalUnit}> {unit}</Text>
        </Text>
        <Text style={[styles.vitalStatus, { color: vitalStatus.color }]}>
          {vitalStatus.status}
        </Text>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Health Monitor</Text>
            {user && (
              <Text style={styles.userEmail}>{user.email}</Text>
            )}
          </View>
          <Button
            title="Sign Out"
            onPress={onLogout}
            variant="ghost"
            size="sm"
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary[500]]}
          />
        }
      >
        {/* Status */}
        <View style={styles.statusContainer}>
          <View style={styles.statusIndicator}>
            <MaterialIcons 
              name={connectionStatus === 'connected' ? 'wifi' : connectionStatus === 'connecting' ? 'wifi-tethering' : 'wifi-off'} 
              size={16} 
              color={connectionStatus === 'connected' ? Colors.success[500] : connectionStatus === 'connecting' ? Colors.warning[500] : Colors.neutral[500]} 
            />
            <Text style={[styles.statusText, { 
              color: connectionStatus === 'connected' ? Colors.success[500] : connectionStatus === 'connecting' ? Colors.warning[500] : Colors.neutral[500] 
            }]}>
              {connectionStatus === 'connected' ? 'Live Data' : connectionStatus === 'connecting' ? 'Connecting...' : 'No Data'}
            </Text>
          </View>
          <Text style={styles.lastUpdate}>
            {lastUpdate ? `Last updated: ${lastUpdate}` : 'No recent data'}
          </Text>
        </View>

        {/* Vitals */}
        <View style={styles.vitalsGrid}>
          <VitalCard
            title="Heart Rate"
            value={currentVitals?.heart_rate_bpm || 0}
            unit="bpm"
            icon="favorite"
            type="heart"
          />
          <VitalCard
            title="Breathing Rate"
            value={currentVitals?.breath_rate_bpm || 0}
            unit="bpm"
            icon="air"
            type="breath"
          />
          <VitalCard
            title="Signal Quality"
            value={currentVitals?.signal_quality || 0}
            unit="%"
            icon="signal-cellular-alt"
            type="signal"
          />
        </View>

        {/* Presence */}
        <Card style={styles.presenceCard}>
          <View style={styles.presenceHeader}>
            <MaterialIcons 
              name="person" 
              size={24} 
              color={currentVitals?.presence_detected ? Colors.success[500] : Colors.neutral[500]} 
            />
            <Text style={styles.presenceTitle}>Presence Detection</Text>
          </View>
          <View style={styles.presenceContent}>
            <Text style={styles.presenceLabel}>Status: 
              <Text style={[styles.presenceValue, { 
                color: currentVitals?.presence_detected ? Colors.success[500] : Colors.neutral[500] 
              }]}>
                {currentVitals?.presence_detected ? ' Present' : ' Not Present'}
              </Text>
            </Text>
            <Text style={styles.presenceLabel}>Distance: 
              <Text style={styles.presenceValue}>
                {' '}{currentVitals?.distance_cm?.toFixed(0) || 0} cm
              </Text>
            </Text>
          </View>
        </Card>

        {/* Help */}
        <Card style={styles.helpCard}>
          <Text style={styles.helpTitle}>
            {connectionStatus === 'connected' ? '📡 Live Health Monitoring' : 
             connectionStatus === 'connecting' ? '🔄 Connecting to Device' : 
             '📋 Health Monitor'}
          </Text>
          <Text style={styles.helpText}>
            {connectionStatus === 'connected' 
              ? 'Displaying real-time health data from your mmWave device. Pull down to refresh or check the latest readings.'
              : connectionStatus === 'connecting'
              ? 'Attempting to connect to your mmWave device. Please wait...'
              : 'No health data available. Please ensure your mmWave device is connected and transmitting data to Firebase.'
            }
          </Text>
        </Card>

        {/* No Data Message */}
        {!currentVitals && !isLoading && (
          <Card style={styles.noDataCard}>
            <Text style={styles.noDataTitle}>⚠️ No Health Data</Text>
            <Text style={styles.noDataText}>
              No recent health measurements found. Please:
              {'\n'}• Check your mmWave device connection
              {'\n'}• Ensure data is being sent to Firebase
              {'\n'}• Try refreshing the page
              {'\n'}• Contact support if the issue persists
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 0 : Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: Typography.fontSize.xl,
    fontWeight: 'bold' as const,
    color: Colors.text.primary,
  },
  userEmail: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.neutral[500],
    marginLeft: Spacing.xs,
  },
  lastUpdate: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  vitalCard: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.lg,
  },
  vitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  vitalTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  vitalValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: 'bold' as const,
  },
  vitalUnit: {
    fontSize: Typography.fontSize.base,
    fontWeight: 'normal' as const,
    color: Colors.text.secondary,
  },
  vitalStatus: {
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.xs,
  },
  presenceCard: {
    margin: Spacing.lg,
  },
  presenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  presenceTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  presenceContent: {
    gap: Spacing.sm,
  },
  presenceLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  presenceValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  helpCard: {
    margin: Spacing.lg,
  },
  helpTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  helpText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  noDataCard: {
    margin: Spacing.lg,
    backgroundColor: Colors.warning[50],
    borderColor: Colors.warning[500],
    borderWidth: 1,
  },
  noDataTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600' as const,
    color: Colors.warning[600],
    marginBottom: Spacing.sm,
  },
  noDataText: {
    fontSize: Typography.fontSize.base,
    color: Colors.warning[600],
    lineHeight: 22,
  },
});

export default HealthMonitor;
