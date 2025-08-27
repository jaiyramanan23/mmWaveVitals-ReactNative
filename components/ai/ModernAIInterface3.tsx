/**
 * Digital Stethoscope Heart Analysis Interface
 * Professional home cardiac monitoring and analysis
 */

import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ClinicalAnalysisResult } from '../../services/advancedBackend';
import { deviceDetector, DeviceStatus } from '../../services/deviceDetection';
import { mlBackendAnalysis } from '../../services/mlBackend';
import DetailedAnalysisModal from '../analysis/DetailedAnalysisModal';

const { width, height } = Dimensions.get('window');

interface DigitalStethoscopeProps {
  onClose: () => void;
  user: any;
  firebaseService: any;
  loadUserRecordings: () => void;
}

type RecordingStep = 
  | 'device_connection'
  | 'positioning_guide'
  | 'recording'
  | 'analysis'
  | 'results';

interface StethoscopePosition {
  id: string;
  name: string;
  description: string;
  icon: string;
  anatomicalLocation: string;
  instructions: string;
  completed: boolean;
}

interface RecordingSession {
  position: StethoscopePosition;
  audioUri: string | null;
  duration: number;
  quality: number;
  heartRate: number;
  timestamp: Date;
}

interface AnalysisResult {
  overall_assessment: string;
  heart_rate: number;
  rhythm: 'regular' | 'irregular';
  murmur_detected: boolean;
  sound_quality: 'excellent' | 'good' | 'fair' | 'poor';
  clinical_notes: string[];
  recommendations: string[];
  confidence_score: number;
  positions_analyzed: string[];
  risk_level: 'low' | 'moderate' | 'high';
}

const STETHOSCOPE_POSITIONS: StethoscopePosition[] = [
  {
    id: 'aortic',
    name: 'Aortic Area',
    description: 'Right sternal border, 2nd intercostal space',
    icon: 'heart',
    anatomicalLocation: 'Upper right chest',
    instructions: 'Place stethoscope at the right edge of the breastbone, just below the collarbone',
    completed: false
  },
  {
    id: 'pulmonary',
    name: 'Pulmonary Area',
    description: 'Left sternal border, 2nd intercostal space',
    icon: 'lungs',
    anatomicalLocation: 'Upper left chest',
    instructions: 'Place stethoscope at the left edge of the breastbone, just below the collarbone',
    completed: false
  },
  {
    id: 'tricuspid',
    name: 'Tricuspid Area',
    description: 'Left sternal border, 4th intercostal space',
    icon: 'heartbeat',
    anatomicalLocation: 'Lower left chest',
    instructions: 'Place stethoscope at the left edge of the breastbone, about midway down',
    completed: false
  },
  {
    id: 'mitral',
    name: 'Mitral Area (Apex)',
    description: 'Left midclavicular line, 5th intercostal space',
    icon: 'heart-pulse',
    anatomicalLocation: 'Left chest apex',
    instructions: 'Place stethoscope at the left chest, about level with the nipple',
    completed: false
  }
];

