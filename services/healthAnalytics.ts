// Health Analytics Service
import * as FileSystem from 'expo-file-system';
import { getAuth } from 'firebase/auth';
import {
    collection,
    doc,
    getDocs,
    limit,
    query,
    serverTimestamp,
    setDoc,
    where
} from 'firebase/firestore';
import {
    getDownloadURL,
    ref as storageRef,
    uploadBytes
} from 'firebase/storage';
import { firestore, storage } from './firebase';

// Validation helper
const validateAuthentication = () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('User must be authenticated to access heart analyses');
  }
  
  return currentUser;
};

// Types
export interface HeartAnalysisData {
  id: string;
  userId: string;
  patientName: string;
  audioUrl: string;
  audioFileName: string;
  duration: number;
  quality: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  
  // Backend Analysis Data (from clinical API)
  backendAnalysis: {
    heart_rate: number;
    clinical_analysis: {
      condition: string;
      confidence: number;
      severity: string;
      rhythm_irregular: boolean;
      clinical_features: any;
      recommended_action: string;
    };
    medical_recommendations: {
      immediate_actions: string[];
    };
    analysis_metadata: {
      processing_time: number;
      model_version: string;
      timestamp: string;
    };
  };
  
  // Processed fields for easy access and display
  heartRate: number;
  rhythm: 'Regular' | 'Irregular';
  condition: string;
  confidence: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  recommendations: string[];
  clinicalNotes: string;
  
  // Storage metadata
  fileSize?: number;
  deviceType?: string;
  analysisVersion?: string;
  
  timestamp: any; // Firestore Timestamp
  createdAt: any; // Firestore serverTimestamp
}

export interface PatientSummary {
  totalRecordings: number;
  averageHeartRate: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  conditionFrequency: Record<string, number>;
  recentTrends: string;
  aiInsights: string;
  lastRecording?: Date;
}

