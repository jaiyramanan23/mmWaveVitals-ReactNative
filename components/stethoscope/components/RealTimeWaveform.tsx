import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface RealTimeWaveformProps {
  data: number[];
  width: number;
  height: number;
  isRecording: boolean;
  audioLevel?: number;
  showGrid?: boolean;
  showHeartBeats?: boolean;
  color?: string;
  backgroundColor?: string;
}

const RealTimeWaveform: React.FC<RealTimeWaveformProps> = ({
  data,
  width,
  height,
  isRecording,
  audioLevel = 0,
  showGrid = false,
  showHeartBeats = false,
  color = '#0066CC',
  backgroundColor = '#F9FAFB',
}) => {
  const scanAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.timing(scanAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      scanAnimation.setValue(0);
    }
  }, [isRecording]);

  // Simplified version - just show a waveform placeholder
  return (
    <View style={[styles.container, { width, height, backgroundColor }]}>
      <View style={styles.waveformPlaceholder}>
        <Text style={styles.waveformText}>🎵 Heart Sound Waveform</Text>
        <Text style={styles.statusText}>
          {isRecording ? '● Recording...' : '○ Ready to Record'}
        </Text>
        {audioLevel > 0 && (
          <View style={styles.levelContainer}>
            <Text style={styles.levelText}>Audio Level: {Math.round(audioLevel * 100)}%</Text>
            <View style={styles.levelBar}>
              <View 
                style={[
                  styles.levelIndicator, 
                  { width: `${audioLevel * 100}%`, backgroundColor: color }
                ]} 
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
};const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: 2,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: 50,
    opacity: 0.3,
    borderRadius: 25,
  },
  heartPulse: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: '#EF4444',
    borderRadius: 10,
  },
  waveformPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  waveformText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  levelContainer: {
    width: '100%',
    alignItems: 'center',
  },
  levelText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  levelBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  levelIndicator: {
    height: '100%',
    borderRadius: 4,
  },
});

export default RealTimeWaveform;
