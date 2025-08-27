//mmWaveVitals/components/device/DeviceSelectionScreen.tsx
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Dimensions,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/DesignSystem';
import Button from '../ui/Button';
import Card from '../ui/Card';

const { width } = Dimensions.get('window');

export type DeviceType = 'mmwave' | 'rstethoscope' | 'ai-rstethoscope';

interface DeviceSelectionScreenProps {
    onDeviceSelected: (device: DeviceType) => void;
    user?: any;
}

interface DeviceOption {
    id: DeviceType;
    title: string;
    subtitle: string;
    description: string;
    icon: string;
    gradient: string[];
    features: string[];
    primaryColor: string;
}

const deviceOptions: DeviceOption[] = [
    {
        id: 'ai-rstethoscope',
        title: 'AI R-Stethoscope',
        subtitle: 'Intelligent Heart Sound Analysis',
        description: 'AI-powered guided heart sound analysis with visual step-by-step instructions',
        icon: 'smart-toy',
        gradient: ['#667eea', '#764ba2'],
        features: [
            'AI-guided visual instructions',
            'Automatic device detection',
            'Smart analysis workflow',
            'Modern animated interface',
            'GPT-powered insights'
        ],
        primaryColor: '#667eea'
    },
    {
        id: 'mmwave',
        title: 'mmWave Vitals',
        subtitle: 'Bluetooth mmWave Monitoring',
        description: 'Seeed MR60BHA2 mmWave sensor with Bluetooth connectivity for real-time vital signs monitoring',
        icon: 'sensors',
        gradient: ['#36AFA0', '#2A8376'],
        features: [
            'Bluetooth LE connectivity',
            'Real-time heart rate monitoring',
            'Breathing rate detection',
            'Motion and presence sensing',
            'No physical contact required'
        ],
        primaryColor: Colors.primary[500]
    },
    {
        id: 'rstethoscope',
        title: 'R-Stethoscope',
        subtitle: 'Traditional Digital Analysis',
        description: 'Professional-grade digital stethoscope with traditional interface',
        icon: 'hearing',
        gradient: ['#FF6B6B', '#E55656'],
        features: [
            'Traditional analysis interface',
            'Heart sound recording',
            'Backend processing',
            'Manual operation control',
            'USB-C wired connection'
        ],
        primaryColor: '#FF6B6B'
    }
];