export const healthAnalyticsService = {
  // Upload audio file to Firebase Storage
  uploadAudioFile: async (
    audioUri: string, 
    userId: string, 
    recordingId: string
  ): Promise<{ downloadUrl: string; fileName: string }> => {
    try {
      console.log('📤 Uploading audio file to Firebase Storage...');
      console.log('🔍 Audio URI:', audioUri);
      console.log('🔍 User ID:', userId);
      console.log('🔍 Recording ID:', recordingId);
      
      // Read the audio file
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      console.log('🔍 File info:', fileInfo);
      
      if (!fileInfo.exists) {
        throw new Error('Audio file not found at URI: ' + audioUri);
      }
      
      console.log('✅ Audio file exists, size:', fileInfo.size);

      // Create a unique filename (use existing stethoscope_recordings path for now)
      const fileName = `stethoscope_recordings/${userId}/${recordingId}_${Date.now()}.m4a`;
      console.log('🔍 Generated filename (using existing path):', fileName);
      
      const audioRef = storageRef(storage, fileName);
      console.log('🔍 Storage reference created');
      
      // Read file as blob for upload
      console.log('📤 Converting file to blob...');
      const response = await fetch(audioUri);
      console.log('✅ Fetch response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('✅ Blob created, size:', blob.size, 'type:', blob.type);
      
      // Upload file
      console.log('☁️ Starting Firebase Storage upload...');
      const snapshot = await uploadBytes(audioRef, blob, {
        contentType: 'audio/m4a',
        customMetadata: {
          userId: userId,
          recordingId: recordingId,
          uploadedAt: new Date().toISOString()
        }
      });
      
      console.log('✅ Upload completed, snapshot:', snapshot.ref.fullPath);
      
      // Get download URL
      console.log('🔗 Getting download URL...');
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Audio file uploaded successfully:', fileName);
      console.log('🔗 Download URL:', downloadUrl);
      return { downloadUrl, fileName };
      
    } catch (error) {
      console.error('❌ Error uploading audio file:', error);
      console.error('🔍 Error details:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  },

  // Save heart analysis to Firestore (backend analysis data only)
  saveHeartAnalysis: async (
    analysisData: Omit<HeartAnalysisData, 'createdAt'>,
    audioUri: string
  ): Promise<string> => {
    try {
      console.log('💾 Saving backend heart analysis to Firestore...');
      console.log('🔍 Analysis data:', JSON.stringify(analysisData, null, 2));
      console.log('🔍 Audio URI:', audioUri);
      
      // Validate authentication
      const currentUser = validateAuthentication();
      console.log('🔐 Authenticated user for save:', currentUser.uid);
      
      // Check if user ID matches authenticated user
      if (analysisData.userId !== currentUser.uid) {
        const errorMsg = `User ID mismatch: provided ${analysisData.userId}, authenticated ${currentUser.uid}`;
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('✅ User ID validation passed');
      
      // Upload audio file first
      console.log('📤 Starting audio upload...');
      const { downloadUrl, fileName } = await healthAnalyticsService.uploadAudioFile(
        audioUri,
        analysisData.userId,
        analysisData.id
      );
      console.log('✅ Audio upload completed:', { downloadUrl, fileName });
      
      // Prepare document data (only backend analysis + processed fields)
      const docData: HeartAnalysisData = {
        ...analysisData,
        audioUrl: downloadUrl,
        audioFileName: fileName,
        createdAt: serverTimestamp()
      };
      
      console.log('📝 Prepared document data for Firestore');
      
      // Save to Firestore
      const docRef = doc(firestore, 'heartAnalyses', analysisData.id);
      console.log('🔥 Saving to Firestore collection: heartAnalyses, doc ID:', analysisData.id);
      
      await setDoc(docRef, docData);
      
      console.log('✅ Backend heart analysis saved successfully:', analysisData.id);
      return analysisData.id;
      
    } catch (error) {
      console.error('❌ Error saving backend heart analysis:', error);
      console.error('🔍 Error type:', typeof error);
      console.error('🔍 Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('🔍 Error message:', error instanceof Error ? error.message : String(error));
      console.error('🔍 Full error object:', error);
      throw error;
    }
  },

  // Get all backend heart analyses for a user (with simplified query)
  getUserHeartAnalyses: async (userId: string): Promise<HeartAnalysisData[]> => {
    try {
      console.log('📖 Fetching backend heart analyses for user:', userId);
      
      // Validate authentication
      const currentUser = validateAuthentication();
      console.log('🔐 Authenticated user:', currentUser.uid);
      
      // Check if user ID matches authenticated user
      if (userId !== currentUser.uid) {
        throw new Error(`User ID mismatch: provided ${userId}, authenticated ${currentUser.uid}`);
      }
      
      console.log('✅ Starting Firestore query...');
      
      // Try a simpler query first (without orderBy to avoid index issues)
      const q = query(
        collection(firestore, 'heartAnalyses'),
        where('userId', '==', userId),
        limit(10) // Reduce limit for testing
      );
      
      console.log('🔍 Query created, executing...');
      const querySnapshot = await getDocs(q);
      console.log('✅ Query executed successfully');
      
      const analyses: HeartAnalysisData[] = [];
      
      querySnapshot.forEach((doc) => {
        console.log('📄 Processing document:', doc.id);
        const data = doc.data() as HeartAnalysisData;
        analyses.push({
          ...data,
          id: doc.id
        });
      });
      
      console.log(`✅ Found ${analyses.length} backend heart analyses`);
      return analyses;
      
    } catch (error) {
      console.error('❌ Error fetching backend heart analyses:', error);
      console.error('🔍 Debug info - User ID:', userId);
      console.error('🔍 Debug info - Error details:', error instanceof Error ? error.message : String(error));
      console.error('🔍 Error code:', (error as any)?.code);
      console.error('🔍 Error details:', (error as any)?.details);
      throw error;
    }
  },

  // Generate patient summary with analytics (using backend data + OpenAI insights)
  generatePatientSummary: async (userId: string): Promise<PatientSummary> => {
    try {
      console.log('📊 Generating patient summary from backend analyses for user:', userId);
      
      const analyses = await healthAnalyticsService.getUserHeartAnalyses(userId);
      
      if (analyses.length === 0) {
        return {
          totalRecordings: 0,
          averageHeartRate: 0,
          riskDistribution: { low: 0, medium: 0, high: 0 },
          conditionFrequency: {},
          recentTrends: 'No recordings available',
          aiInsights: 'No data available for analysis',
        };
      }
      
      // Calculate analytics from backend data
      const totalRecordings = analyses.length;
      const averageHeartRate = Math.round(
        analyses.reduce((sum, analysis) => sum + analysis.heartRate, 0) / totalRecordings
      );
      
      // Risk distribution
      const riskDistribution = analyses.reduce(
        (acc, analysis) => {
          acc[analysis.riskLevel.toLowerCase() as keyof typeof acc]++;
          return acc;
        },
        { low: 0, medium: 0, high: 0 }
      );
      
      // Condition frequency
      const conditionFrequency = analyses.reduce((acc, analysis) => {
        acc[analysis.condition] = (acc[analysis.condition] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Recent trends (last 10 recordings)
      const recentAnalyses = analyses.slice(0, 10);
      const recentTrends = healthAnalyticsService.calculateTrends(recentAnalyses);
      
      // Generate AI insights using OpenAI (separate from stored backend data)
      const aiInsights = await healthAnalyticsService.generateAIInsights(analyses);
      
      // Last recording date
      const lastRecording = analyses[0]?.timestamp?.toDate();
      
      const summary: PatientSummary = {
        totalRecordings,
        averageHeartRate,
        riskDistribution,
        conditionFrequency,
        recentTrends,
        aiInsights,
        lastRecording
      };
      
      console.log('✅ Patient summary generated successfully from backend data');
      return summary;
      
    } catch (error) {
      console.error('❌ Error generating patient summary:', error);
      throw error;
    }
  },

  // Calculate trends from recent analyses
  calculateTrends: (analyses: HeartAnalysisData[]): string => {
    if (analyses.length < 2) return 'Insufficient data for trend analysis';
    
    const heartRates = analyses.map(a => a.heartRate);
    const riskLevels = analyses.map(a => a.riskLevel);
    
    // Heart rate trend
    const avgRecent = heartRates.slice(0, 5).reduce((a, b) => a + b, 0) / Math.min(5, heartRates.length);
    const avgOlder = heartRates.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, heartRates.slice(-5).length);
    
    let trend = '';
    if (avgRecent > avgOlder + 5) {
      trend = 'Heart rate trending upward';
    } else if (avgRecent < avgOlder - 5) {
      trend = 'Heart rate trending downward';
    } else {
      trend = 'Heart rate stable';
    }
    
    // Risk trend
    const recentHighRisk = riskLevels.slice(0, 5).filter(r => r === 'High').length;
    const olderHighRisk = riskLevels.slice(-5).filter(r => r === 'High').length;
    
    if (recentHighRisk > olderHighRisk) {
      trend += ', risk levels increasing';
    } else if (recentHighRisk < olderHighRisk) {
      trend += ', risk levels improving';
    } else {
      trend += ', risk levels stable';
    }
    
    return trend;
  },

  // Generate AI insights using OpenAI (analytics only - not stored with backend data)
  generateAIInsights: async (analyses: HeartAnalysisData[]): Promise<string> => {
    try {
      console.log('🤖 Generating OpenAI insights from backend analysis data...');
      
      // Prepare summary data from backend analyses for OpenAI
      const summaryData = {
        totalRecordings: analyses.length,
        averageHeartRate: Math.round(
          analyses.reduce((sum, a) => sum + a.heartRate, 0) / analyses.length
        ),
        conditions: analyses.map(a => a.condition),
        riskLevels: analyses.map(a => a.riskLevel),
        confidenceScores: analyses.map(a => a.confidence),
        backendModels: analyses.map(a => a.backendAnalysis?.analysis_metadata?.model_version).filter(Boolean),
        recentRecordings: analyses.slice(0, 5).map(a => ({
          heartRate: a.heartRate,
          condition: a.condition,
          riskLevel: a.riskLevel,
          confidence: a.confidence,
          severity: a.backendAnalysis?.clinical_analysis?.severity,
          date: a.timestamp?.toDate?.()?.toLocaleDateString() || 'Unknown'
        }))
      };
      
      const prompt = `
As a clinical AI assistant, analyze this patient's heart sound monitoring data from our clinical backend API and provide insights:

Backend Analysis Summary:
- Total clinical recordings: ${summaryData.totalRecordings}
- Average heart rate: ${summaryData.averageHeartRate} BPM
- Conditions detected: ${summaryData.conditions.slice(0, 5).join(', ')}
- Risk level distribution: ${summaryData.riskLevels.join(', ')}
- Backend analysis confidence: ${Math.round(summaryData.confidenceScores.reduce((a, b) => a + b, 0) / summaryData.confidenceScores.length * 100)}%
- Analysis models used: ${[...new Set(summaryData.backendModels)].join(', ')}

Recent Backend Analysis Results:
${summaryData.recentRecordings.map(r => 
  `- ${r.date}: ${r.heartRate} BPM, ${r.condition}, Risk: ${r.riskLevel}, Severity: ${r.severity} (${Math.round(r.confidence * 100)}% confidence)`
).join('\n')}

Please provide:
1. Overall heart health assessment based on backend analysis trends
2. Key patterns observed in the clinical data
3. Recommended monitoring frequency and follow-up actions
4. Any areas requiring immediate medical attention

Keep the response concise, professional, and actionable (max 300 words).
Note: This analysis is based on AI backend processing and is for informational purposes only.
`;

      // Call OpenAI API for analytics insights
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}` // Add this to your .env
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a medical AI assistant specializing in cardiovascular health analysis. Provide professional, evidence-based insights based on clinical backend analysis results. Emphasize that this is for informational purposes and not a substitute for professional medical advice.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 400,
          temperature: 0.3
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      const data = await response.json();
      const insights = data.choices[0]?.message?.content || 'Unable to generate insights at this time.';
      
      console.log('✅ OpenAI insights generated successfully from backend data');
      return insights;
      
    } catch (error) {
      console.error('❌ Error generating OpenAI insights:', error);
      return 'AI insights temporarily unavailable. Backend analysis data is stored and available for review.';
    }
  }
};

export default healthAnalyticsService;
