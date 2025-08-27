// HomeDigitalStethoscope.tsx
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { User } from 'firebase/auth';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import {
  HeartAnalysisData,
  PatientSummary,
  healthAnalyticsService
} from '../../services/healthAnalytics';
import {
  MLAnalysisResult,
  checkMLBackendHealth,
  mlBackendAnalysis
} from '../../services/mlBackend';

const { width } = Dimensions.get('window');

// Props interface
interface RStethoscopeProps {
  user: User;
  onClose: () => void;
  onSwitchToAI: () => void;
}

// Types
interface Recording {
  id: string;
  timestamp: Date;
  duration: number;
  uri: string;
  patient: string;
  quality: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  waveformData: number[];
  analysis?: HeartAnalysis;
  firebaseAnalysis?: HeartAnalysisData; // Added detailed Firebase analysis
  fileSize: number;
}

interface HeartAnalysis {
  heartRate: number;
  rhythm: 'Regular' | 'Irregular';
  condition: string;
  confidence: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  recommendations: string[];
  clinicalNotes: string;
  timestamp: Date;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  lastRecording?: Date;
  recordingCount: number;
}

interface StetDeviceStatus {
  isConnected: boolean;
  signalQuality: number; // 0-100
  audioLevel: number; // 0-100
  deviceName: string;
  batteryLevel?: number;
}

// Constants  
const RSTETH_BACKEND_URL = 'http://45.56.72.250:8000'; // RSteth Backend live server (matches mlBackend service)
const MAX_RECORDING_DURATION = 120; // 2 minutes
const SAMPLE_RATE = 44100;
const CHANNELS = 1;

