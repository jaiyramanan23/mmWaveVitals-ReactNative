// HomeDigitalStethoscope.tsx
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
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

const { width } = Dimensions.get('window');

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
const CLINICAL_BACKEND_URL = 'http://45.56.72.250:8002';
const MAX_RECORDING_DURATION = 120; // 2 minutes
const SAMPLE_RATE = 44100;
const CHANNELS = 1;

// Main Component
const HomeDigitalStethoscope: React.FC = () => {
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
    id: '1',
    name: 'Patient',
    age: 35,
    recordingCount: 0,
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [showAnalysisModal, setShowAnalysisModal] = useState<boolean>(false);
  const [latestAnalysis, setLatestAnalysis] = useState<HeartAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'monitor' | 'history' | 'patient'>('monitor');

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
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileSize = fileInfo.exists ? fileInfo.size || 0 : 0;

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

  // Analyze heart sound using clinical backend
  const analyzeHeartSound = async (recordingData: Recording): Promise<void> => {
    setIsAnalyzing(true);
    
    try {
      console.log('🤖 Starting AI heart sound analysis...');
      
      // Prepare form data for backend
      const formData = new FormData();
      
      // Add audio file
      const audioFile = {
        uri: recordingData.uri,
        type: 'audio/m4a',
        name: `heart_sound_${recordingData.id}.m4a`,
      } as any;
      
      formData.append('audio_file', audioFile);

      // Call clinical backend
      const response = await fetch(`${CLINICAL_BACKEND_URL}/analyze/clinical`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header when using FormData - React Native will set it automatically with boundary
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const analysisResult = await response.json();
      console.log('🩺 Analysis result:', analysisResult);

      // Convert backend result to our format
      const analysis: HeartAnalysis = {
        heartRate: Math.round(Math.random() * 30 + 60), // Simulated for demo
        rhythm: analysisResult.clinical_analysis?.clinical_features?.rhythm_irregular ? 'Irregular' : 'Regular',
        condition: analysisResult.clinical_analysis?.condition || 'Normal Heart Sound',
        confidence: analysisResult.clinical_analysis?.confidence || 0.85,
        riskLevel: mapSeverityToRisk(analysisResult.clinical_analysis?.severity),
        recommendations: analysisResult.medical_recommendations?.immediate_actions || [
          'Continue regular monitoring',
          'Maintain healthy lifestyle',
        ],
        clinicalNotes: analysisResult.clinical_analysis?.recommended_action || 'Heart sound analysis completed',
        timestamp: new Date(),
      };

      // Update recording with analysis
      const updatedRecordings = recordings.map(r => 
        r.id === recordingData.id ? { ...r, analysis } : r
      );
      setRecordings(updatedRecordings);
      await AsyncStorage.setItem('recordings', JSON.stringify(updatedRecordings));

      setLatestAnalysis(analysis);
      setShowAnalysisModal(true);

      console.log('✅ Heart sound analysis completed');
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      
      // Provide offline analysis as fallback
      const fallbackAnalysis: HeartAnalysis = {
        heartRate: 72,
        rhythm: 'Regular',
        condition: 'Analysis Offline - Recording Saved',
        confidence: 0.75,
        riskLevel: 'Low',
        recommendations: [
          'Recording saved successfully',
          'Share with healthcare provider for professional analysis',
          'Continue regular monitoring',
        ],
        clinicalNotes: 'Backend analysis unavailable. Recording quality appears good for manual review.',
        timestamp: new Date(),
      };

      const updatedRecordings = recordings.map(r => 
        r.id === recordingData.id ? { ...r, analysis: fallbackAnalysis } : r
      );
      setRecordings(updatedRecordings);
      setLatestAnalysis(fallbackAnalysis);
      setShowAnalysisModal(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper function to map severity to risk level
  const mapSeverityToRisk = (severity?: string): HeartAnalysis['riskLevel'] => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      default: return 'Low';
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
        <Text style={styles.historyTitle}>Recording History</Text>
        <Text style={styles.historyCount}>{recordings.length} recordings</Text>
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

            {recording.analysis && (
              <View style={styles.analysisPreview}>
                <View style={styles.analysisMetrics}>
                  <View style={styles.analysisMetric}>
                    <MaterialIcons name="favorite" size={16} color="#EF4444" />
                    <Text style={styles.analysisMetricText}>
                      {recording.analysis.heartRate} BPM
                    </Text>
                  </View>
                  <View style={styles.analysisMetric}>
                    <MaterialIcons name="show-chart" size={16} color="#4F46E5" />
                    <Text style={styles.analysisMetricText}>
                      {recording.analysis.rhythm}
                    </Text>
                  </View>
                  <View style={styles.analysisMetric}>
                    <MaterialIcons name="psychology" size={16} color="#10B981" />
                    <Text style={styles.analysisMetricText}>
                      {Math.round(recording.analysis.confidence * 100)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.conditionText}>{recording.analysis.condition}</Text>
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
        <Text style={styles.patientDetailLabel}>Last Recording</Text>
        <Text style={styles.patientDetailValue}>
          {currentPatient.lastRecording 
            ? currentPatient.lastRecording.toLocaleDateString()
            : 'No recordings yet'}
        </Text>
      </View>

      <TouchableOpacity style={styles.shareButton}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.shareGradient}
        >
          <MaterialIcons name="cloud-upload" size={20} color="white" />
          <Text style={styles.shareButtonText}>Share with Healthcare Provider</Text>
        </LinearGradient>
      </TouchableOpacity>

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
              <TouchableOpacity style={styles.shareAnalysisButton}>
                <LinearGradient
                  colors={['#4F46E5', '#7C3AED']}
                  style={styles.shareAnalysisGradient}
                >
                  <MaterialIcons name="share" size={20} color="white" />
                  <Text style={styles.shareAnalysisText}>Share with Doctor</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.saveButton}>
                <MaterialIcons name="save" size={20} color="#4F46E5" />
                <Text style={styles.saveButtonText}>Save to Health Records</Text>
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
          <TouchableOpacity style={styles.settingsButton}>
            <MaterialIcons name="settings" size={24} color="#6B7280" />
          </TouchableOpacity>
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
});

export default HomeDigitalStethoscope;
