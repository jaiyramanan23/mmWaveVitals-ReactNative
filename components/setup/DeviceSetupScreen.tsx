// mmWaveVitals/components/setup/DeviceSetupScreen.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Linking,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/DesignSystem';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';

const { width, height } = Dimensions.get('window');

interface DeviceSetupScreenProps {
    onSetupComplete: () => void;
    user?: any;
}

const DeviceSetupScreen: React.FC<DeviceSetupScreenProps> = ({ onSetupComplete, user }) => {
    const [currentStep, setCurrentStep] = useState<'wifi' | 'device' | 'complete'>('wifi');
    const [isWifiConnected, setIsWifiConnected] = useState(false);
    const [deviceIP, setDeviceIP] = useState('192.168.4.1');
    const [isConnecting, setIsConnecting] = useState(false);
    const [deviceFound, setDeviceFound] = useState(false);
    const [ipError, setIpError] = useState('');
    
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();

        // Start pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const openWifiSettings = () => {
        if (Platform.OS === 'ios') {
            Linking.openURL('App-Prefs:WIFI');
        } else {
            // Android
            Linking.sendIntent('android.settings.WIFI_SETTINGS');
        }
    };

    const handleWifiConnect = () => {
        Alert.alert(
            'Connect to Device Network',
            'Please connect to the "MMWave_Vitals_AP" network in your WiFi settings, then come back to continue.',
            [
                { text: 'Open WiFi Settings', onPress: openWifiSettings },
                { text: 'Already Connected', onPress: () => {
                    setIsWifiConnected(true);
                    setCurrentStep('device');
                }},
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const validateIP = (ip: string) => {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(ip);
    };

    const handleDeviceConnect = async () => {
        setIpError('');
        
        if (!validateIP(deviceIP)) {
            setIpError('Please enter a valid IP address');
            return;
        }

        setIsConnecting(true);
        
        try {
            // Simulate device connection
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            setDeviceFound(true);
            setCurrentStep('complete');
            
            setTimeout(() => {
                onSetupComplete();
            }, 2000);
        } catch (error) {
            Alert.alert('Connection Failed', 'Unable to connect to the device. Please check your settings and try again.');
        } finally {
            setIsConnecting(false);
        }
    };

    const handleSkip = () => {
        Alert.alert(
            'Skip Device Setup',
            'You can set up your device later from the settings menu.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Skip', onPress: onSetupComplete }
            ]
        );
    };

    const renderWifiStep = () => (
        <Animated.View
            style={[
                styles.stepContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.deviceImageContainer}>
                <Animated.View
                    style={[
                        styles.deviceImage,
                        { transform: [{ scale: pulseAnim }] }
                    ]}
                >
                    <LinearGradient
                        colors={[Colors.primary[500], Colors.primary[700]]}
                        style={styles.deviceGradient}
                    >
                        <MaterialIcons name="router" size={64} color={Colors.background.primary} />
                    </LinearGradient>
                </Animated.View>
                <View style={styles.wifiRings}>
                    <View style={[styles.wifiRing, styles.wifiRing1]} />
                    <View style={[styles.wifiRing, styles.wifiRing2]} />
                    <View style={[styles.wifiRing, styles.wifiRing3]} />
                </View>
            </View>

            <Card style={styles.instructionCard}>
                <View style={styles.stepHeader}>
                    <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <Text style={styles.stepTitle}>Connect to Device Network</Text>
                </View>
                
                <Text style={styles.instructionText}>
                    To set up your mmWave device, you need to connect to its WiFi network first.
                </Text>
                
                <View style={styles.wifiInfo}>
                    <View style={styles.wifiItem}>
                        <MaterialIcons name="wifi" size={20} color={Colors.primary[500]} />
                        <Text style={styles.wifiName}>MMWave_Vitals_AP</Text>
                    </View>
                    <View style={styles.wifiItem}>
                        <MaterialIcons name="lock-open" size={20} color={Colors.success[500]} />
                        <Text style={styles.wifiPassword}>No password required</Text>
                    </View>
                </View>

                <Button
                    title="Connect to Device WiFi"
                    onPress={handleWifiConnect}
                    icon={<MaterialIcons name="wifi" size={20} color={Colors.background.primary} />}
                    fullWidth
                    style={styles.primaryButton}
                />
            </Card>
        </Animated.View>
    );

    const renderDeviceStep = () => (
        <Animated.View
            style={[
                styles.stepContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.deviceImageContainer}>
                <Animated.View
                    style={[
                        styles.deviceImage,
                        { transform: [{ scale: pulseAnim }] }
                    ]}
                >
                    <LinearGradient
                        colors={[Colors.success[500], Colors.success[700]]}
                        style={styles.deviceGradient}
                    >
                        <MaterialIcons name="settings-input-antenna" size={64} color={Colors.background.primary} />
                    </LinearGradient>
                </Animated.View>
                <View style={styles.statusIndicator}>
                    <MaterialIcons name="wifi" size={16} color={Colors.success[500]} />
                    <Text style={styles.statusText}>Connected</Text>
                </View>
            </View>

            <Card style={styles.instructionCard}>
                <View style={styles.stepHeader}>
                    <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <Text style={styles.stepTitle}>Configure Device Settings</Text>
                </View>
                
                <Text style={styles.instructionText}>
                    Now configure your device&apos;s IP address to establish the connection.
                </Text>
                
                <Input
                    label="Device IP Address"
                    value={deviceIP}
                    onChangeText={setDeviceIP}
                    placeholder="192.168.4.1"
                    error={ipError}
                    leftIcon={<MaterialIcons name="router" size={18} color={Colors.neutral[400]} />}
                    style={styles.ipInput}
                />

                <Button
                    title={isConnecting ? 'Connecting...' : 'Connect to Device'}
                    onPress={handleDeviceConnect}
                    loading={isConnecting}
                    disabled={isConnecting}
                    fullWidth
                    style={styles.primaryButton}
                />
            </Card>
        </Animated.View>
    );

    const renderCompleteStep = () => (
        <Animated.View
            style={[
                styles.stepContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                    <MaterialIcons name="check-circle" size={80} color={Colors.success[500]} />
                </View>
                <Text style={styles.successTitle}>Device Connected!</Text>
                <Text style={styles.successSubtitle}>
                    Your mmWave device is now ready to monitor your vitals
                </Text>
                
                <View style={styles.deviceStats}>
                    <View style={styles.statItem}>
                        <MaterialIcons name="signal-cellular-alt" size={20} color={Colors.success[500]} />
                        <Text style={styles.statLabel}>Signal</Text>
                        <Text style={styles.statValue}>Excellent</Text>
                    </View>
                    <View style={styles.statItem}>
                        <MaterialIcons name="speed" size={20} color={Colors.success[500]} />
                        <Text style={styles.statLabel}>Status</Text>
                        <Text style={styles.statValue}>Active</Text>
                    </View>
                    <View style={styles.statItem}>
                        <MaterialIcons name="favorite" size={20} color={Colors.success[500]} />
                        <Text style={styles.statLabel}>Health</Text>
                        <Text style={styles.statValue}>Ready</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
            
            <LinearGradient
                colors={[Colors.background.primary, Colors.neutral[50]]}
                style={styles.backgroundGradient}
            >
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Device Setup</Text>
                        <Text style={styles.subtitle}>
                            Connect your mmWave device to start monitoring
                        </Text>
                        
                        {/* Progress Indicator */}
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View 
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: currentStep === 'wifi' ? '33%' : 
                                                   currentStep === 'device' ? '66%' : '100%'
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>
                                Step {currentStep === 'wifi' ? '1' : currentStep === 'device' ? '2' : '3'} of 3
                            </Text>
                        </View>
                    </View>

                    {/* Step Content */}
                    {currentStep === 'wifi' && renderWifiStep()}
                    {currentStep === 'device' && renderDeviceStep()}
                    {currentStep === 'complete' && renderCompleteStep()}

                    {/* Skip Button */}
                    {currentStep !== 'complete' && (
                        <TouchableOpacity
                            style={styles.skipButton}
                            onPress={handleSkip}
                        >
                            <Text style={styles.skipText}>Skip for now</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundGradient: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        padding: Spacing.xl,
        paddingTop: Spacing['2xl'],
    },
    title: {
        fontSize: Typography.fontSize['3xl'],
        fontWeight: Typography.fontWeight.bold as any,
        color: Colors.text.primary,
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: Typography.fontSize.base,
        color: Colors.text.secondary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    progressContainer: {
        width: '100%',
        alignItems: 'center',
    },
    progressBar: {
        width: '100%',
        height: 4,
        backgroundColor: Colors.neutral[200],
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.primary[500],
        borderRadius: 2,
    },
    progressText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.text.tertiary,
        fontWeight: Typography.fontWeight.medium as any,
    },
    stepContainer: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xl,
    },
    deviceImageContainer: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
        position: 'relative',
    },
    deviceImage: {
        marginBottom: Spacing.lg,
    },
    deviceGradient: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.large,
    },
    wifiRings: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    wifiRing: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: Colors.primary[500],
        borderRadius: 100,
        opacity: 0.3,
    },
    wifiRing1: {
        width: 140,
        height: 140,
    },
    wifiRing2: {
        width: 160,
        height: 160,
    },
    wifiRing3: {
        width: 180,
        height: 180,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.success[50],
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        gap: Spacing.xs,
    },
    statusText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.success[700],
        fontWeight: Typography.fontWeight.medium as any,
    },
    instructionCard: {
        padding: Spacing.xl,
        marginBottom: Spacing.lg,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.primary[500],
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    stepNumberText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.bold as any,
        color: Colors.background.primary,
    },
    stepTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.bold as any,
        color: Colors.text.primary,
    },
    instructionText: {
        fontSize: Typography.fontSize.base,
        color: Colors.text.secondary,
        lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
        marginBottom: Spacing.lg,
    },
    wifiInfo: {
        backgroundColor: Colors.neutral[50],
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        gap: Spacing.md,
    },
    wifiItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    wifiName: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.semibold as any,
        color: Colors.text.primary,
    },
    wifiPassword: {
        fontSize: Typography.fontSize.sm,
        color: Colors.text.secondary,
    },
    ipInput: {
        marginBottom: Spacing.lg,
    },
    primaryButton: {
        backgroundColor: Colors.primary[500],
        ...Shadows.medium,
    },
    successContainer: {
        alignItems: 'center',
        padding: Spacing.xl,
    },
    successIcon: {
        marginBottom: Spacing.lg,
    },
    successTitle: {
        fontSize: Typography.fontSize['2xl'],
        fontWeight: Typography.fontWeight.bold as any,
        color: Colors.text.primary,
        marginBottom: Spacing.sm,
    },
    successSubtitle: {
        fontSize: Typography.fontSize.base,
        color: Colors.text.secondary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    deviceStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        backgroundColor: Colors.neutral[50],
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
    },
    statItem: {
        alignItems: 'center',
        gap: Spacing.xs,
    },
    statLabel: {
        fontSize: Typography.fontSize.sm,
        color: Colors.text.secondary,
    },
    statValue: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold as any,
        color: Colors.text.primary,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    skipText: {
        fontSize: Typography.fontSize.base,
        color: Colors.text.tertiary,
        fontWeight: Typography.fontWeight.medium as any,
    },
});

export default DeviceSetupScreen;