const DeviceSelectionScreen: React.FC<DeviceSelectionScreenProps> = ({ onDeviceSelected, user }) => {
    const [selectedDevice, setSelectedDevice] = useState<DeviceType | null>(null);

    const handleDeviceSelect = (deviceId: DeviceType) => {
        setSelectedDevice(deviceId);
    };

    const handleContinue = () => {
        if (selectedDevice) {
            onDeviceSelected(selectedDevice);
        }
    };

    const DeviceCard = ({ device }: { device: DeviceOption }) => {
        const isSelected = selectedDevice === device.id;
        
        return (
            <TouchableOpacity
                style={[
                    styles.deviceCard,
                    isSelected && styles.selectedCard
                ]}
                onPress={() => handleDeviceSelect(device.id)}
                activeOpacity={0.8}
            >
                <Card 
                    variant="elevated" 
                    padding="lg" 
                    style={{
                        ...styles.cardInner,
                        ...(isSelected ? { 
                            borderWidth: 2, 
                            borderColor: device.primaryColor 
                        } : {})
                    }}
                >
                    {/* Header */}
                    <View style={styles.deviceHeader}>
                        <View style={[
                            styles.iconContainer,
                            { backgroundColor: isSelected ? device.primaryColor : Colors.neutral[100] }
                        ]}>
                            <MaterialIcons 
                                name={device.icon as any} 
                                size={32} 
                                color={isSelected ? Colors.text.inverse : Colors.neutral[600]} 
                            />
                        </View>
                        {isSelected && (
                            <View style={styles.checkmark}>
                                <MaterialIcons 
                                    name="check-circle" 
                                    size={24} 
                                    color={device.primaryColor} 
                                />
                            </View>
                        )}
                    </View>

                    {/* Content */}
                    <View style={styles.deviceContent}>
                        <Text style={[
                            styles.deviceTitle,
                            isSelected && { color: device.primaryColor }
                        ]}>
                            {device.title}
                        </Text>
                        <Text style={styles.deviceSubtitle}>
                            {device.subtitle}
                        </Text>
                        <Text style={styles.deviceDescription}>
                            {device.description}
                        </Text>

                        {/* Features */}
                        <View style={styles.featuresContainer}>
                            {device.features.slice(0, 3).map((feature, index) => (
                                <View key={index} style={styles.featureItem}>
                                    <MaterialIcons 
                                        name="check" 
                                        size={16} 
                                        color={isSelected ? device.primaryColor : Colors.success[500]} 
                                    />
                                    <Text style={[
                                        styles.featureText,
                                        isSelected && { color: Colors.text.primary }
                                    ]}>
                                        {feature}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
            
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <View style={styles.mainIcon}>
                            <MaterialIcons name="medical-services" size={40} color={Colors.primary[500]} />
                        </View>
                    </View>
                    
                    <Text style={styles.title}>Choose Your Device</Text>
                    <Text style={styles.subtitle}>
                        Select the healthcare device you want to use
                    </Text>
                    {user && (
                        <Text style={styles.welcomeText}>
                            Welcome back, {user.email}
                        </Text>
                    )}
                </View>

                {/* Device Options */}
                <View style={styles.devicesContainer}>
                    {deviceOptions.map((device) => (
                        <DeviceCard key={device.id} device={device} />
                    ))}
                </View>

                {/* Continue Button */}
                <View style={styles.actionContainer}>
                    <Button
                        title={selectedDevice ? `Continue with ${deviceOptions.find(d => d.id === selectedDevice)?.title}` : 'Select a Device'}
                        onPress={handleContinue}
                        disabled={!selectedDevice}
                        fullWidth
                        style={styles.continueButton}
                    />
                    
                    <Text style={styles.helpText}>
                        You can switch between devices anytime from the main dashboard
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing['2xl'],
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing['2xl'],
    },
    logoContainer: {
        marginBottom: Spacing.lg,
    },
    mainIcon: {
        width: 80,
        height: 80,
        backgroundColor: Colors.primary[50],
        borderRadius: BorderRadius['2xl'],
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.medium,
    },
    title: {
        fontSize: Typography.fontSize['3xl'],
        fontWeight: Typography.fontWeight.bold as any,
        color: Colors.text.primary,
        marginBottom: Spacing.xs,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: Typography.fontSize.lg,
        color: Colors.text.secondary,
        textAlign: 'center',
        marginBottom: Spacing.sm,
        maxWidth: width * 0.8,
    },
    welcomeText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary[600],
        fontWeight: Typography.fontWeight.medium as any,
    },
    devicesContainer: {
        gap: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    deviceCard: {
        marginBottom: Spacing.sm,
    },
    selectedCard: {
        transform: [{ scale: 1.02 }],
    },
    cardInner: {
        position: 'relative',
    },
    deviceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmark: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.full,
        padding: 2,
    },
    deviceContent: {
        flex: 1,
    },
    deviceTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.bold as any,
        color: Colors.text.primary,
        marginBottom: Spacing.xs,
    },
    deviceSubtitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.medium as any,
        color: Colors.text.secondary,
        marginBottom: Spacing.sm,
    },
    deviceDescription: {
        fontSize: Typography.fontSize.sm,
        color: Colors.text.tertiary,
        lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
        marginBottom: Spacing.lg,
    },
    featuresContainer: {
        gap: Spacing.sm,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    featureText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.text.secondary,
        flex: 1,
    },
    actionContainer: {
        marginTop: Spacing.lg,
        alignItems: 'center',
    },
    continueButton: {
        marginBottom: Spacing.lg,
    },
    helpText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.text.tertiary,
        textAlign: 'center',
        maxWidth: width * 0.8,
    },
});

export default DeviceSelectionScreen;
