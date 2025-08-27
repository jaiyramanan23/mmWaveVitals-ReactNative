/**
 * React Native Backend Integration
 * Service to connect React Native app with Python backend
 */

import { Platform } from 'react-native';

interface BackendConfig {
  baseUrl: string;
  timeout: number;
  apiVersion: string;
}

interface AudioAnalysisRequest {
  patientAge?: number;
  patientGender?: string;
  medicalHistory?: string;
  symptoms?: string;
}

interface AudioAnalysisResponse {
  success: boolean;
  analysis_id: string;
  audio_quality: {
    quality_score: number;
    signal_to_noise_ratio: number;
    duration_seconds: number;
    sample_rate: number;
    processing_applied: string[];
  };
  classification: {
    primary_diagnosis: string;
    confidence: number;
    heart_rate_bpm: number;
    rhythm_type: string;
    sound_quality: string;
    murmur_detected: boolean;
    murmur_grade?: number;
    abnormalities: string[];
  };
  medical_analysis: {
    overall_assessment: string;
    risk_level: string;
    clinical_findings: string[];
    recommendations: string[];
    follow_up_required: boolean;
    specialist_referral?: string;
  };
  patient_report: {
    summary: string;
    explanation: string;
    next_steps: string[];
    when_to_seek_help: string[];
    lifestyle_advice: string[];
  };
  metadata: {
    processing_time_seconds: number;
    model_version: string;
    analysis_timestamp: string;
    confidence_threshold: number;
    limitations: string[];
  };
  error?: string;
  warnings: string[];
}

export class HeartSoundBackendService {
  private config: BackendConfig;
  
  constructor() {
    // Platform-specific backend URLs
    const isDevelopment = __DEV__;
    
    if (isDevelopment) {
      // Development URLs - using local network IP for device connectivity
      this.config = {
        baseUrl: Platform.select({
          ios: 'http://45.56.72.250:8002',
          android: 'http://45.56.72.250:8002',
          default: 'http://45.56.72.250:8002'
        }),
        timeout: 60000, // 60 seconds for AI analysis
        apiVersion: 'v1'
      };
    } else {
      // Production URL - update this with your deployed backend
      this.config = {
        baseUrl: 'http://45.56.72.250:8002',
        timeout: 60000,
        apiVersion: 'v1'
      };
    }
  }

  /**
   * Helper method for fetch with timeout using AbortController
   */
  private async fetchWithTimeout(url: string, options: any = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = options.timeout || this.config.timeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const { timeout: _, ...fetchOptions } = options; // Remove timeout from options
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Analyze heart sound with backend AI
   */
  async analyzeHeartSound(
    audioUri: string, 
    patientData?: AudioAnalysisRequest
  ): Promise<AudioAnalysisResponse> {
    try {
      // Check backend health first
      const isHealthy = await this.checkBackendHealth();
      if (!isHealthy) {
        return this.createFallbackResponse('Backend service is currently unavailable');
      }

      // Prepare form data
      const formData = new FormData();
      
      // Add audio file
      formData.append('audio_file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'heart_sound.m4a',
      } as any);
      
      // Add patient data if provided
      if (patientData) {
        Object.entries(patientData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
          }
        });
      }

      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/analyze/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
        timeout: this.config.timeout,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend analysis failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result;
      
    } catch (error: any) {
      console.error('❌ Heart sound analysis failed:', error);
      
      // Return fallback response for various error types
      if (error.message.includes('timeout') || error.message.includes('network')) {
        return this.createFallbackResponse('Network timeout - please check your connection and try again');
      } else if (error.message.includes('Backend analysis failed')) {
        return this.createFallbackResponse('Backend processing error - please try again later');
      } else {
        return this.createFallbackResponse(`Analysis error: ${error.message}`);
      }
    }
  }

  /**
   * Check if backend is healthy and ready
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/health`, {
        method: 'GET',
        timeout: 10000, // 10 second timeout for health check
      });

      if (response.ok) {
        const health = await response.json();
        return health.status === 'healthy';
      }
      
      return false;
    } catch (error) {
      console.warn('⚠️ Backend health check failed:', error);
      return false;
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/models/info`, {
        method: 'GET',
        timeout: 10000,
      });

      if (response.ok) {
        return await response.json();
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Failed to get model info:', error);
      return null;
    }
  }

  /**
   * Batch analyze multiple audio files
   */
  async batchAnalyze(audioUris: string[]): Promise<any> {
    try {
      const formData = new FormData();
      
      audioUris.forEach((uri, index) => {
        formData.append('audio_files', {
          uri: uri,
          type: 'audio/m4a',
          name: `heart_sound_${index}.m4a`,
        } as any);
      });

      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/analyze/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
        timeout: this.config.timeout * audioUris.length,
      });

      if (response.ok) {
        return await response.json();
      }
      
      throw new Error(`Batch analysis failed: ${response.status}`);
    } catch (error) {
      console.error('❌ Batch analysis failed:', error);
      throw error;
    }
  }

  /**
   * Create fallback response when backend is unavailable
   */
  private createFallbackResponse(errorMessage: string): AudioAnalysisResponse {
    return {
      success: false,
      analysis_id: `fallback_${Date.now()}`,
      audio_quality: {
        quality_score: 0.5,
        signal_to_noise_ratio: 0,
        duration_seconds: 0,
        sample_rate: 44100,
        processing_applied: ['fallback_mode']
      },
      classification: {
        primary_diagnosis: 'analysis_unavailable',
        confidence: 0,
        heart_rate_bpm: 0,
        rhythm_type: 'unknown',
        sound_quality: 'unknown',
        murmur_detected: false,
        abnormalities: []
      },
      medical_analysis: {
        overall_assessment: 'Unable to complete analysis due to technical issues.',
        risk_level: 'unknown',
        clinical_findings: [],
        recommendations: [
          'Please try the analysis again when network connectivity is restored',
          'If problems persist, consult with a healthcare professional for manual heart sound evaluation'
        ],
        follow_up_required: true
      },
      patient_report: {
        summary: 'Heart sound analysis could not be completed at this time.',
        explanation: 'Our AI analysis system is temporarily unavailable. This could be due to network connectivity issues or backend maintenance.',
        next_steps: [
          'Check your internet connection and try again',
          'Wait a few minutes and retry the analysis',
          'If the issue persists, contact technical support'
        ],
        when_to_seek_help: [
          'If you experience chest pain or discomfort',
          'If you have difficulty breathing',
          'If you feel dizzy or lightheaded',
          'If you have any concerns about your heart health'
        ],
        lifestyle_advice: [
          'Continue monitoring your heart health regularly',
          'Maintain a healthy diet and exercise routine',
          'Take any prescribed medications as directed'
        ]
      },
      metadata: {
        processing_time_seconds: 0,
        model_version: 'fallback_v1.0',
        analysis_timestamp: new Date().toISOString(),
        confidence_threshold: 0.8,
        limitations: [
          'This is a fallback response due to backend unavailability',
          'No actual AI analysis was performed',
          'Please retry when service is restored'
        ]
      },
      error: errorMessage,
      warnings: [
        'Backend analysis service is currently unavailable',
        'This is a fallback response with limited functionality',
        'Please try again later or contact support if issues persist'
      ]
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): BackendConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const heartSoundBackend = new HeartSoundBackendService();

// Debug: Log the service creation
console.log('🔧 HeartSoundBackendService created:', !!heartSoundBackend);
console.log('🔧 analyzeHeartSound method available:', typeof heartSoundBackend.analyzeHeartSound);
