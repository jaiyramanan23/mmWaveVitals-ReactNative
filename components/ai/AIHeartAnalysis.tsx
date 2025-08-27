/**
 * Modern AI-Powered Heart Sound Analysis Interface
 * Siri-like experience with voice guidance and automatic recording
 */

import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface AIHeartAnalysisProps {
  onClose: () => void;
  user: any;
}

type AnalysisStep = 
  | 'welcome'
  | 'device_check'
  | 'positioning'
  | 'listening'
  | 'recording'
  | 'analyzing'
  | 'results'
  | 'complete';

interface StepInstruction {
  title: string;
  subtitle: string;
  voice: string;
  duration: number;
}

const ANALYSIS_STEPS: Record<AnalysisStep, StepInstruction> = {
  welcome: {
    title: "Hello! I'm your AI Heart Health Assistant",
    subtitle: "Let's analyze your heart sounds together",
    voice: "Hello! I'm your AI Heart Health Assistant. Let's analyze your heart sounds together.",
    duration: 3000
  },
  device_check: {
    title: "Connect your R-Stethoscope",
    subtitle: "Make sure your device is properly connected",
    voice: "First, please connect your R-Stethoscope device and ensure it's properly paired.",
    duration: 4000
  },
  positioning: {
    title: "Position the stethoscope",
    subtitle: "Place it gently on your chest, just below the left nipple",
    voice: "Now, place the stethoscope gently on your chest, just below the left nipple. Make sure it has good contact with your skin.",
    duration: 5000
  },
  listening: {
    title: "Stay still and breathe normally",
    subtitle: "I'm listening for your heartbeat...",
    voice: "Perfect! Now stay still and breathe normally. I'm listening for your heartbeat.",
    duration: 3000
  },
  recording: {
    title: "Recording your heart sounds",
    subtitle: "Please remain still for 30 seconds",
    voice: "I'm now recording your heart sounds. Please remain still and breathe normally for the next 30 seconds.",
    duration: 30000
  },
  analyzing: {
    title: "Analyzing with AI",
    subtitle: "Processing your heart sound patterns...",
    voice: "Great! I'm now analyzing your heart sound patterns using advanced AI. This will take just a moment.",
    duration: 5000
  },
  results: {
    title: "Analysis Complete",
    subtitle: "Here are your heart health insights",
    voice: "Analysis complete! Here are your heart health insights.",
    duration: 2000
  },
  complete: {
    title: "All Done!",
    subtitle: "Your results have been saved securely",
    voice: "All done! Your results have been saved securely. Take care of your heart health!",
    duration: 3000
  }
};

