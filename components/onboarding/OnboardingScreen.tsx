// mmWaveVitals/components/onboarding/OnboardingScreen.tsx
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors, Spacing } from '../../constants/DesignSystem';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
    onComplete: () => void;
}

const slides = [
    {
        title: 'Contactless Health Monitoring',
        description: 'Our mmWave sensor technology monitors vital signs without any physical contact.',
        icon: 'sensors',
        color: Colors?.primary?.[500] || '#36AFA0',
    },
    {
        title: 'Continuous Vital Signs',
        description: 'Track your heart rate and breathing patterns in real-time.',
        icon: 'monitor-heart',
        color: Colors?.success?.[500] || '#22C55E',
    },
    {
        title: 'Professional Audio Analysis',
        description: 'Use your R-Stethoscope for professional heart sound recording and analysis.',
        icon: 'hearing',
        color: Colors?.warning?.[500] || '#F59E0B',
    },
    {
        title: 'Smart Health Analytics',
        description: 'AI-powered analysis provides you with personalized health insights.',
        icon: 'analytics',
        color: Colors?.primary?.[400] || '#55BBAE',
    },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        fadeAnim.setValue(0);
        slideAnim.setValue(20);
        
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    }, [currentSlide, fadeAnim, slideAnim]);

    // Ensure Colors and Spacing are properly loaded
    if (!Colors || !Spacing) {
        console.error('DesignSystem not loaded properly');
        return null;
    }

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            onComplete();
        }
    };

    const handlePrevious = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    };

    const currentSlideData = slides[currentSlide];
    const isLastSlide = currentSlide === slides.length - 1;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors?.background?.primary || '#FFFFFF'} />
            
            <View style={styles.content}>
                <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>

                <Animated.View 
                    style={[
                        styles.slideContainer,
                        { 
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }] 
                        }
                    ]}
                >
                    <View style={[styles.illustrationContainer, { backgroundColor: currentSlideData.color + '20' }]}>
                        <MaterialIcons
                            name={currentSlideData.icon as any}
                            size={width * 0.3}
                            color={currentSlideData.color}
                        />
                    </View>

                    <Text style={styles.slideTitle}>{currentSlideData.title}</Text>
                    <Text style={styles.slideDescription}>{currentSlideData.description}</Text>
                </Animated.View>

                <View style={styles.footer}>
                    <View style={styles.indicators}>
                        {slides.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.indicator,
                                    {
                                        backgroundColor: index === currentSlide
                                            ? Colors?.primary?.[500] || '#36AFA0'
                                            : Colors?.neutral?.[300] || '#D1D1D6',
                                        width: index === currentSlide ? 24 : 8,
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    <View style={styles.navigation}>
                        <TouchableOpacity
                            style={[styles.navButton, { opacity: currentSlide > 0 ? 1 : 0 }]}
                            onPress={handlePrevious}
                            disabled={currentSlide === 0}
                        >
                            <MaterialIcons
                                name="arrow-back"
                                size={24}
                                color={Colors?.neutral?.[600] || '#4B4B4B'}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.navButton, styles.primaryNavButton]}
                            onPress={handleNext}
                        >
                            <Text style={styles.primaryNavButtonText}>
                                {isLastSlide ? 'Get Started' : 'Next'}
                            </Text>
                            <MaterialIcons
                                name={isLastSlide ? 'check' : 'arrow-forward'}
                                size={24}
                                color={Colors?.background?.primary || '#FFFFFF'}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors?.background?.primary || '#FFFFFF',
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing?.lg || 24,
        paddingTop: (StatusBar.currentHeight || 0) + (Spacing?.lg || 24),
        paddingBottom: Spacing?.lg || 24,
        justifyContent: 'space-between',
    },
    skipButton: {
        position: 'absolute',
        top: (StatusBar.currentHeight || 0) + (Spacing?.md || 16),
        right: Spacing?.lg || 24,
        zIndex: 10,
    },
    skipText: {
        fontSize: 16,
        color: Colors?.neutral?.[500] || '#6C6C6E',
        fontWeight: '500',
    },
    slideContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: Spacing?.['3xl'] || 64,
    },
    illustrationContainer: {
        width: width * 0.6,
        height: width * 0.6,
        borderRadius: (width * 0.6) / 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing?.['2xl'] || 48,
    },
    slideTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: Colors?.neutral?.[800] || '#1C1C1E',
        textAlign: 'center',
        marginBottom: Spacing?.md || 16,
        lineHeight: 34,
    },
    slideDescription: {
        fontSize: 16,
        color: Colors?.neutral?.[600] || '#4B4B4B',
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: '85%',
    },
    footer: {
        paddingHorizontal: Spacing?.md || 16,
    },
    indicators: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing?.xl || 32,
        gap: Spacing?.sm || 8,
    },
    indicator: {
        height: 8,
        borderRadius: 4,
    },
    navigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    navButton: {
        padding: Spacing?.md || 16,
    },
    primaryNavButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors?.primary?.[500] || '#36AFA0',
        borderRadius: 50,
        paddingVertical: Spacing?.md || 16,
        paddingHorizontal: Spacing?.lg || 24,
        gap: Spacing?.sm || 8,
        shadowColor: Colors?.primary?.[500] || '#36AFA0',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    primaryNavButtonText: {
        fontSize: 18,
        color: Colors?.background?.primary || '#FFFFFF',
        fontWeight: '600',
    },
});

export default OnboardingScreen;