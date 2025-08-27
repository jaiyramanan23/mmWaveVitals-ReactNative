// mmWaveVitals/components/dashboard/HealthcareDashboard.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/DesignSystem';

const { width, height } = Dimensions.get('window');

interface HealthcareDashboardProps {
    onLogout: () => void;
    onOpenStethoscope: () => void;
    user?: any;
}

interface DeviceData {
    id: string;
    name: string;
    status: 'connected' | 'disconnected' | 'warning';
    type: 'mmwave' | 'stethoscope';
    lastSeen: string;
    batteryLevel?: number;
}

interface HealthAlert {
    id: string;
    type: 'warning' | 'critical' | 'info';
    title: string;
    description: string;
    timestamp: string;
    detected?: boolean;
}

const HealthcareDashboard: React.FC<HealthcareDashboardProps> = ({ 
    onLogout, 
    onOpenStethoscope,
    user 
}) => {
    const [healthData, setHealthData] = useState<any>(null);
    const [devices, setDevices] = useState<DeviceData[]>([
        {
            id: '1',
            name: 'mmWave Sensor',
            status: 'connected',
            type: 'mmwave',
            lastSeen: 'Just now',
            batteryLevel: 85
        },
        {
            id: '2',
            name: 'R-Stethoscope',
            status: 'disconnected',
            type: 'stethoscope',
            lastSeen: '2 hours ago'
        }
    ]);
    
    const [healthAlerts, setHealthAlerts] = useState<HealthAlert[]>([
        {
            id: '1',
            type: 'warning',
            title: 'Irregular Heart Rhythm',
            description: 'Detected irregular heartbeat pattern. Please consult your doctor.',
            timestamp: '2 hours ago',
            detected: true
        },
        {
            id: '2',
            type: 'info',
            title: 'Sleep Quality Improved',
            description: 'Your sleep patterns have improved by 15% this week.',
            timestamp: '1 day ago'
        }
    ]);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnims = useRef([
        new Animated.Value(30),
        new Animated.Value(30),
        new Animated.Value(30),
        new Animated.Value(30),
    ]).current;

    useEffect(() => {
        // Start animation sequence
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            ...slideAnims.map((anim, index) =>
                Animated.timing(anim, {
                    toValue: 0,
                    duration: 600,
                    delay: index * 100,
                    useNativeDriver: true,
                })
            ),
        ]).start();

        // Fetch health data
        fetchHealthData();
    }, []);

    const fetchHealthData = async () => {
        try {
            // Mock health data for demo
            const mockData = {
                vitals: {
                    heart_rate_bpm: 72,
                    breath_rate_bpm: 16,
                    signal_quality: 85,
                    presence_detected: true
                }
            };
            setHealthData(mockData);
        } catch (error) {
            console.error('Error fetching health data:', error);
        }
    };

    const renderVitalCard = (title: string, value: string, unit: string, icon: string, color: string, trend?: 'up' | 'down' | 'stable') => (
        <Animated.View
            style={[
                styles.vitalCard,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnims[0] }],
                },
            ]}
        >
            <LinearGradient
                colors={[Colors.background.primary, Colors.neutral[50]]}
                style={styles.vitalGradient}
            >
                <View style={styles.vitalHeader}>
                    <View style={[styles.vitalIcon, { backgroundColor: color + '20' }]}>
                        <MaterialIcons name={icon as any} size={24} color={color} />
                    </View>
                    {trend && (
                        <MaterialIcons 
                            name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'trending-flat'} 
                            size={16} 
                            color={trend === 'up' ? Colors.success[500] : trend === 'down' ? Colors.error[500] : Colors.neutral[400]} 
                        />
                    )}
                </View>
                <Text style={styles.vitalValue}>{value}</Text>
                <Text style={styles.vitalUnit}>{unit}</Text>
                <Text style={styles.vitalTitle}>{title}</Text>
            </LinearGradient>
        </Animated.View>
    );

    const renderDeviceCard = (device: DeviceData) => (
        <Animated.View
            key={device.id}
            style={[
                styles.deviceCard,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnims[1] }],
                },
            ]}
        >
            <TouchableOpacity
                style={styles.deviceCardContent}
                onPress={device.type === 'stethoscope' ? onOpenStethoscope : undefined}
            >
                <View style={styles.deviceInfo}>
                    <View style={[
                        styles.deviceIcon,
                        { 
                            backgroundColor: device.status === 'connected' ? Colors.success[500] + '20' : Colors.neutral[200]
                        }
                    ]}>
                        <MaterialIcons 
                            name={device.type === 'mmwave' ? 'sensors' : 'hearing'} 
                            size={24} 
                            color={device.status === 'connected' ? Colors.success[500] : Colors.neutral[400]} 
                        />
                    </View>
                    <View style={styles.deviceDetails}>
                        <Text style={styles.deviceName}>{device.name}</Text>
                        <Text style={styles.deviceLastSeen}>Last seen: {device.lastSeen}</Text>
                        {device.batteryLevel && (
                            <View style={styles.batteryContainer}>
                                <MaterialIcons name="battery-std" size={16} color={Colors.success[500]} />
                                <Text style={styles.batteryText}>{device.batteryLevel}%</Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={[
                    styles.deviceStatus,
                    { 
                        backgroundColor: device.status === 'connected' ? Colors.success[500] : 
                                       device.status === 'warning' ? Colors.warning[500] : Colors.neutral[400]
                    }
                ]}>
                    <Text style={styles.deviceStatusText}>
                        {device.status === 'connected' ? 'Online' : 
                         device.status === 'warning' ? 'Warning' : 'Offline'}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );

    const renderHealthAlert = (alert: HealthAlert) => (
        <Animated.View
            key={alert.id}
            style={[
                styles.alertCard,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnims[2] }],
                },
            ]}
        >
            <View style={styles.alertContent}>
                <View style={[
                    styles.alertIcon,
                    { 
                        backgroundColor: alert.type === 'critical' ? Colors.error[500] + '20' :
                                       alert.type === 'warning' ? Colors.warning[500] + '20' : Colors.primary[500] + '20'
                    }
                ]}>
                    <MaterialIcons 
                        name={alert.type === 'critical' ? 'error' : 
                              alert.type === 'warning' ? 'warning' : 'info'} 
                        size={20} 
                        color={alert.type === 'critical' ? Colors.error[500] :
                               alert.type === 'warning' ? Colors.warning[500] : Colors.primary[500]} 
                    />
                </View>
                <View style={styles.alertDetails}>
                    <View style={styles.alertHeader}>
                        <Text style={styles.alertTitle}>{alert.title}</Text>
                        {alert.detected && (
                            <View style={styles.detectedBadge}>
                                <Text style={styles.detectedText}>AI Detected</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.alertDescription}>{alert.description}</Text>
                    <Text style={styles.alertTimestamp}>{alert.timestamp}</Text>
                </View>
            </View>
        </Animated.View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
            
            <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <Animated.View
                    style={[
                        styles.header,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnims[0] }],
                        },
                    ]}
                >
                    <View style={styles.headerContent}>
                        <View>
                            <Text style={styles.greeting}>Good morning</Text>
                            <Text style={styles.userName}>{user?.displayName || user?.email || 'User'}</Text>
                        </View>
                        <TouchableOpacity style={styles.profileButton} onPress={onLogout}>
                            <MaterialIcons name="person" size={24} color={Colors.primary[500]} />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.healthSummary}>
                        <LinearGradient
                            colors={[Colors.primary[500], Colors.primary[700]]}
                            style={styles.summaryGradient}
                        >
                            <Text style={styles.summaryTitle}>Health Status</Text>
                            <Text style={styles.summaryValue}>Good</Text>
                            <Text style={styles.summarySubtext}>Based on recent vitals</Text>
                        </LinearGradient>
                    </View>
                </Animated.View>

                {/* Vital Signs */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Vital Signs</Text>
                    <View style={styles.vitalsGrid}>
                        {renderVitalCard('Heart Rate', healthData?.vitals?.heart_rate_bpm?.toString() || '72', 'BPM', 'favorite', Colors.error[500], 'stable')}
                        {renderVitalCard('Breathing', healthData?.vitals?.breath_rate_bpm?.toString() || '16', 'BPM', 'air', Colors.primary[500], 'up')}
                        {renderVitalCard('Signal', healthData?.vitals?.signal_quality?.toString() || '85', '%', 'signal-cellular-alt', Colors.success[500], 'stable')}
                        {renderVitalCard('Presence', healthData?.vitals?.presence_detected ? 'Yes' : 'No', '', 'person', Colors.warning[500])}
                    </View>
                </View>

                {/* Connected Devices */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Connected Devices</Text>
                        <TouchableOpacity style={styles.addButton}>
                            <MaterialIcons name="add" size={20} color={Colors.primary[500]} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.devicesContainer}>
                        {devices.map(renderDeviceCard)}
                    </View>
                </View>

                {/* Health Alerts & AI Detection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Health Insights</Text>
                    <View style={styles.alertsContainer}>
                        {healthAlerts.map(renderHealthAlert)}
                    </View>
                </View>

                {/* Quick Actions */}
                <Animated.View
                    style={[
                        styles.section,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnims[3] }],
                        },
                    ]}
                >
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity style={styles.actionCard} onPress={onOpenStethoscope}>
                            <MaterialIcons name="hearing" size={32} color={Colors.primary[500]} />
                            <Text style={styles.actionTitle}>Record Audio</Text>
                            <Text style={styles.actionSubtitle}>R-Stethoscope</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionCard}>
                            <MaterialIcons name="analytics" size={32} color={Colors.success[500]} />
                            <Text style={styles.actionTitle}>View Trends</Text>
                            <Text style={styles.actionSubtitle}>Health History</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionCard}>
                            <MaterialIcons name="settings" size={32} color={Colors.warning[500]} />
                            <Text style={styles.actionTitle}>Settings</Text>
                            <Text style={styles.actionSubtitle}>Device Config</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionCard}>
                            <MaterialIcons name="share" size={32} color={Colors.error[500]} />
                            <Text style={styles.actionTitle}>Share Report</Text>
                            <Text style={styles.actionSubtitle}>Export Data</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.secondary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: Spacing.xl,
    },
    header: {
        padding: Spacing.xl,
        paddingTop: Spacing.lg,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    greeting: {
        fontSize: Typography.fontSize.base,
        color: Colors.text.secondary,
        marginBottom: Spacing.xs,
    },
    userName: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.bold as any,
        color: Colors.text.primary,
    },
    profileButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.small,
    },
    healthSummary: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.medium,
    },
    summaryGradient: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    summaryTitle: {
        fontSize: Typography.fontSize.base,
        color: Colors.background.primary,
        opacity: 0.9,
        marginBottom: Spacing.sm,
    },
    summaryValue: {
        fontSize: Typography.fontSize['3xl'],
        fontWeight: Typography.fontWeight.bold as any,
        color: Colors.background.primary,
        marginBottom: Spacing.xs,
    },
    summarySubtext: {
        fontSize: Typography.fontSize.sm,
        color: Colors.background.primary,
        opacity: 0.8,
    },
    section: {
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.bold as any,
        color: Colors.text.primary,
        marginBottom: Spacing.lg,
    },
    addButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    vitalsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    vitalCard: {
        flex: 1,
        minWidth: (width - Spacing.xl * 2 - Spacing.md) / 2,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.small,
    },
    vitalGradient: {
        padding: Spacing.lg,
    },
    vitalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    vitalIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    vitalValue: {
        fontSize: Typography.fontSize['2xl'],
        fontWeight: Typography.fontWeight.bold as any,
        color: Colors.text.primary,
        marginBottom: Spacing.xs,
    },
    vitalUnit: {
        fontSize: Typography.fontSize.sm,
        color: Colors.text.secondary,
        marginBottom: Spacing.sm,
    },
    vitalTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium as any,
        color: Colors.text.primary,
    },
    devicesContainer: {
        gap: Spacing.md,
    },
    deviceCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        ...Shadows.small,
    },
    deviceCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
    },
    deviceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    deviceIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    deviceDetails: {
        flex: 1,
    },
    deviceName: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.semibold as any,
        color: Colors.text.primary,
        marginBottom: Spacing.xs,
    },
    deviceLastSeen: {
        fontSize: Typography.fontSize.sm,
        color: Colors.text.secondary,
        marginBottom: Spacing.xs,
    },
    batteryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    batteryText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.success[500],
        fontWeight: Typography.fontWeight.medium as any,
    },
    deviceStatus: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
    },
    deviceStatusText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.medium as any,
        color: Colors.background.primary,
    },
    alertsContainer: {
        gap: Spacing.md,
    },
    alertCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        ...Shadows.small,
    },
    alertContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    alertIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    alertDetails: {
        flex: 1,
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    alertTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.semibold as any,
        color: Colors.text.primary,
        flex: 1,
    },
    detectedBadge: {
        backgroundColor: Colors.primary[50],
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        marginLeft: Spacing.sm,
    },
    detectedText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.medium as any,
        color: Colors.primary[500],
    },
    alertDescription: {
        fontSize: Typography.fontSize.sm,
        color: Colors.text.secondary,
        lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
        marginBottom: Spacing.sm,
    },
    alertTimestamp: {
        fontSize: Typography.fontSize.xs,
        color: Colors.text.tertiary,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    actionCard: {
        flex: 1,
        minWidth: (width - Spacing.xl * 2 - Spacing.md) / 2,
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        ...Shadows.small,
    },
    actionTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold as any,
        color: Colors.text.primary,
        marginTop: Spacing.sm,
        marginBottom: Spacing.xs,
        textAlign: 'center',
    },
    actionSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.text.secondary,
        textAlign: 'center',
    },
});

export default HealthcareDashboard;