export const AIHeartAnalysis: React.FC<AIHeartAnalysisProps> = ({ onClose, user }) => {
  const [currentStep, setCurrentStep] = useState<AnalysisStep>('welcome');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  
  // Voice synthesis
  const speak = async (text: string) => {
    // Note: You'll need to install expo-speech
    // import * as Speech from 'expo-speech';
    // Speech.speak(text, { language: 'en', pitch: 1.0, rate: 0.9 });
    console.log('🗣️ Speaking:', text);
  };

  // Initialize animations
  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Scale in animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Start pulse animation
    startPulseAnimation();
    
    // Start wave animation
    startWaveAnimation();
  }, []);

  // Pulse animation for AI indicator
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
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
  };

  // Wave animation for sound visualization
  const startWaveAnimation = () => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  // Auto-progress through steps
  useEffect(() => {
    const currentInstruction = ANALYSIS_STEPS[currentStep];
    
    // Speak the instruction
    speak(currentInstruction.voice);
    
    // Auto-progress to next step
    const timer = setTimeout(() => {
      progressToNextStep();
    }, currentInstruction.duration);

    return () => clearTimeout(timer);
  }, [currentStep]);

  const progressToNextStep = () => {
    const steps: AnalysisStep[] = [
      'welcome', 'device_check', 'positioning', 'listening', 
      'recording', 'analyzing', 'results', 'complete'
    ];
    
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      setCurrentStep(nextStep);
      
      // Start recording at the recording step
      if (nextStep === 'recording') {
        startRecording();
      }
      
      // Stop recording and analyze at analyzing step
      if (nextStep === 'analyzing') {
        stopRecordingAndAnalyze();
      }
    } else {
      // Analysis complete
      setTimeout(() => onClose(), 2000);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.error('Audio permission denied');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      
      // Start recording duration timer
      const timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      // Stop after 30 seconds
      setTimeout(() => {
        clearInterval(timer);
      }, 30000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecordingAndAnalyze = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setIsRecording(false);
        setRecording(null);
        setRecordingDuration(0);
        
        // TODO: Integrate with your analysis service
        console.log('🎵 Recorded audio URI:', uri);
        
        // Simulate analysis
        setTimeout(() => {
          setCurrentStep('results');
        }, 3000);
        
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    }
  };

  const renderAIAvatar = () => (
    <Animated.View style={[
      styles.aiAvatar,
      {
        transform: [
          { scale: pulseAnim },
          { scale: scaleAnim }
        ],
        opacity: fadeAnim
      }
    ]}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.aiAvatarGradient}
      >
        <MaterialIcons name="favorite" size={60} color="white" />
      </LinearGradient>
    </Animated.View>
  );

  const renderSoundWaves = () => {
    if (!isRecording) return null;
    
    return (
      <View style={styles.soundWavesContainer}>
        {[...Array(5)].map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.soundWave,
              {
                transform: [{
                  scaleY: waveAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1.5 + Math.random() * 0.5],
                  })
                }],
                opacity: waveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                })
              }
            ]}
          />
        ))}
      </View>
    );
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <Text style={styles.stepNumber}>
        {Object.keys(ANALYSIS_STEPS).indexOf(currentStep) + 1} / 8
      </Text>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill,
            { 
              width: `${((Object.keys(ANALYSIS_STEPS).indexOf(currentStep) + 1) / 8) * 100}%` 
            }
          ]} 
        />
      </View>
    </View>
  );

  const currentInstruction = ANALYSIS_STEPS[currentStep];

  return (
    <View style={styles.container}>
      <BlurView intensity={20} style={styles.blurBackground} />
      
      <LinearGradient
        colors={['rgba(103, 58, 183, 0.1)', 'rgba(63, 81, 181, 0.1)']}
        style={styles.gradientOverlay}
      />

      <View style={styles.content}>
        {renderStepIndicator()}
        
        <View style={styles.mainSection}>
          {renderAIAvatar()}
          
          <Animated.View style={[
            styles.instructionContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}>
            <Text style={styles.instructionTitle}>
              {currentInstruction.title}
            </Text>
            <Text style={styles.instructionSubtitle}>
              {currentInstruction.subtitle}
            </Text>
          </Animated.View>

          {renderSoundWaves()}
          
          {isRecording && (
            <Animated.View style={[styles.recordingInfo, { opacity: fadeAnim }]}>
              <MaterialIcons name="fiber-manual-record" size={24} color="#ff4444" />
              <Text style={styles.recordingTime}>
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </Text>
            </Animated.View>
          )}
        </View>

        <TouchableOpacity style={styles.skipButton} onPress={onClose}>
          <Text style={styles.skipButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  blurBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  stepIndicator: {
    alignItems: 'center',
    marginTop: 60,
  },
  stepNumber: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  progressBar: {
    width: width * 0.8,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  mainSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatar: {
    marginBottom: 40,
  },
  aiAvatarGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  instructionContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  instructionTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  instructionSubtitle: {
    color: '#cccccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  soundWavesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginVertical: 20,
  },
  soundWave: {
    width: 4,
    height: 40,
    backgroundColor: '#667eea',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 20,
  },
  recordingTime: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  skipButton: {
    alignSelf: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    marginBottom: 40,
  },
  skipButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
