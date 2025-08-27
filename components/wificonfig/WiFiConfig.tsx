// mmWaveVitals/components/wificonfig/WiFiConfig.tsx
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/DesignSystem';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';

interface WiFiConfigProps {
  onConfigComplete: () => void;
  user?: any; 
}

const WiFiConfig: React.FC<WiFiConfigProps> = ({ onConfigComplete, user }) => {
  const [wifiSSID, setWifiSSID] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [deviceIP, setDeviceIP] = useState('192.168.4.1');
  const [isConnecting, setIsConnecting] = useState(false);
  const [ssidError, setSsidError] = useState('');
  const [ipError, setIpError] = useState('');

  const validateIP = (ip: string) => {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  const validateForm = () => {
    let isValid = true;
    
    setSsidError('');
    setIpError('');

    if (!wifiSSID.trim()) {
      setSsidError('Network name is required');
      isValid = false;
    }

    if (!deviceIP.trim()) {
      setIpError('Device IP is required');
      isValid = false;
    } else if (!validateIP(deviceIP)) {
      setIpError('Please enter a valid IP address');
      isValid = false;
    }

    return isValid;
  };

  const handleConnect = async () => {
    if (!validateForm()) return;

    setIsConnecting(true);
    try {
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Connection Successful',
        'Device has been configured successfully. You can now proceed to the health monitor.',
        [
          { text: 'Continue', onPress: onConfigComplete }
        ]
      );
    } catch (error) {
      Alert.alert('Connection Failed', 'Unable to connect to the device. Please check your settings and try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Configuration',
      'You can configure the device later from the settings menu.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: onConfigComplete }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialIcons name="settings-remote" size={32} color={Colors.primary[500]} />
            </View>
            <Text style={styles.title}>Device Setup</Text>
            <Text style={styles.subtitle}>
              Connect your mmWave device to start monitoring your health vitals
            </Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* WiFi Configuration Section */}
            <Card style={styles.configCard} padding="none">
              <View style={styles.cardContent}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <MaterialIcons name="wifi" size={20} color={Colors.primary[600]} />
                  </View>
                  <View style={styles.sectionHeaderText}>
                    <Text style={styles.sectionTitle}>Network Configuration</Text>
                    <Text style={styles.sectionSubtitle}>Connect to your WiFi network</Text>
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Input
                    label="Network Name (SSID)"
                    value={wifiSSID}
                    onChangeText={setWifiSSID}
                    placeholder="Enter your WiFi network name"
                    error={ssidError}
                    leftIcon={<MaterialIcons name="wifi" size={18} color={Colors.neutral[500]} />}
                    containerStyle={styles.inputContainer}
                  />

                  <Input
                    label="WiFi Password"
                    value={wifiPassword}
                    onChangeText={setWifiPassword}
                    placeholder="Enter password (leave blank for open networks)"
                    secureTextEntry
                    leftIcon={<MaterialIcons name="lock" size={18} color={Colors.neutral[500]} />}
                    containerStyle={styles.inputContainer}
                    helper="Password is optional for open networks"
                  />
                </View>
              </View>
            </Card>

            {/* Device Settings Section */}
            <Card style={styles.configCard} padding="none">
              <View style={styles.cardContent}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <MaterialIcons name="router" size={20} color={Colors.primary[600]} />
                  </View>
                  <View style={styles.sectionHeaderText}>
                    <Text style={styles.sectionTitle}>Device Settings</Text>
                    <Text style={styles.sectionSubtitle}>Configure device connection</Text>
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Input
                    label="Device IP Address"
                    value={deviceIP}
                    onChangeText={setDeviceIP}
                    placeholder="192.168.4.1"
                    error={ipError}
                    leftIcon={<MaterialIcons name="language" size={18} color={Colors.neutral[500]} />}
                    containerStyle={styles.inputContainer}
                    helper="Default IP address for device configuration"
                  />
                </View>
              </View>
            </Card>

            {/* Connection Status */}
            {isConnecting && (
              <Card style={styles.statusCard} padding="md">
                <View style={styles.statusContent}>
                  <MaterialIcons name="sync" size={24} color={Colors.primary[500]} />
                  <Text style={styles.statusText}>Connecting to device...</Text>
                </View>
              </Card>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <Button
              title={isConnecting ? 'Connecting...' : 'Connect Device'}
              onPress={handleConnect}
              loading={isConnecting}
              disabled={isConnecting}
              style={styles.primaryButton}
            />
            
            <Button
              title="Skip Configuration"
              onPress={handleSkip}
              variant="ghost"
              disabled={isConnecting}
              style={styles.secondaryButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.lg,
  },
  
  // Header Styles
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  
  // Form Container
  formContainer: {
    paddingHorizontal: Spacing.lg,
    flex: 1,
  },
  configCard: {
    marginBottom: Spacing.lg,
  },
  cardContent: {
    padding: Spacing.xl,
  },
  
  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: Spacing.xs / 2,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  
  // Input Groups
  inputGroup: {
    gap: Spacing.md,
  },
  inputContainer: {
    marginBottom: 0,
  },
  
  // Status Card
  statusCard: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary[700],
    fontWeight: '500' as const,
    marginLeft: Spacing.sm,
  },
  
  // Action Section
  actionSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
  },
  secondaryButton: {
    height: 48,
  },
});

export default WiFiConfig;