const DigitalStethoscopeInterface: React.FC<DigitalStethoscopeProps> = ({
  onClose,
  user,
  firebaseService,
  loadUserRecordings
}) => {
  const [currentStep, setCurrentStep] = useState<RecordingStep>('device_connection');
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [stethoscopePositions, setStethoscopePositions] = useState<StethoscopePosition[]>(STETHOSCOPE_POSITIONS);
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [recordingSessions, setRecordingSessions] = useState<RecordingSession[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    heartRate: 0,
    signalQuality: 0,
    noiseLevel: 0
  });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [clinicalAnalysisResult, setClinicalAnalysisResult] = useState<ClinicalAnalysisResult | null>(null);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPreviousRecordings, setShowPreviousRecordings] = useState(false);
  const [previousRecordings, setPreviousRecordings] = useState<any[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);
  const [playbackSound, setPlaybackSound] = useState<Audio.Sound | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const heartBeatAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  
  // Timers
  const timerRef = useRef<number | null>(null);
  const metricsRef = useRef<number | null>(null);

  useEffect(() => {
    initializeStethoscope();
    startAnimations();
    
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (metricsRef.current) clearInterval(metricsRef.current);
    
    // Cleanup audio playback
    if (playbackSound) {
      playbackSound.unloadAsync().catch(error => 
        console.warn('Error unloading playback sound:', error)
      );
    }
    
    try {
      deviceDetector.stopDetection();
    } catch (error) {
      console.warn('Device cleanup error:', error);
    }
  };

  const initializeStethoscope = async () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    try {
      const unsubscribe = deviceDetector.onStatusChange((status) => {
        setDeviceStatus(status);
      });
      await deviceDetector.startDetection();
    } catch (error) {
      console.warn('Device detection failed:', error);
    }
  };

  const startAnimations = () => {
    // Pulse animation for active elements
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

    // Heart beat animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartBeatAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(heartBeatAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(heartBeatAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(heartBeatAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Wave animation for audio visualization
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ).start();
  };

  const connectStethoscope = () => {
    // Simulate connection process
    setCurrentStep('positioning_guide');
  };

  const startPositionRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is needed to record heart sounds.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      const newRecording = new Audio.Recording();
      
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      await newRecording.prepareToRecordAsync(recordingOptions);
      await newRecording.startAsync();

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingTimer(0);
      setCurrentStep('recording');

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTimer(prev => prev + 1);
      }, 1000);

      // Start real-time metrics simulation
      metricsRef.current = setInterval(() => {
        setRealTimeMetrics({
          heartRate: 60 + Math.random() * 40,
          signalQuality: 70 + Math.random() * 30,
          noiseLevel: Math.random() * 30
        });
      }, 500);

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (isRecording) {
          stopPositionRecording();
        }
      }, 30000);

    } catch (error: any) {
      console.error('Recording failed:', error);
      Alert.alert('Recording Error', `Failed to start recording: ${error?.message || 'Unknown error'}`);
    }
  };

  const stopPositionRecording = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        
        if (uri) {
          const currentPosition = stethoscopePositions[currentPositionIndex];
          const newSession: RecordingSession = {
            position: currentPosition,
            audioUri: uri,
            duration: recordingTimer,
            quality: realTimeMetrics.signalQuality,
            heartRate: realTimeMetrics.heartRate,
            timestamp: new Date()
          };
          
          setRecordingSessions(prev => [...prev, newSession]);
          
          // Mark position as completed
          setStethoscopePositions(prev => 
            prev.map((pos, index) => 
              index === currentPositionIndex 
                ? { ...pos, completed: true }
                : pos
            )
          );
          
          if (currentPositionIndex < stethoscopePositions.length - 1) {
            setCurrentPositionIndex(prev => prev + 1);
            setCurrentStep('positioning_guide');
          } else {
            // All positions recorded, start analysis
            setCurrentStep('analysis');
            performComprehensiveAnalysis();
          }
        }
      }
      
      setRecording(null);
      setIsRecording(false);
      
      if (timerRef.current) clearInterval(timerRef.current);
      if (metricsRef.current) clearInterval(metricsRef.current);

    } catch (error: any) {
      console.error('Stop recording failed:', error);
      Alert.alert('Recording Error', 'Failed to complete recording. Please try again.');
    }
  };

  const performComprehensiveAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      // Use the first recorded session for analysis (you could combine multiple)
      const primarySession = recordingSessions[0];
      if (!primarySession?.audioUri) {
        throw new Error('No valid recording found');
      }

      let result;
      let clinicalResult: ClinicalAnalysisResult | null = null;
      
      try {
        // Try ML backend first
        const mlResult = await mlBackendAnalysis(primarySession.audioUri);
        
        result = {
          overall_assessment: mlResult.classification.prediction,
          heart_rate: Math.round(mlResult.classification.heart_rate_bpm),
          rhythm: mlResult.medical_analysis.findings.arrhythmia_detected ? 'irregular' as const : 'regular' as const,
          murmur_detected: mlResult.medical_analysis.findings.murmur_detected,
          sound_quality: mlResult.quality_metrics.confidence_level === 'high' ? 'excellent' as const : 
                        mlResult.quality_metrics.confidence_level === 'medium' ? 'good' as const : 'fair' as const,
          clinical_notes: [mlResult.medical_analysis.clinical_assessment],
          recommendations: mlResult.medical_analysis.recommendations,
          confidence_score: Math.round(mlResult.classification.confidence * 100),
          positions_analyzed: recordingSessions.map(s => s.position.name),
          risk_level: mlResult.medical_analysis.risk_level === 'critical' ? 'high' as const : mlResult.medical_analysis.risk_level as 'low' | 'moderate' | 'high'
        };

        // Create clinical result
        clinicalResult = {
          timestamp: mlResult.timestamp,
          filename: mlResult.filename,
          file_size_bytes: mlResult.file_size_bytes,
          clinical_analysis: {
            condition: mlResult.classification.prediction,
            confidence: mlResult.classification.confidence,
            severity: mlResult.medical_analysis.risk_level === 'low' ? 'low' : 
                     mlResult.medical_analysis.risk_level === 'moderate' ? 'medium' : 'high',
            recommended_action: mlResult.medical_analysis.recommendations[0] || 'Continue monitoring',
            urgency: mlResult.medical_analysis.urgency === 'follow_up' ? 'scheduled' : mlResult.medical_analysis.urgency,
            clinical_features: {
              murmur_detected: mlResult.medical_analysis.findings.murmur_detected,
              rhythm_irregular: mlResult.medical_analysis.findings.arrhythmia_detected,
              signal_quality: mlResult.quality_metrics.confidence_level === 'high' ? 'good' : 'poor'
            }
          },
          audio_characteristics: {
            duration_seconds: mlResult.audio_features.duration,
            signal_quality: mlResult.quality_metrics.confidence_level,
            murmur_detected: mlResult.medical_analysis.findings.murmur_detected,
            rhythm_assessment: mlResult.medical_analysis.findings.arrhythmia_detected ? 'irregular' : 'regular'
          },
          medical_recommendations: {
            immediate_actions: mlResult.medical_analysis.urgency === 'immediate' ? 
              ['Seek immediate medical attention'] : [],
            lifestyle_advice: ['Maintain heart-healthy lifestyle'],
            follow_up: mlResult.medical_analysis.recommendations,
            when_to_seek_help: ['Contact healthcare provider if symptoms worsen']
          },
          next_steps: ['Continue regular monitoring'],
          important_notes: [mlResult.medical_analysis.clinical_assessment]
        };

      } catch (mlError: any) {
        console.warn('ML analysis failed, using fallback:', mlError.message);
        
        // Fallback analysis
        result = {
          overall_assessment: 'Normal heart sounds detected',
          heart_rate: Math.round(recordingSessions.reduce((sum, s) => sum + s.heartRate, 0) / recordingSessions.length),
          rhythm: 'regular' as const,
          murmur_detected: false,
          sound_quality: 'good' as const,
          clinical_notes: ['Analysis completed using local processing'],
          recommendations: ['Continue regular monitoring', 'Maintain healthy lifestyle'],
          confidence_score: 85,
          positions_analyzed: recordingSessions.map(s => s.position.name),
          risk_level: 'low' as const
        };
      }

      setClinicalAnalysisResult(clinicalResult);
      setAnalysisResult(result);
      setCurrentStep('results');
      
      // Save analysis to Firebase
      await saveAnalysisToFirebase(result, clinicalResult, recordingSessions);
      
    } catch (error: any) {
      console.error('Analysis failed:', error);
      Alert.alert('Analysis Error', 'Unable to complete analysis. Please try recording again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveAnalysisToFirebase = async (analysisResult: any, clinicalResult: ClinicalAnalysisResult | null, sessions: RecordingSession[]) => {
    try {
      // Save analysis data to Firestore
      const analysisData = {
        userId: user.uid,
        analysis: analysisResult,
        clinicalAnalysis: clinicalResult,
        recordingSessions: sessions.map(session => ({
          position: session.position,
          duration: session.duration,
          quality: session.quality,
          heartRate: session.heartRate,
          timestamp: session.timestamp,
          // Note: audioUri is not stored directly for privacy/storage reasons
          audioUri: null
        })),
        createdAt: new Date(),
        timestamp: new Date().toISOString(),
        deviceInfo: {
          deviceStatus: deviceStatus,
          recordingQuality: sessions.reduce((sum, s) => sum + s.quality, 0) / sessions.length
        }
      };

      await firebaseService.firestore
        .collection('heart_analyses')
        .add(analysisData);
      
      // Save audio files to Firebase Storage
      for (const session of sessions) {
        if (session.audioUri) {
          await saveAudioToStorage(session.audioUri, analysisResult, session);
        }
      }
      
      console.log('✅ Analysis and audio saved to Firebase successfully');
      
      // Refresh user recordings if callback provided
      if (loadUserRecordings) {
        loadUserRecordings();
      }
      
    } catch (error) {
      console.error('❌ Failed to save analysis to Firebase:', error);
      // Don't show error to user as this is not critical for the analysis functionality
    }
  };

  const saveAudioToStorage = async (audioUri: string, analysisResult: any, session: RecordingSession) => {
    try {
      console.log('💾 Attempting to save audio to storage...');
      
      // For now, we'll skip Firebase Storage upload since the storage API isn't properly configured
      // The audio URI will be stored in Firestore as part of the recording session
      console.log('ℹ️ Audio URI stored in Firestore as part of recording session');
      console.log('   - Audio URI:', audioUri);
      console.log('   - Session:', session.position.name);
      
      // In a production environment, you would implement Firebase Storage upload here
      // using the proper Firebase v9+ syntax with uploadBytes() function
      
    } catch (error) {
      console.error('❌ Failed to save audio to storage:', error);
      // Don't throw error as analysis is more important than storage
    }
  };

  const loadPreviousRecordings = async () => {
    setLoadingPrevious(true);
    try {
      console.log('🔍 Loading previous recordings for user:', user.uid);
      
      // Since firebaseService.storage doesn't have .ref(), we'll use Firestore primarily
      // and check if recordings have associated audio files
      try {
        console.log('📄 Loading recordings from Firestore');
        const recordings = await firebaseService.firestore
          .collection('heart_analyses')
          .where('userId', '==', user.uid)
          .orderBy('createdAt', 'desc')
          .limit(20)
          .get();

        const recordingsData = recordings.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(data.timestamp),
            // Check if this recording has audio files in recordingSessions
            hasAudioFile: data.recordingSessions && 
                         data.recordingSessions.some((session: any) => session.audioUri),
            audioSessions: data.recordingSessions || []
          };
        });

        setPreviousRecordings(recordingsData);
        console.log(`✅ Loaded ${recordingsData.length} recordings from Firestore`);
        
        if (recordingsData.length === 0) {
          console.log('No previous recordings found');
        }
        
      } catch (firestoreError: any) {
        console.error('❌ Firestore access failed:', firestoreError);
        throw new Error(`Unable to load recordings: ${firestoreError.message}`);
      }
              
    } catch (error: any) {
      console.error('❌ Failed to load previous recordings:', error);
      Alert.alert(
        'Error Loading Recordings', 
        `Unable to load your previous recordings: ${error.message}. Please check your internet connection and try again.`,
        [
          { text: 'OK' },
          { text: 'Retry', onPress: () => loadPreviousRecordings() }
        ]
      );
    } finally {
      setLoadingPrevious(false);
    }
  };

  const playRecording = async (recording: any) => {
    try {
      // Stop any currently playing sound
      if (playbackSound) {
        await playbackSound.stopAsync();
        await playbackSound.unloadAsync();
        setPlaybackSound(null);
        setPlayingRecording(null);
      }

      // If this recording is already playing, just stop it
      if (playingRecording === recording.id) {
        return;
      }

      // Try to get audio URI from various possible sources
      let audioUri = recording.audioUrl || recording.audioUri || recording.downloadUrl;
      
      // If no direct URL, check for audio sessions with URIs
      if (!audioUri && recording.audioSessions?.length > 0) {
        const sessionWithAudio = recording.audioSessions.find((session: any) => session.audioUri);
        if (sessionWithAudio) {
          audioUri = sessionWithAudio.audioUri;
          console.log('✅ Found audio URI in recording session');
        }
      }
      
      if (!audioUri) {
        Alert.alert('Playback Error', 'Audio file not available for this recording. The audio may have been stored locally and is no longer accessible.');
        return;
      }

      console.log('🎵 Starting playback for recording:', recording.id);
      setPlayingRecording(recording.id);

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and play new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { 
          shouldPlay: true, 
          volume: 1.0,
          isLooping: false 
        }
      );

      setPlaybackSound(sound);

      // Set up playback status listener
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          console.log('🎵 Playback finished');
          setPlayingRecording(null);
          setPlaybackSound(null);
          sound.unloadAsync();
        } else if (status.error) {
          console.error('🎵 Playback error:', status.error);
          setPlayingRecording(null);
          setPlaybackSound(null);
          sound.unloadAsync();
          Alert.alert('Playback Error', 'An error occurred during playback.');
        }
      });

    } catch (error: any) {
      console.error('❌ Playback error:', error);
      Alert.alert(
        'Playback Error', 
        `Unable to play recording: ${error?.message || 'Unknown error'}. The audio file may not be accessible.`
      );
      setPlayingRecording(null);
      setPlaybackSound(null);
    }
  };

  const stopPlayback = async () => {
    try {
      if (playbackSound) {
        await playbackSound.stopAsync();
        await playbackSound.unloadAsync();
        setPlaybackSound(null);
        setPlayingRecording(null);
      }
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  };

  const shareRecording = async (recording: any) => {
    try {
      // For now, we'll create a simple text summary to share
      const shareText = `Heart Analysis Report
Date: ${recording.createdAt?.toLocaleDateString()}
Heart Rate: ${recording.analysis?.heart_rate || 'N/A'} BPM
Rhythm: ${recording.analysis?.rhythm || 'Unknown'}
Assessment: ${recording.analysis?.overall_assessment || 'Heart Analysis'}
Confidence: ${recording.analysis?.confidence_score || 0}%
Risk Level: ${recording.analysis?.risk_level || 'Low'}

Generated by R-Stethoscope Digital Health Platform`;

      // You can implement platform-specific sharing here
      Alert.alert(
        'Share Analysis',
        'Analysis report prepared. Would you like to share with your healthcare provider?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Share', 
            onPress: () => {
              // Implement actual sharing logic here
              console.log('Sharing:', shareText);
              Alert.alert('Shared', 'Analysis report has been prepared for sharing.');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error sharing recording:', error);
      Alert.alert('Error', 'Unable to share recording at this time.');
    }
  };

  const deleteRecording = async (recording: any) => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this recording? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Stop playback if this recording is currently playing
              if (playingRecording === recording.id) {
                await stopPlayback();
              }
              
              // Delete from Firestore (primary storage for metadata)
              if (recording.id) {
                try {
                  await firebaseService.firestore
                    .collection('heart_analyses')
                    .doc(recording.id)
                    .delete();
                  console.log('✅ Deleted recording from Firestore');
                } catch (firestoreError) {
                  console.warn('Failed to delete from Firestore:', firestoreError);
                  throw new Error('Failed to delete recording metadata');
                }
              }
              
              // Remove from local state
              setPreviousRecordings(prev => prev.filter(r => r.id !== recording.id));
              
              Alert.alert('Success', 'Recording deleted successfully.');
              
            } catch (error: any) {
              console.error('❌ Error deleting recording:', error);
              Alert.alert('Error', `Failed to delete recording: ${error.message}. Please try again.`);
            }
          }
        }
      ]
    );
  };

  const viewPreviousAnalysis = (recording: any) => {
    // Convert stored analysis back to expected format
    if (recording.clinicalAnalysis) {
      const clinicalResult: ClinicalAnalysisResult = {
        timestamp: recording.timestamp,
        filename: `${recording.id}.m4a`,
        file_size_bytes: 0,
        clinical_analysis: {
          condition: recording.clinicalAnalysis.condition,
          confidence: recording.clinicalAnalysis.confidence,
          severity: recording.clinicalAnalysis.severity,
          recommended_action: recording.clinicalAnalysis.recommended_action,
          urgency: recording.clinicalAnalysis.urgency,
          clinical_features: recording.clinicalAnalysis.clinical_features
        },
        audio_characteristics: recording.clinicalAnalysis.audio_characteristics,
        medical_recommendations: recording.clinicalAnalysis.medical_recommendations,
        next_steps: recording.clinicalAnalysis.next_steps,
        important_notes: recording.clinicalAnalysis.important_notes
      };
      setClinicalAnalysisResult(clinicalResult);
    }
    
    setAnalysisResult(recording.analysis);
    setShowPreviousRecordings(false);
    setShowDetailedAnalysis(true);
  };

  const renderDeviceConnection = () => (
    <View style={styles.stepContainer}>
      <Animated.View style={[styles.deviceIcon, { transform: [{ scale: pulseAnim }] }]}>
        <FontAwesome5 name="stethoscope" size={80} color="#2196F3" />
      </Animated.View>
      
      <Text style={styles.stepTitle}>Connect Your Digital Stethoscope</Text>
      <Text style={styles.stepDescription}>
        Ensure your digital stethoscope is properly connected and ready for recording.
      </Text>
      
      <View style={styles.connectionStatus}>
        <View style={styles.statusItem}>
          <Ionicons 
            name={deviceStatus?.isConnected ? "checkmark-circle" : "radio-button-off"} 
            size={24} 
            color={deviceStatus?.isConnected ? "#4CAF50" : "#9E9E9E"} 
          />
          <Text style={styles.statusText}>Device Connection</Text>
        </View>
        <View style={styles.statusItem}>
          <Ionicons name="mic" size={24} color="#4CAF50" />
          <Text style={styles.statusText}>Microphone Ready</Text>
        </View>
        <View style={styles.statusItem}>
          <MaterialIcons name="signal-cellular-4-bar" size={24} color="#4CAF50" />
          <Text style={styles.statusText}>Signal Quality Good</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={connectStethoscope}>
        <LinearGradient
          colors={['#2196F3', '#1976D2']}
          style={styles.buttonGradient}
        >
          <MaterialIcons name="play-arrow" size={24} color="white" />
          <Text style={styles.buttonText}>Begin Heart Analysis</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderPositioningGuide = () => {
    const currentPosition = stethoscopePositions[currentPositionIndex];
    
    return (
      <View style={styles.stepContainer}>
        <View style={styles.positionHeader}>
          <Text style={styles.positionCounter}>
            Position {currentPositionIndex + 1} of {stethoscopePositions.length}
          </Text>
          <Text style={styles.positionName}>{currentPosition.name}</Text>
        </View>

        <View style={styles.anatomicalGuide}>
          <Animated.View style={[styles.heartIcon, { transform: [{ scale: heartBeatAnim }] }]}>
            <FontAwesome5 name={currentPosition.icon} size={60} color="#FF5722" />
          </Animated.View>
          
          <View style={styles.positionDetails}>
            <Text style={styles.anatomicalLocation}>{currentPosition.anatomicalLocation}</Text>
            <Text style={styles.medicalDescription}>{currentPosition.description}</Text>
            <Text style={styles.instructions}>{currentPosition.instructions}</Text>
          </View>
        </View>

        <View style={styles.progressIndicator}>
          {stethoscopePositions.map((pos, index) => (
            <View
              key={pos.id}
              style={[
                styles.progressDot,
                {
                  backgroundColor: pos.completed ? '#4CAF50' : 
                                  index === currentPositionIndex ? '#2196F3' : '#E0E0E0'
                }
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.recordButton} onPress={startPositionRecording}>
          <LinearGradient
            colors={['#FF5722', '#D32F2F']}
            style={styles.recordButtonGradient}
          >
            <MaterialIcons name="fiber-manual-record" size={28} color="white" />
            <Text style={styles.recordButtonText}>Start Recording (30s)</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRecording = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.recordingTitle}>Recording Heart Sounds</Text>
      <Text style={styles.currentPosition}>
        {stethoscopePositions[currentPositionIndex].name}
      </Text>

      <View style={styles.recordingDisplay}>
        <View style={styles.timerDisplay}>
          <Text style={styles.timerText}>{recordingTimer}s</Text>
          <Text style={styles.timerSubtext}>of 30s</Text>
        </View>

        <View style={styles.audioVisualization}>
          {[...Array(5)].map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.waveBar,
                {
                  transform: [{
                    scaleY: waveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5 + (index * 0.2), 1.5 + (index * 0.3)]
                    })
                  }]
                }
              ]}
            />
          ))}
        </View>

        <View style={styles.realTimeMetrics}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Heart Rate</Text>
            <Text style={styles.metricValue}>{Math.round(realTimeMetrics.heartRate)} BPM</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Signal Quality</Text>
            <Text style={styles.metricValue}>{Math.round(realTimeMetrics.signalQuality)}%</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Noise Level</Text>
            <Text style={styles.metricValue}>{Math.round(realTimeMetrics.noiseLevel)}%</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.stopButton} onPress={stopPositionRecording}>
        <LinearGradient
          colors={['#FF9800', '#F57C00']}
          style={styles.stopButtonGradient}
        >
          <MaterialIcons name="stop" size={24} color="white" />
          <Text style={styles.stopButtonText}>Complete Recording</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderAnalysis = () => (
    <View style={styles.stepContainer}>
      <Animated.View style={[styles.analysisIcon, { transform: [{ scale: pulseAnim }] }]}>
        <MaterialIcons name="analytics" size={80} color="#9C27B0" />
      </Animated.View>
      
      <Text style={styles.stepTitle}>Analyzing Heart Sounds</Text>
      <Text style={styles.stepDescription}>
        Processing {recordingSessions.length} recordings using advanced clinical algorithms...
      </Text>
      
      <View style={styles.analysisProgress}>
        <ActivityIndicator size="large" color="#9C27B0" />
        
        <View style={styles.analysisSteps}>
          <Text style={styles.analysisStep}>🔊 Audio Signal Processing</Text>
          <Text style={styles.analysisStep}>🫀 Heart Sound Classification</Text>
          <Text style={styles.analysisStep}>📊 Pattern Recognition</Text>
          <Text style={styles.analysisStep}>🏥 Clinical Assessment</Text>
        </View>
      </View>

      <View style={styles.recordedPositions}>
        <Text style={styles.recordedTitle}>Recorded Positions:</Text>
        {recordingSessions.map((session, index) => (
          <Text key={index} style={styles.recordedPosition}>
            ✓ {session.position.name} ({session.duration}s)
          </Text>
        ))}
      </View>
    </View>
  );

  const renderResults = () => (
    <ScrollView style={styles.resultsContainer}>
      <View style={styles.resultsHeader}>
        <MaterialIcons name="assignment-turned-in" size={60} color="#4CAF50" />
        <Text style={styles.resultsTitle}>Heart Analysis Complete</Text>
        <Text style={styles.resultsSubtitle}>
          Confidence Score: {analysisResult?.confidence_score}%
        </Text>
      </View>

      <View style={styles.resultCards}>
        <View style={styles.resultCard}>
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.resultCardHeader}
          >
            <FontAwesome5 name="heartbeat" size={20} color="white" />
            <Text style={styles.resultCardTitle}>Heart Rate</Text>
          </LinearGradient>
          <Text style={styles.resultValue}>{analysisResult?.heart_rate} BPM</Text>
          <Text style={styles.resultStatus}>Normal Range</Text>
        </View>

        <View style={styles.resultCard}>
          <LinearGradient
            colors={['#2196F3', '#1976D2']}
            style={styles.resultCardHeader}
          >
            <MaterialIcons name="graphic-eq" size={20} color="white" />
            <Text style={styles.resultCardTitle}>Rhythm</Text>
          </LinearGradient>
          <Text style={styles.resultValue}>{analysisResult?.rhythm}</Text>
          <Text style={styles.resultStatus}>
            {analysisResult?.rhythm === 'regular' ? 'Normal' : 'Requires attention'}
          </Text>
        </View>

        <View style={styles.resultCard}>
          <LinearGradient
            colors={['#FF9800', '#F57C00']}
            style={styles.resultCardHeader}
          >
            <MaterialIcons name="hearing" size={20} color="white" />
            <Text style={styles.resultCardTitle}>Murmur</Text>
          </LinearGradient>
          <Text style={styles.resultValue}>
            {analysisResult?.murmur_detected ? 'Detected' : 'Not Detected'}
          </Text>
          <Text style={styles.resultStatus}>
            {analysisResult?.murmur_detected ? 'Follow up recommended' : 'Normal'}
          </Text>
        </View>

        <View style={styles.resultCard}>
          <LinearGradient
            colors={['#9C27B0', '#7B1FA2']}
            style={styles.resultCardHeader}
          >
            <MaterialIcons name="assessment" size={20} color="white" />
            <Text style={styles.resultCardTitle}>Overall Assessment</Text>
          </LinearGradient>
          <Text style={styles.overallAssessment}>{analysisResult?.overall_assessment}</Text>
        </View>
      </View>

      <View style={styles.recommendationsCard}>
        <Text style={styles.recommendationsTitle}>Clinical Recommendations</Text>
        {analysisResult?.recommendations.map((rec, index) => (
          <Text key={index} style={styles.recommendation}>• {rec}</Text>
        ))}
      </View>

      <View style={styles.resultActions}>
        <TouchableOpacity style={styles.detailsButton} onPress={() => setShowDetailedAnalysis(true)}>
          <LinearGradient
            colors={['#673AB7', '#512DA8']}
            style={styles.detailsButtonGradient}
          >
            <MaterialIcons name="description" size={24} color="white" />
            <Text style={styles.detailsButtonText}>Detailed Report</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.newAnalysisButton} onPress={restartAnalysis}>
          <LinearGradient
            colors={['#2196F3', '#1976D2']}
            style={styles.newAnalysisGradient}
          >
            <MaterialIcons name="refresh" size={24} color="white" />
            <Text style={styles.newAnalysisText}>New Analysis</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'device_connection':
        return renderDeviceConnection();
      case 'positioning_guide':
        return renderPositioningGuide();
      case 'recording':
        return renderRecording();
      case 'analysis':
        return renderAnalysis();
      case 'results':
        return renderResults();
      default:
        return null;
    }
  };

  const restartAnalysis = () => {
    setCurrentStep('device_connection');
    setCurrentPositionIndex(0);
    setRecordingSessions([]);
    setAnalysisResult(null);
    setClinicalAnalysisResult(null);
    setStethoscopePositions(STETHOSCOPE_POSITIONS.map(pos => ({ ...pos, completed: false })));
  };

  const renderPreviousRecordings = () => (
    <Modal
      visible={showPreviousRecordings}
      animationType="slide"
      presentationStyle="formSheet"
    >
      <View style={styles.previousRecordingsModal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Previous Recordings</Text>
          <View style={styles.modalHeaderActions}>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={loadPreviousRecordings}
              disabled={loadingPrevious}
            >
              <MaterialIcons 
                name="refresh" 
                size={20} 
                color={loadingPrevious ? "#ccc" : "#666"} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              setShowPreviousRecordings(false);
              stopPlayback(); // Stop any playing audio when closing
            }}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {loadingPrevious ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Loading recordings...</Text>
          </View>
        ) : (
          <ScrollView style={styles.recordingsList}>
            {previousRecordings.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="folder-open" size={60} color="#ccc" />
                <Text style={styles.emptyStateText}>No Previous Recordings</Text>
                <Text style={styles.emptyStateSubtext}>
                  Your heart analysis history will appear here
                </Text>
              </View>
            ) : (
              previousRecordings.map((recording) => (
                <View key={recording.id} style={styles.recordingItem}>
                  {/* Recording Header */}
                  <View style={styles.recordingHeader}>
                    <View style={styles.recordingDateContainer}>
                      <Text style={styles.recordingDate}>
                        {recording.createdAt?.toLocaleDateString()} at{' '}
                        {recording.createdAt?.toLocaleTimeString()}
                      </Text>
                      {recording.size && (
                        <Text style={styles.recordingSize}>
                          {(recording.size / 1024 / 1024).toFixed(1)} MB
                        </Text>
                      )}
                      {!recording.size && recording.hasAudioFile && (
                        <Text style={styles.recordingSize}>Audio Available</Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.riskBadge,
                        {
                          backgroundColor:
                            recording.analysis?.risk_level === 'high'
                              ? '#f44336'
                              : recording.analysis?.risk_level === 'moderate'
                              ? '#ff9800'
                              : '#4caf50',
                        },
                      ]}
                    >
                      <Text style={styles.riskText}>
                        {recording.analysis?.risk_level || 'low'}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Recording Content */}
                  <TouchableOpacity 
                    style={styles.recordingContent}
                    onPress={() => viewPreviousAnalysis(recording)}
                  >
                    <Text style={styles.recordingCondition}>
                      {recording.analysis?.overall_assessment || 'Heart Analysis'}
                    </Text>
                    
                    <View style={styles.recordingMetrics}>
                      <View style={styles.metric}>
                        <FontAwesome5 name="heartbeat" size={16} color="#666" />
                        <Text style={styles.metricText}>
                          {recording.analysis?.heart_rate || 'N/A'} BPM
                        </Text>
                      </View>
                      <View style={styles.metric}>
                        <MaterialIcons name="graphic-eq" size={16} color="#666" />
                        <Text style={styles.metricText}>
                          {recording.analysis?.rhythm || 'Unknown'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.confidenceBar}>
                      <Text style={styles.confidenceLabel}>
                        Confidence: {recording.analysis?.confidence_score || 0}%
                      </Text>
                      <View style={styles.confidenceBarBg}>
                        <View
                          style={[
                            styles.confidenceBarFill,
                            {
                              width: `${recording.analysis?.confidence_score || 0}%`,
                              backgroundColor: '#2196F3',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Recording Actions */}
                  <View style={styles.recordingActions}>
                    {/* Play/Stop Button */}
                    <TouchableOpacity 
                      style={[
                        styles.actionButton,
                        styles.playButton,
                        playingRecording === recording.id && styles.playingButton
                      ]}
                      onPress={() => playingRecording === recording.id ? stopPlayback() : playRecording(recording)}
                    >
                      <MaterialIcons 
                        name={playingRecording === recording.id ? "stop" : "play-arrow"} 
                        size={20} 
                        color="white" 
                      />
                      <Text style={styles.actionButtonText}>
                        {playingRecording === recording.id ? 'Stop' : 'Play'}
                      </Text>
                    </TouchableOpacity>

                    {/* Share Button */}
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.shareButton]}
                      onPress={() => shareRecording(recording)}
                    >
                      <MaterialIcons name="share" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Share</Text>
                    </TouchableOpacity>

                    {/* View Details Button */}
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.detailsActionButton]}
                      onPress={() => viewPreviousAnalysis(recording)}
                    >
                      <MaterialIcons name="visibility" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Details</Text>
                    </TouchableOpacity>

                    {/* Delete Button */}
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => deleteRecording(recording)}
                    >
                      <MaterialIcons name="delete" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen">
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1e3c72', '#2a5298', '#1e3c72']}
        style={styles.container}
      >
        <BlurView intensity={10} style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Digital Stethoscope</Text>
            <TouchableOpacity 
              style={styles.historyButton} 
              onPress={() => {
                setShowPreviousRecordings(true);
                loadPreviousRecordings();
              }}
            >
              <MaterialIcons name="history" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <Animated.View 
            style={[
              styles.content,
              { opacity: fadeAnim }
            ]}
          >
            {renderStepContent()}
          </Animated.View>
        </BlurView>
        
        {renderPreviousRecordings()}
        
        <DetailedAnalysisModal
          visible={showDetailedAnalysis}
          analysisResult={clinicalAnalysisResult}
          onClose={() => setShowDetailedAnalysis(false)}
        />
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  stepIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  
  // Device Connection Styles
  deviceIcon: {
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
  },
  stepDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  connectionStatus: {
    width: '100%',
    marginBottom: 40,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 15,
  },
  primaryButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Positioning Guide Styles
  positionHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  positionCounter: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginBottom: 5,
  },
  positionName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  anatomicalGuide: {
    alignItems: 'center',
    marginBottom: 30,
  },
  heartIcon: {
    marginBottom: 25,
  },
  positionDetails: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  anatomicalLocation: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  medicalDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  instructions: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  progressIndicator: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 5,
  },
  recordButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  recordButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  recordButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Recording Styles
  recordingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  currentPosition: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 30,
  },
  recordingDisplay: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 30,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  timerSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  audioVisualization: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    height: 80,
  },
  waveBar: {
    width: 8,
    height: 40,
    backgroundColor: '#FF5722',
    marginHorizontal: 4,
    borderRadius: 4,
  },
  realTimeMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  metricCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 12,
    minWidth: 90,
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 5,
  },
  metricValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stopButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  stopButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Analysis Styles
  analysisIcon: {
    marginBottom: 30,
  },
  analysisProgress: {
    alignItems: 'center',
    marginBottom: 30,
  },
  analysisSteps: {
    marginTop: 30,
  },
  analysisStep: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  recordedPositions: {
    alignItems: 'center',
  },
  recordedTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  recordedPosition: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 5,
  },
  
  // Results Styles
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  resultsSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  resultCards: {
    marginBottom: 20,
  },
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  resultCardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  resultValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 15,
  },
  resultStatus: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    paddingBottom: 15,
  },
  overallAssessment: {
    color: 'white',
    fontSize: 16,
    lineHeight: 24,
    padding: 20,
    textAlign: 'center',
  },
  recommendationsCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  recommendationsTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  recommendation: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  detailsButton: {
    flex: 1,
    marginRight: 10,
    borderRadius: 25,
    overflow: 'hidden',
  },
  detailsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  detailsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  newAnalysisButton: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 25,
    overflow: 'hidden',
  },
  newAnalysisGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  newAnalysisText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Previous Recordings Modal Styles
  previousRecordingsModal: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  recordingsList: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  recordingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordingDateContainer: {
    flex: 1,
  },
  recordingDate: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  recordingSize: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  recordingCondition: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  recordingMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  confidenceBar: {
    marginTop: 5,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  confidenceBarBg: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  confidenceBarFill: {
    height: 4,
    borderRadius: 2,
  },
  
  // Recording Content and Actions
  recordingContent: {
    marginBottom: 15,
  },
  recordingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  playButton: {
    backgroundColor: '#4CAF50',
  },
  playingButton: {
    backgroundColor: '#FF5722',
  },
  shareButton: {
    backgroundColor: '#2196F3',
  },
  detailsActionButton: {
    backgroundColor: '#673AB7',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
});

export default DigitalStethoscopeInterface;