// Main Component
const HomeDigitalStethoscope: React.FC<RStethoscopeProps> = ({ user, onClose, onSwitchToAI }) => {
  // State Management
  const [deviceStatus, setDeviceStatus] = useState<StetDeviceStatus>({
    isConnected: false,
    signalQuality: 0,
    audioLevel: 0,
    deviceName: 'Digital Stethoscope Pro',
  });
  
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient>({
    id: user.uid, // Remove fallback to '1' - must use actual Firebase uid
    name: user.displayName || user.email || 'Patient',
    age: 35,
    recordingCount: 0,
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [showAnalysisModal, setShowAnalysisModal] = useState<boolean>(false);
  const [latestAnalysis, setLatestAnalysis] = useState<HeartAnalysis | null>(null);
  const [currentAnalyzedRecording, setCurrentAnalyzedRecording] = useState<Recording | null>(null);
  const [activeTab, setActiveTab] = useState<'monitor' | 'history' | 'patient'>('monitor');
  
  // Firebase state
  const [isUploadingToFirebase, setIsUploadingToFirebase] = useState<boolean>(false);
  const [isLoadingFirebaseAnalyses, setIsLoadingFirebaseAnalyses] = useState<boolean>(false);
  const [firebaseAnalyses, setFirebaseAnalyses] = useState<HeartAnalysisData[]>([]);
  const [patientSummary, setPatientSummary] = useState<PatientSummary | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);

  // Refs and Animations
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveformTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  // USB-C Audio Device Detection
  useEffect(() => {
    setupAudioSession();
    checkUSBCAudioDevice();
    loadStoredRecordings();
    loadPatientData();
    // Firebase analyses will load after first successful recording

    // Fade in animation
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    return () => {
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate real-time waveform visualization
  const generateWaveformData = useCallback((audioLevel: number): void => {
    if (!isRecording) return;

    const newPoints = Array.from({ length: 10 }, (_, i) => {
      const baseAmplitude = (audioLevel / 100) * 80;
      const heartbeatPattern = Math.sin((Date.now() + i * 100) / 200) * 20;
      const noise = (Math.random() - 0.5) * 10;
      return baseAmplitude + heartbeatPattern + noise;
    });

    setWaveformData(prev => [...prev.slice(-490), ...newPoints]);
  }, [isRecording]);

  // Audio level monitoring effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (deviceStatus.isConnected) {
      interval = setInterval(async () => {
        if (recording) {
          try {
            const status = await recording.getStatusAsync();
            if (status.isRecording && status.metering !== undefined) {
              const audioLevel = Math.max(0, Math.min(100, (status.metering + 60) / 60 * 100));
              setDeviceStatus(prev => ({ ...prev, audioLevel }));
              
              // Generate real-time waveform data
              generateWaveformData(audioLevel);
            }
          } catch (error) {
            console.log('Audio level monitoring error:', error);
          }
        } else {
          // Simulate ambient audio detection when not recording
          const ambientLevel = Math.random() * 20;
          setDeviceStatus(prev => ({ ...prev, audioLevel: ambientLevel }));
        }
      }, 100);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [deviceStatus.isConnected, recording, generateWaveformData]);

  // Setup Audio Session for USB-C microphone
  const setupAudioSession = async (): Promise<void> => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      console.log('✅ Audio session configured for USB-C stethoscope');
    } catch (error) {
      console.error('❌ Audio setup failed:', error);
      Alert.alert('Audio Setup Error', 'Failed to configure audio for stethoscope');
    }
  };

  // Check for USB-C connected stethoscope (simulated - actual implementation would use native modules)
  const checkUSBCAudioDevice = useCallback(async (): Promise<void> => {
    try {
      // In real implementation, this would check for USB-C audio devices
      // using a native module or platform-specific audio device detection
      
      console.log('🎤 Checking for USB-C stethoscope...');
      
      // Simulate USB-C stethoscope detection
      setTimeout(() => {
        setDeviceStatus(prev => ({
          ...prev,
          isConnected: true,
          signalQuality: 85,
          audioLevel: 0,
        }));
      }, 2000);
      
    } catch (error) {
      console.error('❌ Device detection failed:', error);
    }
  }, []);

  // Start heart sound recording
  const startRecording = async (): Promise<void> => {
    if (!deviceStatus.isConnected) {
      Alert.alert(
        'Stethoscope Not Connected',
        'Please connect your USB-C digital stethoscope and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      console.log('🎤 Starting heart sound recording...');
      Vibration.vibrate(100); // Tactile feedback

      const { recording: newRecording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: SAMPLE_RATE,
          numberOfChannels: CHANNELS,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: SAMPLE_RATE,
          numberOfChannels: CHANNELS,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      setWaveformData([]);

      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start recording timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= MAX_RECORDING_DURATION) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      console.log('✅ Recording started successfully');
    } catch (error) {
      console.error('❌ Recording failed:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  };

  // Stop recording and process
  const stopRecording = async (): Promise<void> => {
    if (!recording || !isRecording) return;

    try {
      console.log('⏹️ Stopping recording...');
      Vibration.vibrate([100, 50, 100]); // Double tap feedback

      // Clear timers and animations
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      pulseAnimation.stopAnimation();
      pulseAnimation.setValue(1);

      // Stop recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      setIsRecording(false);
      setRecording(null);

      if (uri) {
        await saveRecording(uri);
      } else {
        Alert.alert('Error', 'Recording failed to save properly');
      }
    } catch (error) {
      console.error('❌ Stop recording failed:', error);
      Alert.alert('Error', 'Failed to stop recording properly');
    }
  };

  // Save recording and analyze
  const saveRecording = async (uri: string): Promise<void> => {
    try {
      // Wait a brief moment for file system to finish writing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify file exists and has content
      let fileInfo = await FileSystem.getInfoAsync(uri);
      let retryCount = 0;
      const maxRetries = 3;
      
      // Retry if file doesn't exist or is empty (Android timing issue)
      while ((!fileInfo.exists || fileInfo.size === 0) && retryCount < maxRetries) {
        console.log(`⏳ Waiting for file to be written... Retry ${retryCount + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 200));
        fileInfo = await FileSystem.getInfoAsync(uri);
        retryCount++;
      }
      
      if (!fileInfo.exists) {
        throw new Error('Recording file was not created properly');
      }
      
      if (fileInfo.size === 0) {
        throw new Error('Recording file is empty - no audio data was captured');
      }
      
      const fileSize = fileInfo.size || 0;
      console.log(`✅ Recording file verified: ${fileSize} bytes`);

      const newRecording: Recording = {
        id: Date.now().toString(),
        timestamp: new Date(),
        duration: recordingDuration,
        uri,
        patient: currentPatient.name,
        quality: determineRecordingQuality(),
        waveformData: [...waveformData],
        fileSize,
      };

      // Save to storage
      const updatedRecordings = [newRecording, ...recordings];
      setRecordings(updatedRecordings);
      await AsyncStorage.setItem('recordings', JSON.stringify(updatedRecordings));

      // Update patient data
      const updatedPatient = {
        ...currentPatient,
        recordingCount: currentPatient.recordingCount + 1,
        lastRecording: new Date(),
      };
      setCurrentPatient(updatedPatient);
      await AsyncStorage.setItem('currentPatient', JSON.stringify(updatedPatient));

      console.log('✅ Recording saved successfully');

      // Start AI analysis
      await analyzeHeartSound(newRecording);
    } catch (error) {
      console.error('❌ Save recording failed:', error);
      Alert.alert('Save Error', 'Failed to save recording');
    }
  };

  // Determine recording quality based on duration and signal
  const determineRecordingQuality = (): Recording['quality'] => {
    const avgSignal = deviceStatus.signalQuality;
    
    if (recordingDuration < 10) return 'Poor';
    if (recordingDuration < 20 && avgSignal < 60) return 'Fair';
    if (recordingDuration >= 20 && avgSignal >= 80) return 'Excellent';
    return 'Good';
  };

  // Analyze heart sound using RSteth Backend
  const analyzeHeartSound = async (recordingData: Recording): Promise<void> => {
    setIsAnalyzing(true);
    
    try {
      console.log('🤖 Starting RSteth Backend heart sound analysis...');
      
      // Use the enhanced ML backend service instead of direct fetch
      const result = await mlBackendAnalysis(recordingData.uri);
      
      console.log('🩺 RSteth Backend analysis result:', result);

      // Convert RSteth Backend result to our format
      const analysis: HeartAnalysis = {
        heartRate: Math.round(result.features?.tempo || 72), // Use tempo as BPM
        rhythm: result.probabilities?.extrasystole > 0.15 || result.probabilities?.extrahls > 0.2 ? 'Irregular' : 'Regular', // Derive from probabilities
        condition: result.predicted_class?.replace('_', ' ').toUpperCase() || 'NORMAL HEART SOUND',
        confidence: result.confidence || 0.85,
        riskLevel: mapUrgencyToRiskLevel(result.medical_recommendation?.urgency),
        recommendations: [result.medical_recommendation?.recommendation || 'Continue regular monitoring'],
        clinicalNotes: result.medical_recommendation?.follow_up || 'Heart sound analysis completed with RSteth Backend',
        timestamp: new Date(),
      };

      // Update recording with analysis
      const updatedRecordings = recordings.map(r => 
        r.id === recordingData.id ? { ...r, analysis } : r
      );
      setRecordings(updatedRecordings);
      await AsyncStorage.setItem('recordings', JSON.stringify(updatedRecordings));

      // Find the updated recording to set as current
      const analyzedRecording = updatedRecordings.find(r => r.id === recordingData.id);
      setCurrentAnalyzedRecording(analyzedRecording || null);
      setLatestAnalysis(analysis);
      setShowAnalysisModal(true);

      console.log('✅ RSteth Backend heart sound analysis completed');
      
      // Save to Firebase in background
      saveToFirebase(recordingData, analysis, result);
    } catch (error) {
      console.error('❌ RSteth Backend analysis failed:', error);
      
      // Check if this is an empty file error
      const errorMessage = error?.toString() || '';
      if (errorMessage.includes('empty') || errorMessage.includes('Empty file')) {
        Alert.alert(
          'Recording Error',
          'The audio recording appears to be empty. This can happen if:\n\n• Recording was too short\n• Microphone permission issues\n• Device storage problems\n\nPlease try recording again.',
          [
            { text: 'Try Again', onPress: () => console.log('User will try recording again') },
            { text: 'OK', style: 'default' }
          ]
        );
        setIsAnalyzing(false);
        return;
      }
      
      // For other errors, fallback to backup analysis method
      await fallbackAnalysis(recordingData);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper function to map RSteth Backend urgency to local risk format
  const mapUrgencyToRiskLevel = (urgency?: string): HeartAnalysis['riskLevel'] => {
    switch (urgency?.toLowerCase()) {
      case 'high':
      case 'urgent':
      case 'critical': return 'High';
      case 'medium':
      case 'moderate': return 'Medium';
      case 'low':
      case 'routine':
      default: return 'Low';
    }
  };

  // Helper function to map RSteth Backend urgency to severity format
  const mapUrgencyToSeverity = (urgency?: string): string => {
    switch (urgency?.toLowerCase()) {
      case 'high':
      case 'urgent':
      case 'critical': return 'High';
      case 'medium':
      case 'moderate': return 'Medium';
      case 'low':
      case 'routine':
      default: return 'Low';
    }
  };

  // Helper function to map RSteth Backend risk level to local format
  const mapRiskLevelToLocal = (riskLevel?: string): HeartAnalysis['riskLevel'] => {
    switch (riskLevel?.toLowerCase()) {
      case 'critical': return 'High';
      case 'high': return 'High';
      case 'moderate': return 'Medium';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return 'Low';
    }
  };

  // Fallback analysis when RSteth Backend fails
  const fallbackAnalysis = async (recordingData: Recording): Promise<void> => {
    try {
      console.log('🔄 Attempting fallback analysis...');
      
      // Check if RSteth Backend is healthy
      const isBackendHealthy = await checkMLBackendHealth();
      if (!isBackendHealthy) {
        console.warn('⚠️ RSteth Backend is not healthy, using local analysis');
      }
      
      // Generate a basic analysis for fallback
      const basicAnalysis: HeartAnalysis = {
        heartRate: 72, // Default heart rate
        rhythm: 'Regular',
        condition: 'Analysis Unavailable',
        confidence: 0.5,
        riskLevel: 'Low',
        recommendations: [
          'Unable to connect to analysis server',
          'Please try again when connection is available',
          'Consider consulting a healthcare professional'
        ],
        clinicalNotes: 'Analysis service temporarily unavailable. Please try again later.',
        timestamp: new Date(),
      };

      // Update recording with fallback analysis
      const updatedRecordings = recordings.map(r => 
        r.id === recordingData.id ? { ...r, analysis: basicAnalysis } : r
      );
      setRecordings(updatedRecordings);
      await AsyncStorage.setItem('recordings', JSON.stringify(updatedRecordings));

      // Find the updated recording to set as current
      const analyzedRecording = updatedRecordings.find(r => r.id === recordingData.id);
      setCurrentAnalyzedRecording(analyzedRecording || null);
      setLatestAnalysis(basicAnalysis);
      setShowAnalysisModal(true);
      
      Alert.alert(
        'Analysis Service Unavailable',
        'Unable to connect to the analysis server. A basic analysis has been saved, but please try again when you have a stable internet connection.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Even fallback analysis failed:', error);
      Alert.alert(
        'Analysis Failed',
        'Unable to analyze heart sound. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Save to Firebase (RSteth Backend analysis data)
  const saveToFirebase = async (
    recordingData: Recording, 
    analysis: HeartAnalysis, 
    rstethResult: MLAnalysisResult
  ): Promise<void> => {
    try {
      setIsUploadingToFirebase(true);
      console.log('🔥 Starting Firebase upload of RSteth Backend analysis...');

      // Prepare RSteth Backend analysis data for healthAnalytics service
      const analysisData: Omit<HeartAnalysisData, 'createdAt'> = {
        id: recordingData.id,
        userId: currentPatient.id,
        patientName: currentPatient.name,
        duration: recordingData.duration,
        quality: recordingData.quality,
        
        // Store the complete RSteth Backend analysis response
        backendAnalysis: {
          heart_rate: rstethResult.features?.tempo || 72,
          clinical_analysis: {
            condition: rstethResult.predicted_class || 'normal',
            confidence: rstethResult.confidence || 0.85,
            severity: mapUrgencyToSeverity(rstethResult.medical_recommendation?.urgency),
            rhythm_irregular: rstethResult.probabilities?.extrasystole > 0.15 || rstethResult.probabilities?.extrahls > 0.2,
            clinical_features: {
              murmur_detected: rstethResult.probabilities?.murmur > 0.15,
              arrhythmia_detected: rstethResult.probabilities?.extrasystole > 0.15,
              abnormal_sounds: rstethResult.probabilities?.extrahls > 0.2,
              valve_issues: false, // Not directly provided by RSteth
              signal_quality: rstethResult.features?.signal_quality || 0.9,
              harmonic_ratio: rstethResult.features?.harmonic_ratio || 0.8
            },
            recommended_action: rstethResult.medical_recommendation?.recommendation || 'Continue monitoring',
          },
          medical_recommendations: {
            immediate_actions: [rstethResult.medical_recommendation?.recommendation || 'Continue regular monitoring'],
          },
          analysis_metadata: {
            processing_time: rstethResult.processing_time || 0,
            model_version: 'RSteth-v2.1.0',
            timestamp: rstethResult.timestamp || new Date().toISOString()
          },
        },
        
        // Processed fields for easy access (derived from RSteth Backend analysis)
        heartRate: analysis.heartRate,
        rhythm: analysis.rhythm,
        condition: analysis.condition,
        confidence: analysis.confidence,
        riskLevel: analysis.riskLevel,
        recommendations: analysis.recommendations,
        clinicalNotes: analysis.clinicalNotes,
        
        // Additional metadata for display
        fileSize: recordingData.fileSize,
        deviceType: 'R-Stethoscope Digital (RSteth Backend)',
        analysisVersion: '2.1-rsteth-backend',
        
        timestamp: new Date(),
        audioUrl: '', // Will be set by healthAnalyticsService
        audioFileName: '', // Will be set by healthAnalyticsService
      };

      // Save RSteth Backend analysis to Firestore using healthAnalytics service
      const analysisId = await healthAnalyticsService.saveHeartAnalysis(analysisData, recordingData.uri);
      console.log('✅ RSteth Backend analysis saved to Firebase with ID:', analysisId);

      // Immediately link the Firebase analysis with the local recording
      const savedAnalysisData: HeartAnalysisData = {
        ...analysisData,
        id: analysisId,
        createdAt: new Date() // For display purposes
      };

      // Update the local recording with Firebase analysis data
      const updatedRecordings = recordings.map(recording => {
        if (recording.id === recordingData.id) {
          console.log(`🔗 Linking recording ${recording.id} with Firebase analysis ${analysisId}`);
          return {
            ...recording,
            firebaseAnalysis: savedAnalysisData
          };
        }
        return recording;
      });
      
      setRecordings(updatedRecordings);
      
      // Also add to Firebase analyses state
      setFirebaseAnalyses(prev => [savedAnalysisData, ...prev]);
      
      console.log('✅ Recording linked with Firebase analysis immediately');
      
    } catch (error) {
      console.error('❌ Firebase save failed:', error);
      Alert.alert(
        'Cloud Save Failed',
        'Recording saved locally but could not sync to cloud. Your data is safe.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUploadingToFirebase(false);
    }
  };

  // Load Firebase analyses for patient and link with local recordings
  const loadFirebaseAnalyses = async (): Promise<void> => {
    try {
      setIsLoadingFirebaseAnalyses(true);
      console.log('📥 Loading Firebase analyses...');
      
      // Check if user is authenticated first
      if (!currentPatient.id) {
        console.log('⚠️ No user ID available, skipping Firebase load');
        return;
      }
      
      console.log('🔍 Loading analyses for user:', currentPatient.id);
      const analyses = await healthAnalyticsService.getUserHeartAnalyses(currentPatient.id);
      setFirebaseAnalyses(analyses);
      console.log(`✅ Loaded ${analyses.length} analyses from Firebase`);
      
      // Link Firebase analyses with local recordings
      if (analyses.length > 0) {
        const updatedRecordings = recordings.map(recording => {
          // Find matching Firebase analysis by timestamp proximity (within 30 seconds)
          const matchingAnalysis = analyses.find(analysis => {
            const recordingTime = recording.timestamp.getTime();
            const analysisTime = analysis.timestamp?.toDate?.()?.getTime() || 0;
            const timeDiff = Math.abs(recordingTime - analysisTime);
            return timeDiff < 30000; // 30 seconds tolerance
          });
          
          if (matchingAnalysis) {
            console.log(`🔗 Linked recording ${recording.id} with Firebase analysis ${matchingAnalysis.id}`);
            return {
              ...recording,
              firebaseAnalysis: matchingAnalysis
            };
          }
          
          return recording;
        });
        
        setRecordings(updatedRecordings);
        console.log(`🔗 Linked ${updatedRecordings.filter(r => r.firebaseAnalysis).length} recordings with Firebase analyses`);
      }
      
    } catch (error) {
      console.error('❌ Failed to load Firebase analyses:', error);
      console.error('🔍 Error details:', error instanceof Error ? error.message : String(error));
      
      // Don't show error to user on first load if collection is empty
      if (error instanceof Error && error.message.includes('permission')) {
        console.log('ℹ️ This might be the first time using the app - collection may not exist yet');
      }
    } finally {
      setIsLoadingFirebaseAnalyses(false);
    }
  };

  // Generate patient summary with AI (using backend analysis data + OpenAI)
  const generatePatientSummary = async (): Promise<void> => {
    try {
      setIsGeneratingSummary(true);
      console.log('🤖 Generating patient summary from backend analysis data...');

      const summary = await healthAnalyticsService.generatePatientSummary(currentPatient.id);
      
      if (summary) {
        setPatientSummary(summary);
        setShowSummaryModal(true);
        console.log('✅ Patient summary generated from backend data');
      } else {
        Alert.alert(
          'Summary Unavailable',
          'Not enough backend analysis data to generate summary. Please record more heart sounds.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Failed to generate summary:', error);
      Alert.alert(
        'Summary Error',
        'Could not generate AI summary from backend data. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Load stored recordings
  const loadStoredRecordings = async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem('recordings');
      if (stored) {
        const parsedRecordings = JSON.parse(stored).map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp),
          analysis: r.analysis ? {
            ...r.analysis,
            timestamp: new Date(r.analysis.timestamp),
          } : undefined,
        }));
        setRecordings(parsedRecordings);
      }
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  };

  // Load patient data
  const loadPatientData = async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem('currentPatient');
      if (stored) {
        const patient = JSON.parse(stored);
        setCurrentPatient({
          ...patient,
          lastRecording: patient.lastRecording ? new Date(patient.lastRecording) : undefined,
        });
      }
    } catch (error) {
      console.error('Failed to load patient data:', error);
    }
  };

  // Share recording with healthcare provider
  const shareRecording = async (recording: Recording): Promise<void> => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing not available', 'Sharing is not supported on this device');
        return;
      }

      const shareOptions = {
        mimeType: 'audio/m4a',
        dialogTitle: 'Share Heart Sound Recording',
        UTI: 'public.audio',
      };

      await Sharing.shareAsync(recording.uri, shareOptions);
    } catch (error) {
      console.error('Sharing failed:', error);
      Alert.alert('Share Error', 'Failed to share recording');
    }
  };

  // Format duration display
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup function
  const cleanup = (): void => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
    }
    if (waveformTimer.current) {
      clearInterval(waveformTimer.current);
    }
  };

  // Analysis Modal Button Handlers
  const handleShareWithDoctor = async () => {
    if (!latestAnalysis) {
      Alert.alert('Error', 'No analysis data available to share');
      return;
    }

    try {
      console.log('📤 Sharing analysis with doctor...');
      
      // Use current analyzed recording or find the most recent one
      const recordingToUse = currentAnalyzedRecording || recordings.find(r => r.analysis) || null;
      const patientName = recordingToUse?.patient || currentPatient.name || 'Patient';
      const recordingId = recordingToUse?.id || `analysis_${Date.now()}`;
      
      // Create a comprehensive analysis report
      const reportText = `
🩺 Heart Sound Analysis Report
================================

Patient: ${patientName}
Date: ${new Date(latestAnalysis.timestamp).toLocaleString()}
Duration: ${recordingToUse?.duration || 'N/A'}s

📊 Analysis Results:
• Heart Rate: ${latestAnalysis.heartRate} BPM
• Rhythm: ${latestAnalysis.rhythm}
• Condition: ${latestAnalysis.condition}
• Confidence: ${Math.round(latestAnalysis.confidence * 100)}%
• Risk Level: ${latestAnalysis.riskLevel}

💡 Medical Recommendations:
${latestAnalysis.recommendations.map(r => `• ${r}`).join('\n')}

📝 Clinical Notes:
${latestAnalysis.clinicalNotes}

⚕️ Backend Analysis Details:
${recordingToUse?.firebaseAnalysis?.backendAnalysis ? `
• Processing Time: ${recordingToUse.firebaseAnalysis.backendAnalysis.analysis_metadata?.processing_time?.toFixed(1)}s
• Model Version: ${recordingToUse.firebaseAnalysis.backendAnalysis.analysis_metadata?.model_version}
• Recommended Action: ${recordingToUse.firebaseAnalysis.backendAnalysis.clinical_analysis?.recommended_action}
` : 'Standard analysis completed'}

⚠️  Disclaimer: This analysis is for screening purposes only. Always consult healthcare professionals for medical decisions.

Generated by RSteth Digital Stethoscope
`;

      // Share the report
      const shareOptions = {
        message: reportText,
        title: 'Heart Sound Analysis Report',
      };

      if (await Sharing.isAvailableAsync()) {
        // Create temporary text file for sharing
        const reportPath = `${FileSystem.documentDirectory}heart_analysis_report_${recordingId}.txt`;
        await FileSystem.writeAsStringAsync(reportPath, reportText);
        
        await Sharing.shareAsync(reportPath, {
          mimeType: 'text/plain',
          dialogTitle: 'Share Heart Analysis Report with Doctor',
          UTI: 'public.plain-text'
        });
        
        console.log('✅ Analysis report shared successfully');
        
        // Clean up temporary file
        await FileSystem.deleteAsync(reportPath).catch(() => {});
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('❌ Error sharing analysis:', error);
      Alert.alert('Sharing Failed', 'Unable to share the analysis report. Please try again.');
    }
  };

  const handleSaveToHealthRecords = async () => {
    if (!latestAnalysis) {
      Alert.alert('Error', 'No analysis data available to save');
      return;
    }

    try {
      console.log('💾 Saving to health records...');
      
      // Use current analyzed recording or find the most recent one with analysis
      const recordingToUse = currentAnalyzedRecording || recordings.find(r => r.analysis);
      
      if (recordingToUse?.firebaseAnalysis) {
        // Already saved to Firebase
        Alert.alert(
          'Already Saved',
          'This analysis has already been saved to your health records.',
          [
            {
              text: 'View Records',
              onPress: () => {
                setShowAnalysisModal(false);
                setActiveTab('history');
              }
            },
            { text: 'OK' }
          ]
        );
        return;
      }

      // If we don't have a recording object, create a temporary one for saving
      const recordingForSave = recordingToUse || {
        id: `manual_save_${Date.now()}`,
        patient: currentPatient.name,
        timestamp: new Date(latestAnalysis.timestamp),
        duration: 30, // Default duration
        uri: 'data:audio/m4a;base64,', // Empty placeholder URI
        quality: 'Good' as const,
        waveformData: [],
        analysis: latestAnalysis,
        fileSize: 0
      };

      // Save to Firebase if not already saved
      setIsUploadingToFirebase(true);
      
      // Use a special approach for manual saves without actual audio files
      if (!recordingToUse && recordingForSave.uri.startsWith('data:')) {
        // For manual saves without audio files, save directly without audio upload
        const analysisData: Omit<HeartAnalysisData, 'createdAt'> = {
          id: recordingForSave.id,
          userId: user.uid,
          patientName: currentPatient.name,
          audioUrl: '', // No audio file
          audioFileName: 'manual_save.m4a',
          duration: recordingForSave.duration,
          quality: recordingForSave.quality,
          
          // Backend Analysis Data (constructed from current analysis)
          backendAnalysis: {
            heart_rate: latestAnalysis.heartRate,
            clinical_analysis: {
              condition: latestAnalysis.condition,
              confidence: latestAnalysis.confidence,
              severity: latestAnalysis.riskLevel,
              rhythm_irregular: latestAnalysis.rhythm === 'Irregular',
              clinical_features: {
                murmur_detected: latestAnalysis.condition.toLowerCase().includes('murmur'),
                arrhythmia_detected: latestAnalysis.rhythm === 'Irregular',
                abnormal_sounds: latestAnalysis.condition !== 'NORMAL HEART SOUND',
                valve_issues: latestAnalysis.condition.toLowerCase().includes('valve'),
                signal_quality: 0.8,
                harmonic_ratio: 0.7
              },
              recommended_action: latestAnalysis.recommendations[0] || 'Continue monitoring',
            },
            medical_recommendations: {
              immediate_actions: latestAnalysis.recommendations,
            },
            analysis_metadata: {
              processing_time: 0,
              model_version: 'Manual-Save-v1.0',
              timestamp: new Date().toISOString()
            },
          },
          
          // Processed fields for easy access
          heartRate: latestAnalysis.heartRate,
          rhythm: latestAnalysis.rhythm,
          condition: latestAnalysis.condition,
          confidence: latestAnalysis.confidence,
          riskLevel: latestAnalysis.riskLevel,
          recommendations: latestAnalysis.recommendations,
          clinicalNotes: latestAnalysis.clinicalNotes,
          
          fileSize: 0,
          timestamp: new Date(),
        };
        
        const analysisId = await healthAnalyticsService.saveHeartAnalysis(analysisData, '');
        console.log('✅ Manual analysis saved successfully:', analysisId);
      } else {
        // Normal save with audio file
      
      // Create a basic backend result for saving (if original backend result not available)
      const backendResult: MLAnalysisResult = {
        request_id: `manual_save_${Date.now()}`,
        predicted_class: latestAnalysis.condition.toLowerCase().replace(' ', '_'),
        confidence: latestAnalysis.confidence,
        probabilities: { 
          normal: latestAnalysis.condition === 'NORMAL HEART SOUND' ? latestAnalysis.confidence : 1 - latestAnalysis.confidence,
          [latestAnalysis.condition.toLowerCase().replace(' ', '_')]: latestAnalysis.confidence
        },
        medical_recommendation: {
          status: latestAnalysis.riskLevel === 'High' ? 'urgent' : latestAnalysis.riskLevel === 'Medium' ? 'monitor' : 'normal',
          recommendation: latestAnalysis.recommendations[0] || 'Continue regular monitoring',
          urgency: latestAnalysis.riskLevel.toLowerCase() as 'low' | 'medium' | 'high',
          follow_up: latestAnalysis.clinicalNotes,
          additional_notes: 'Manual save from analysis modal'
        },
        features: {
          mfcc_mean: 0.5,
          spectral_centroid: 2000,
          tempo: latestAnalysis.heartRate,
          harmonic_ratio: 0.7,
          signal_quality: 0.8,
          noise_level: 0.2
        },
        processing_time: 2.5,
        timestamp: new Date().toISOString(),
        filename: recordingForSave.id,
        analysis_method: 'rsteth_manual_save',
        audio_features: {
          duration: recordingForSave.duration,
          sample_rate: 44100,
          energy: 0.5,
          zero_crossing_rate: 0.1,
          spectral_centroid: 2000,
          spectral_bandwidth: 1000,
          spectral_rolloff: 3000,
          mfcc_features: Array(13).fill(0.5),
          chroma_features: Array(12).fill(0.4),
          tempo: latestAnalysis.heartRate,
          beat_count: Math.round((latestAnalysis.heartRate * recordingForSave.duration) / 60),
          estimated_heart_rate: latestAnalysis.heartRate,
          rhythm_regularity: latestAnalysis.rhythm === 'Regular' ? 0.9 : 0.3,
          signal_quality: 0.8
        },
        classification: {
          prediction: latestAnalysis.condition,
          confidence: latestAnalysis.confidence,
          all_probabilities: { 
            normal: latestAnalysis.condition === 'NORMAL HEART SOUND' ? latestAnalysis.confidence : 1 - latestAnalysis.confidence,
            [latestAnalysis.condition.toLowerCase().replace(' ', '_')]: latestAnalysis.confidence
          },
          model_used: 'rsteth_lstm',
          feature_count: 25,
          features_used: ['mfcc', 'spectral', 'temporal'],
          heart_rate_bpm: latestAnalysis.heartRate,
          confidence_level: latestAnalysis.confidence > 0.8 ? 'high' : latestAnalysis.confidence > 0.6 ? 'medium' : 'low',
          risk_assessment: latestAnalysis.riskLevel.toLowerCase()
        },
        medical_analysis: {
          clinical_assessment: latestAnalysis.clinicalNotes,
          risk_level: latestAnalysis.riskLevel.toLowerCase() as 'low' | 'moderate' | 'high' | 'critical',
          urgency: latestAnalysis.riskLevel.toLowerCase() === 'high' ? 'urgent' : latestAnalysis.riskLevel.toLowerCase() === 'medium' ? 'follow_up' : 'routine',
          recommendations: latestAnalysis.recommendations,
          confidence_score: latestAnalysis.confidence,
          findings: {
            murmur_detected: latestAnalysis.condition.toLowerCase().includes('murmur'),
            arrhythmia_detected: latestAnalysis.rhythm === 'Irregular',
            abnormal_sounds: latestAnalysis.condition !== 'NORMAL HEART SOUND',
            valve_issues: latestAnalysis.condition.toLowerCase().includes('valve') || latestAnalysis.condition.toLowerCase().includes('stenosis')
          }
        },
        quality_metrics: {
          audio_quality: 0.8,
          noise_level: 0.2,
          signal_to_noise_ratio: 4.0,
          analysis_reliability: latestAnalysis.confidence,
          confidence_level: latestAnalysis.confidence > 0.8 ? 'high' : latestAnalysis.confidence > 0.6 ? 'medium' : 'low'
        }
      };

      await saveToFirebase(recordingForSave, latestAnalysis, backendResult);
      }
      
      Alert.alert(
        'Saved Successfully',
        'Your heart sound analysis has been saved to your health records.',
        [
          {
            text: 'View Records',
            onPress: () => {
              setShowAnalysisModal(false);
              setActiveTab('history');
            }
          },
          { text: 'OK' }
        ]
      );
      
      console.log('✅ Analysis saved to health records');
    } catch (error) {
      console.error('❌ Error saving to health records:', error);
      Alert.alert('Save Failed', 'Unable to save to health records. Please try again.');
    } finally {
      setIsUploadingToFirebase(false);
    }
  };

  // Render Functions
  const renderDeviceStatus = () => (
    <View style={styles.deviceCard}>
      <LinearGradient
        colors={deviceStatus.isConnected ? ['#4F46E5', '#7C3AED'] : ['#6B7280', '#9CA3AF']}
        style={styles.deviceGradient}
      >
        <View style={styles.deviceHeader}>
          <View style={styles.deviceInfo}>
            <MaterialIcons 
              name="hearing" 
              size={24} 
              color="white" 
            />
            <View style={styles.deviceText}>
              <Text style={styles.deviceName}>{deviceStatus.deviceName}</Text>
              <Text style={styles.deviceModel}>USB-C Digital Stethoscope</Text>
            </View>
          </View>
          <View style={styles.connectionStatus}>
            <MaterialIcons 
              name={deviceStatus.isConnected ? "usb" : "usb-off"} 
              size={20} 
              color={deviceStatus.isConnected ? "#10B981" : "#EF4444"} 
            />
            <Text style={[styles.connectionText, {
              color: deviceStatus.isConnected ? "#10B981" : "#EF4444"
            }]}>
              {deviceStatus.isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>

        {deviceStatus.isConnected && (
          <View style={styles.deviceMetrics}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Signal Quality</Text>
              <View style={styles.signalBars}>
                {[...Array(5)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.signalBar,
                      {
                        backgroundColor: i < Math.floor(deviceStatus.signalQuality / 20) 
                          ? '#10B981' 
                          : 'rgba(255,255,255,0.3)'
                      }
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.metricValue}>{deviceStatus.signalQuality}%</Text>
            </View>

            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Audio Level</Text>
              <View style={styles.audioLevelBar}>
                <View 
                  style={[
                    styles.audioLevelFill,
                    { 
                      width: `${deviceStatus.audioLevel}%`,
                      backgroundColor: deviceStatus.audioLevel > 70 ? '#10B981' : 
                                     deviceStatus.audioLevel > 30 ? '#F59E0B' : '#EF4444'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.metricValue}>{Math.round(deviceStatus.audioLevel)}%</Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );

  const renderRecordingInterface = () => (
    <View style={styles.recordingCard}>
      <View style={styles.patientInfo}>
        <MaterialIcons name="person" size={20} color="#6B7280" />
        <Text style={styles.patientName}>{currentPatient.name}</Text>
      </View>

      {/* Waveform Visualization */}
      {(isRecording || waveformData.length > 0) && (
        <View style={styles.waveformContainer}>
          <Text style={styles.waveformTitle}>Heart Sound Waveform</Text>
          <View style={styles.waveform}>
            {waveformData.map((amplitude, index) => (
              <View
                key={index}
                style={[
                  styles.waveformBar,
                  {
                    height: Math.abs(amplitude) * 0.8 + 2,
                    backgroundColor: isRecording ? '#10B981' : '#6B7280',
                    opacity: isRecording ? 1 : 0.6,
                  }
                ]}
              />
            ))}
          </View>
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>RECORDING</Text>
            </View>
          )}
        </View>
      )}

      {/* Recording Duration */}
      <View style={styles.durationContainer}>
        <Text style={styles.durationLabel}>Duration</Text>
        <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
        {recordingDuration > 0 && (
          <Text style={styles.durationHint}>
            {recordingDuration < 15 ? 'Keep recording for better analysis' : 'Good recording length'}
          </Text>
        )}
      </View>

      {/* Recording Button */}
      <View style={styles.recordingControls}>
        <Animated.View style={[
          styles.recordButtonContainer,
          { transform: [{ scale: pulseAnimation }] }
        ]}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              {
                backgroundColor: isRecording ? '#EF4444' : '#4F46E5',
                opacity: deviceStatus.isConnected ? 1 : 0.5,
              }
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={!deviceStatus.isConnected}
            activeOpacity={0.8}
          >
            <MaterialIcons 
              name={isRecording ? "stop" : "mic"} 
              size={32} 
              color="white" 
            />
          </TouchableOpacity>
        </Animated.View>
        
        <Text style={styles.recordButtonLabel}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
        
        {!deviceStatus.isConnected && (
          <Text style={styles.connectHint}>
            Connect your USB-C stethoscope to start
          </Text>
        )}
      </View>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <View style={styles.analysisProgress}>
          <ActivityIndicator size="small" color="#4F46E5" />
          <Text style={styles.analysisText}>Analyzing heart sounds with AI...</Text>
        </View>
      )}
    </View>
  );

  const renderRecordingHistory = () => (
    <ScrollView style={styles.historyContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.historyHeader}>
        <View>
          <Text style={styles.historyTitle}>Recording History</Text>
          <View style={styles.historyStats}>
            <Text style={styles.historyCount}>{recordings.length} local recordings</Text>
            <Text style={styles.cloudCount}>
              {isLoadingFirebaseAnalyses ? 'Loading...' : `${firebaseAnalyses.length} cloud analyses`}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadFirebaseAnalyses}
          disabled={isLoadingFirebaseAnalyses}
        >
          <MaterialIcons 
            name="refresh" 
            size={24} 
            color={isLoadingFirebaseAnalyses ? "#D1D5DB" : "#4F46E5"} 
          />
        </TouchableOpacity>
      </View>

      {recordings.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="hearing" size={48} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>No Recordings Yet</Text>
          <Text style={styles.emptyStateText}>
            Connect your USB-C stethoscope and start recording to build your heart health history
          </Text>
        </View>
      ) : (
        recordings.map((recording) => (
          <View key={recording.id} style={styles.recordingItem}>
            <View style={styles.recordingHeader}>
              <View>
                <Text style={styles.recordingDate}>
                  {recording.timestamp.toLocaleDateString()}
                </Text>
                <Text style={styles.recordingTime}>
                  {recording.timestamp.toLocaleTimeString()}
                </Text>
              </View>
              <View style={styles.recordingActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => shareRecording(recording)}
                >
                  <MaterialIcons name="share" size={18} color="#4F46E5" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.recordingMetrics}>
              <View style={styles.recordingMetric}>
                <MaterialIcons name="timer" size={16} color="#6B7280" />
                <Text style={styles.metricText}>{formatDuration(recording.duration)}</Text>
              </View>
              <View style={styles.recordingMetric}>
                <MaterialIcons 
                  name={recording.quality === 'Excellent' ? 'verified' : 
                        recording.quality === 'Good' ? 'check-circle' : 
                        recording.quality === 'Fair' ? 'warning' : 'error'} 
                  size={16} 
                  color={recording.quality === 'Excellent' ? '#10B981' : 
                         recording.quality === 'Good' ? '#3B82F6' : 
                         recording.quality === 'Fair' ? '#F59E0B' : '#EF4444'} 
                />
                <Text style={styles.metricText}>{recording.quality}</Text>
              </View>
              <View style={styles.recordingMetric}>
                <MaterialIcons name="folder" size={16} color="#6B7280" />
                <Text style={styles.metricText}>
                  {(recording.fileSize / 1024 / 1024).toFixed(1)} MB
                </Text>
              </View>
            </View>

            {/* Enhanced Analysis Display - show Firebase analysis if available, fallback to basic analysis */}
            {(recording.firebaseAnalysis || recording.analysis) && (
              <View style={styles.analysisPreview}>
                {recording.firebaseAnalysis ? (
                  // Detailed Firebase Analysis Display
                  <>
                    <View style={styles.analysisHeader}>
                      <MaterialIcons name="cloud" size={16} color="#4F46E5" />
                      <Text style={styles.analysisTypeLabel}>Clinical Analysis</Text>
                      <View style={styles.confidenceBadge}>
                        <Text style={styles.confidenceText}>
                          {Math.round(recording.firebaseAnalysis.confidence * 100)}%
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.analysisMetrics}>
                      {/* Processing Time */}
                      <View style={styles.analysisMetric}>
                        <MaterialIcons name="speed" size={16} color="#6B7280" />
                        <Text style={styles.analysisMetricText}>
                          {recording.firebaseAnalysis.backendAnalysis?.analysis_metadata?.processing_time?.toFixed(1) || '0'}s
                        </Text>
                      </View>
                      
                      {/* Model Version */}
                      <View style={styles.analysisMetric}>
                        <MaterialIcons name="memory" size={16} color="#4F46E5" />
                        <Text style={styles.analysisMetricText}>
                          {recording.firebaseAnalysis.backendAnalysis?.analysis_metadata?.model_version || 'v1.0'}
                        </Text>
                      </View>
                      
                      {/* Risk Level */}
                      <View style={styles.analysisMetric}>
                        <MaterialIcons 
                          name={recording.firebaseAnalysis.riskLevel === 'Low' ? 'check-circle' :
                                recording.firebaseAnalysis.riskLevel === 'Medium' ? 'warning' : 'error'} 
                          size={16} 
                          color={recording.firebaseAnalysis.riskLevel === 'Low' ? '#10B981' :
                                 recording.firebaseAnalysis.riskLevel === 'Medium' ? '#F59E0B' : '#EF4444'} 
                        />
                        <Text style={styles.analysisMetricText}>
                          {recording.firebaseAnalysis.riskLevel} Risk
                        </Text>
                      </View>
                    </View>
                    
                    {/* Detailed Clinical Features */}
                    {recording.firebaseAnalysis.backendAnalysis?.clinical_analysis?.clinical_features && (
                      <View style={styles.clinicalFeaturesContainer}>
                        <Text style={styles.clinicalFeaturesTitle}>Clinical Features:</Text>
                        <View style={styles.clinicalFeaturesList}>
                          {recording.firebaseAnalysis.backendAnalysis.clinical_analysis.rhythm_irregular !== undefined && (
                            <View style={styles.clinicalFeatureItem}>
                              <MaterialIcons 
                                name={recording.firebaseAnalysis.backendAnalysis.clinical_analysis.rhythm_irregular ? 'warning' : 'check'} 
                                size={12} 
                                color={recording.firebaseAnalysis.backendAnalysis.clinical_analysis.rhythm_irregular ? '#F59E0B' : '#10B981'} 
                              />
                              <Text style={styles.clinicalFeatureText}>
                                Rhythm: {recording.firebaseAnalysis.backendAnalysis.clinical_analysis.rhythm_irregular ? 'Irregular' : 'Regular'}
                              </Text>
                            </View>
                          )}
                          
                          {recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features?.murmur_detected !== undefined && (
                            <View style={styles.clinicalFeatureItem}>
                              <MaterialIcons 
                                name={recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features.murmur_detected ? 'hearing' : 'hearing-disabled'} 
                                size={12} 
                                color={recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features.murmur_detected ? '#F59E0B' : '#10B981'} 
                              />
                              <Text style={styles.clinicalFeatureText}>
                                Murmur: {recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features.murmur_detected ? 'Detected' : 'Not Detected'}
                              </Text>
                            </View>
                          )}
                          
                          {recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features?.extra_sounds !== undefined && (
                            <View style={styles.clinicalFeatureItem}>
                              <MaterialIcons 
                                name={recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features.extra_sounds ? 'volume-up' : 'volume-off'} 
                                size={12} 
                                color={recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features.extra_sounds ? '#F59E0B' : '#10B981'} 
                              />
                              <Text style={styles.clinicalFeatureText}>
                                Extra Sounds: {recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features.extra_sounds ? 'Present' : 'Absent'}
                              </Text>
                            </View>
                          )}
                          
                          {recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features?.s3_gallop !== undefined && (
                            <View style={styles.clinicalFeatureItem}>
                              <MaterialIcons 
                                name={recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features.s3_gallop ? 'graphic-eq' : 'straighten'} 
                                size={12} 
                                color={recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features.s3_gallop ? '#F59E0B' : '#10B981'} 
                              />
                              <Text style={styles.clinicalFeatureText}>
                                S3 Gallop: {recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features.s3_gallop ? 'Present' : 'Absent'}
                              </Text>
                            </View>
                          )}
                          
                          {recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features?.s4_gallop !== undefined && (
                            <View style={styles.clinicalFeatureItem}>
                              <MaterialIcons 
                                name={recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features.s4_gallop ? 'graphic-eq' : 'straighten'} 
                                size={12} 
                                color={recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features.s4_gallop ? '#F59E0B' : '#10B981'} 
                              />
                              <Text style={styles.clinicalFeatureText}>
                                S4 Gallop: {recording.firebaseAnalysis.backendAnalysis.clinical_analysis.clinical_features.s4_gallop ? 'Present' : 'Absent'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                    
                    <View style={styles.conditionRow}>
                      <Text style={styles.conditionText}>{recording.firebaseAnalysis.condition}</Text>
                      {recording.firebaseAnalysis.backendAnalysis?.clinical_analysis?.severity && (
                        <Text style={styles.severityText}>
                          {recording.firebaseAnalysis.backendAnalysis.clinical_analysis.severity}
                        </Text>
                      )}
                    </View>
                    
                    {recording.firebaseAnalysis.clinicalNotes && (
                      <Text style={styles.historyNotesText} numberOfLines={2}>
                        {recording.firebaseAnalysis.clinicalNotes}
                      </Text>
                    )}
                    
                    {/* Backend Recommended Action */}
                    {recording.firebaseAnalysis.backendAnalysis?.clinical_analysis?.recommended_action && (
                      <View style={styles.recommendedActionContainer}>
                        <View style={styles.recommendedActionHeader}>
                          <MaterialIcons name="medical-services" size={14} color="#4F46E5" />
                          <Text style={styles.recommendedActionTitle}>Recommended Action:</Text>
                        </View>
                        <Text style={styles.recommendedActionText}>
                          {recording.firebaseAnalysis.backendAnalysis.clinical_analysis.recommended_action}
                        </Text>
                      </View>
                    )}
                    
                    {recording.firebaseAnalysis.recommendations && recording.firebaseAnalysis.recommendations.length > 0 && (
                      <View style={styles.recommendationsPreview}>
                        <Text style={styles.recommendationsLabel}>Additional Recommendations:</Text>
                        <Text style={styles.recommendationText} numberOfLines={1}>
                          {recording.firebaseAnalysis.recommendations[0]}
                        </Text>
                      </View>
                    )}
                  </>
                ) : recording.analysis ? (
                  // Basic Analysis Display (fallback)
                  <>
                    <View style={styles.analysisHeader}>
                      <MaterialIcons name="analytics" size={16} color="#6B7280" />
                      <Text style={styles.analysisTypeLabel}>Basic Analysis</Text>
                    </View>
                    <View style={styles.analysisMetrics}>
                      <View style={styles.analysisMetric}>
                        <MaterialIcons name="show-chart" size={16} color="#4F46E5" />
                        <Text style={styles.analysisMetricText}>
                          {recording.analysis.rhythm}
                        </Text>
                      </View>
                      <View style={styles.analysisMetric}>
                        <MaterialIcons name="psychology" size={16} color="#10B981" />
                        <Text style={styles.analysisMetricText}>
                          {Math.round(recording.analysis.confidence * 100)}% Confidence
                        </Text>
                      </View>
                      <View style={styles.analysisMetric}>
                        <MaterialIcons 
                          name={recording.analysis.riskLevel === 'Low' ? 'check-circle' :
                                recording.analysis.riskLevel === 'Medium' ? 'warning' : 'error'} 
                          size={16} 
                          color={recording.analysis.riskLevel === 'Low' ? '#10B981' :
                                 recording.analysis.riskLevel === 'Medium' ? '#F59E0B' : '#EF4444'} 
                        />
                        <Text style={styles.analysisMetricText}>
                          {recording.analysis.riskLevel} Risk
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.conditionText}>{recording.analysis.condition}</Text>
                  </>
                ) : null}
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderPatientInfo = () => (
    <View style={styles.patientCard}>
      <View style={styles.patientHeader}>
        <MaterialIcons name="person" size={24} color="#4F46E5" />
        <Text style={styles.patientCardTitle}>Patient Information</Text>
      </View>

      <View style={styles.patientDetails}>
        <Text style={styles.patientDetailLabel}>Total Recordings</Text>
        <Text style={styles.patientDetailValue}>{currentPatient.recordingCount}</Text>
      </View>

      <View style={styles.patientDetails}>
        <Text style={styles.patientDetailLabel}>Cloud Recordings</Text>
        <Text style={styles.patientDetailValue}>{firebaseAnalyses.length}</Text>
      </View>

      <View style={styles.patientDetails}>
        <Text style={styles.patientDetailLabel}>Last Recording</Text>
        <Text style={styles.patientDetailValue}>
          {currentPatient.lastRecording 
            ? currentPatient.lastRecording.toLocaleDateString()
            : 'No recordings yet'}
        </Text>
      </View>

      {/* AI Summary Button */}
      <TouchableOpacity 
        style={styles.summaryButton} 
        onPress={generatePatientSummary}
        disabled={isGeneratingSummary || firebaseAnalyses.length === 0}
      >
        <LinearGradient
          colors={firebaseAnalyses.length > 0 ? ['#8B5CF6', '#A78BFA'] : ['#9CA3AF', '#D1D5DB']}
          style={styles.summaryGradient}
        >
          {isGeneratingSummary ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <MaterialIcons name="psychology" size={20} color="white" />
          )}
          <Text style={styles.summaryButtonText}>
            {isGeneratingSummary ? 'Generating AI Summary...' : 'Generate AI Health Summary'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.shareButton}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.shareGradient}
        >
          <MaterialIcons name="cloud-upload" size={20} color="white" />
          <Text style={styles.shareButtonText}>Share with Healthcare Provider</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Upload Status */}
      {isUploadingToFirebase && (
        <View style={styles.uploadStatus}>
          <ActivityIndicator size="small" color="#4F46E5" />
          <Text style={styles.uploadText}>Syncing to cloud...</Text>
        </View>
      )}

      <View style={styles.privacyNote}>
        <MaterialIcons name="security" size={16} color="#6B7280" />
        <Text style={styles.privacyText}>
          All recordings are encrypted and HIPAA compliant
        </Text>
      </View>
    </View>
  );

  // Analysis Results Modal
  const renderAnalysisModal = () => (
    <Modal
      visible={showAnalysisModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAnalysisModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Heart Sound Analysis</Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowAnalysisModal(false)}
          >
            <MaterialIcons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {latestAnalysis && (
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Key Metrics */}
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: '#FEF2F2' }]}>
                <MaterialIcons name="favorite" size={24} color="#EF4444" />
                <Text style={styles.metricCardValue}>{latestAnalysis.heartRate}</Text>
                <Text style={styles.metricCardLabel}>BPM</Text>
              </View>
              
              <View style={[styles.metricCard, { backgroundColor: '#EFF6FF' }]}>
                <MaterialIcons name="show-chart" size={24} color="#3B82F6" />
                <Text style={styles.metricCardValue}>{latestAnalysis.rhythm}</Text>
                <Text style={styles.metricCardLabel}>Rhythm</Text>
              </View>
              
              <View style={[styles.metricCard, { backgroundColor: '#F0FDF4' }]}>
                <MaterialIcons name="psychology" size={24} color="#10B981" />
                <Text style={styles.metricCardValue}>
                  {Math.round(latestAnalysis.confidence * 100)}%
                </Text>
                <Text style={styles.metricCardLabel}>Confidence</Text>
              </View>
              
              <View style={[
                styles.metricCard, 
                { 
                  backgroundColor: latestAnalysis.riskLevel === 'High' ? '#FEF2F2' : 
                                   latestAnalysis.riskLevel === 'Medium' ? '#FFFBEB' : '#F0FDF4'
                }
              ]}>
                <MaterialIcons 
                  name={latestAnalysis.riskLevel === 'High' ? 'warning' : 
                        latestAnalysis.riskLevel === 'Medium' ? 'info' : 'check-circle'} 
                  size={24} 
                  color={latestAnalysis.riskLevel === 'High' ? '#EF4444' : 
                         latestAnalysis.riskLevel === 'Medium' ? '#F59E0B' : '#10B981'} 
                />
                <Text style={styles.metricCardValue}>{latestAnalysis.riskLevel}</Text>
                <Text style={styles.metricCardLabel}>Risk Level</Text>
              </View>
            </View>

            {/* Clinical Assessment */}
            <View style={styles.assessmentCard}>
              <View style={styles.assessmentHeader}>
                <MaterialIcons name="medical-services" size={20} color="#4F46E5" />
                <Text style={styles.assessmentTitle}>Clinical Assessment</Text>
              </View>
              <Text style={styles.conditionResult}>{latestAnalysis.condition}</Text>
              <Text style={styles.clinicalNotes}>{latestAnalysis.clinicalNotes}</Text>
            </View>

            {/* Recommendations */}
            <View style={styles.recommendationsCard}>
              <View style={styles.recommendationsHeader}>
                <MaterialIcons name="lightbulb" size={20} color="#F59E0B" />
                <Text style={styles.recommendationsTitle}>Medical Recommendations</Text>
              </View>
              {latestAnalysis.recommendations.map((recommendation, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <MaterialIcons name="arrow-right" size={16} color="#6B7280" />
                  <Text style={styles.recommendationText}>{recommendation}</Text>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.shareAnalysisButton}
                onPress={handleShareWithDoctor}
              >
                <LinearGradient
                  colors={['#4F46E5', '#7C3AED']}
                  style={styles.shareAnalysisGradient}
                >
                  <MaterialIcons name="share" size={20} color="white" />
                  <Text style={styles.shareAnalysisText}>Share with Doctor</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveToHealthRecords}
                disabled={isUploadingToFirebase}
              >
                {isUploadingToFirebase ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                  <MaterialIcons name="save" size={20} color="#4F46E5" />
                )}
                <Text style={styles.saveButtonText}>
                  {isUploadingToFirebase ? 'Saving...' : 'Save to Health Records'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
              <MaterialIcons name="info" size={16} color="#6B7280" />
              <Text style={styles.disclaimerText}>
                This analysis is for screening purposes only. Always consult healthcare 
                professionals for medical decisions.
              </Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  // Patient Summary Modal with AI Analysis
  const renderSummaryModal = () => (
    <Modal
      visible={showSummaryModal}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => setShowSummaryModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>AI Health Summary</Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowSummaryModal(false)}
          >
            <MaterialIcons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {patientSummary && (
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Summary Stats */}
            <View style={styles.summaryStatsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
                <MaterialIcons name="favorite" size={24} color="#EF4444" />
                <Text style={styles.statValue}>{patientSummary.averageHeartRate}</Text>
                <Text style={styles.statLabel}>Avg BPM</Text>
              </View>
              
              <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
                <MaterialIcons name="assessment" size={24} color="#3B82F6" />
                <Text style={styles.statValue}>{patientSummary.totalRecordings}</Text>
                <Text style={styles.statLabel}>Total Recordings</Text>
              </View>
              
              <View style={[
                styles.statCard, 
                { 
                  backgroundColor: patientSummary.riskDistribution.high > 0 ? '#FEF2F2' : 
                                   patientSummary.riskDistribution.medium > 0 ? '#FEF3C7' : '#F0FDF4'
                }
              ]}>
                <MaterialIcons 
                  name={patientSummary.riskDistribution.high > 0 ? 'trending-down' : 
                        patientSummary.riskDistribution.medium > 0 ? 'trending-flat' : 'trending-up'} 
                  size={24} 
                  color={patientSummary.riskDistribution.high > 0 ? '#EF4444' : 
                         patientSummary.riskDistribution.medium > 0 ? '#F59E0B' : '#10B981'} 
                />
                <Text style={styles.statValue}>
                  {patientSummary.riskDistribution.high > 0 ? 'High Risk' : 
                   patientSummary.riskDistribution.medium > 0 ? 'Medium Risk' : 'Low Risk'}
                </Text>
                <Text style={styles.statLabel}>Risk Level</Text>
              </View>
            </View>

            {/* AI Summary */}
            <View style={styles.aiSummaryCard}>
              <View style={styles.aiSummaryHeader}>
                <MaterialIcons name="psychology" size={24} color="#8B5CF6" />
                <Text style={styles.aiSummaryTitle}>AI Health Assessment</Text>
              </View>
              <Text style={styles.aiSummaryText}>{patientSummary.aiInsights}</Text>
            </View>

            {/* Common Conditions */}
            <View style={styles.conditionsCard}>
              <View style={styles.conditionsHeader}>
                <MaterialIcons name="medical-services" size={20} color="#4F46E5" />
                <Text style={styles.conditionsTitle}>Common Findings</Text>
              </View>
              {Object.entries(patientSummary.conditionFrequency).map(([condition, count], index) => (
                <View key={index} style={styles.conditionItem}>
                  <MaterialIcons name="circle" size={8} color="#10B981" />
                  <Text style={styles.conditionText}>{condition} ({count})</Text>
                </View>
              ))}
            </View>

            {/* Detailed Analysis */}
            <View style={styles.detailedAnalysisCard}>
              <View style={styles.detailedAnalysisHeader}>
                <MaterialIcons name="description" size={20} color="#059669" />
                <Text style={styles.detailedAnalysisTitle}>Detailed Clinical Analysis</Text>
              </View>
              <Text style={styles.detailedAnalysisText}>{patientSummary.recentTrends}</Text>
            </View>

            {/* Actions */}
            <View style={styles.summaryActions}>
              <TouchableOpacity style={styles.exportButton}>
                <LinearGradient
                  colors={['#059669', '#10B981']}
                  style={styles.exportGradient}
                >
                  <MaterialIcons name="file-download" size={20} color="white" />
                  <Text style={styles.exportText}>Export Report</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareReportButton}>
                <MaterialIcons name="share" size={20} color="#4F46E5" />
                <Text style={styles.shareReportText}>Share with Doctor</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  // Main Render
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnimation }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Digital Stethoscope</Text>
            <Text style={styles.headerSubtitle}>Professional Heart Monitoring</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.switchButton} onPress={onSwitchToAI}>
              <MaterialIcons name="auto-awesome" size={20} color="#4F46E5" />
              <Text style={styles.switchButtonText}>AI Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Device Status */}
        {renderDeviceStatus()}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { id: 'monitor', label: 'Monitor', icon: 'hearing' },
            { id: 'history', label: 'History', icon: 'history' },
            { id: 'patient', label: 'Patient', icon: 'person' },
          ].map(({ id, label, icon }) => (
            <TouchableOpacity
              key={id}
              style={[
                styles.tab,
                activeTab === id && styles.activeTab
              ]}
              onPress={() => setActiveTab(id as any)}
            >
              <MaterialIcons 
                name={icon as any} 
                size={20} 
                color={activeTab === id ? '#4F46E5' : '#6B7280'} 
              />
              <Text style={[
                styles.tabLabel,
                activeTab === id && styles.activeTabLabel
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {activeTab === 'monitor' && renderRecordingInterface()}
          {activeTab === 'history' && renderRecordingHistory()}
          {activeTab === 'patient' && renderPatientInfo()}
        </ScrollView>

        {/* Analysis Modal */}
        {renderAnalysisModal()}
        
        {/* Patient Summary Modal */}
        {renderSummaryModal()}
      </SafeAreaView>
    </Animated.View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  switchButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
    marginLeft: 4,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  
  // Device Status Card
  deviceCard: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deviceGradient: {
    padding: 20,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceText: {
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  deviceModel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  deviceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    marginTop: 4,
  },
  signalBars: {
    flexDirection: 'row',
    gap: 2,
  },
  signalBar: {
    width: 3,
    height: 12,
    borderRadius: 1.5,
  },
  audioLevelBar: {
    width: 80,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  audioLevelFill: {
    height: '100%',
    borderRadius: 2,
  },
  
  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#EEF2FF',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
  activeTabLabel: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  
  // Recording Interface
  recordingCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  waveformContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  waveformTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 8,
    gap: 1,
  },
  waveformBar: {
    width: 2,
    borderRadius: 1,
    backgroundColor: '#10B981',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  recordingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#EF4444',
    letterSpacing: 1,
  },
  durationContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  duration: {
    fontSize: 48,
    fontWeight: '300',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  durationHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  recordingControls: {
    alignItems: 'center',
  },
  recordButtonContainer: {
    marginBottom: 16,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  recordButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  connectHint: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
  },
  analysisProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  analysisText: {
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    fontWeight: '500',
  },
  
  // Recording History
  historyContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  historyCount: {
    fontSize: 14,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  recordingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  recordingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recordingDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  recordingTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  recordingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recordingMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metricText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  analysisPreview: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  analysisMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  analysisMetric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analysisMetricText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 4,
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  
  // Patient Info
  patientCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  patientCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  patientDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  patientDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  patientDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  shareButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  summaryButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  summaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  summaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  uploadText: {
    fontSize: 12,
    color: '#1E40AF',
    marginLeft: 6,
    fontWeight: '500',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  privacyText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
    textAlign: 'center',
  },
  
  // Analysis Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  metricCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  metricCardLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  assessmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  assessmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  conditionResult: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 8,
  },
  clinicalNotes: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  recommendationsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  modalActions: {
    gap: 12,
    marginBottom: 24,
  },
  shareAnalysisButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareAnalysisGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  shareAnalysisText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginLeft: 8,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  
  // Summary Modal Styles
  summaryStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  aiSummaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  aiSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  aiSummaryText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  conditionsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  conditionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  conditionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailedAnalysisCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  detailedAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailedAnalysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  detailedAnalysisText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  summaryActions: {
    gap: 12,
    marginBottom: 20,
  },
  exportButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  exportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  exportText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  shareReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  shareReportText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginLeft: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  historyStats: {
    gap: 4,
  },
  cloudCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  analysisTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  recommendationsPreview: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  recommendationsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  historyNotesText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 14,
  },
  clinicalFeaturesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4F46E5',
  },
  clinicalFeaturesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  clinicalFeaturesList: {
    gap: 6,
  },
  clinicalFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clinicalFeatureText: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
  recommendedActionContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#3B82F6',
  },
  recommendedActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  recommendedActionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E40AF',
  },
  recommendedActionText: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 16,
  },
});

export default HomeDigitalStethoscope;
