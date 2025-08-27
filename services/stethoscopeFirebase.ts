// Firebase services for stethoscope data management
import { initializeApp } from 'firebase/app';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    where
} from 'firebase/firestore';
import {
    deleteObject,
    getDownloadURL,
    getStorage,
    ref as storageRef,
    uploadBytes
} from 'firebase/storage';

// Firebase config (should match your main firebase.ts)
const firebaseConfig = {
  apiKey: "AIzaSyAJLZxsyX_WcgFUzB3IawQ-aV9Dx_r9Ov8",
  authDomain: "remote-vitals-kit.firebaseapp.com",
  databaseURL: "https://remote-vitals-kit-default-rtdb.firebaseio.com",
  projectId: "remote-vitals-kit",
  storageBucket: "remote-vitals-kit.firebasestorage.app",
  messagingSenderId: "606518953740",
  appId: "1:606518953740:web:ec13187bf7462179292b29",
  measurementId: "G-RJSFFFB2SP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Types
export interface FirebaseHeartAnalysis {
  id?: string;
  patientId: string;
  recordingId: string;
  audioUrl: string;
  heartRate: number;
  rhythm: 'Regular' | 'Irregular';
  condition: string;
  confidence: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  recommendations: string[];
  clinicalNotes: string;
  timestamp: any; // Firestore timestamp
  deviceInfo?: {
    deviceName: string;
    signalQuality: number;
    recordingDuration: number;
    recordingQuality: string;
  };
  backendAnalysis?: any; // Raw backend response
}

export interface PatientSummary {
  id: string;
  patientId: string;
  totalRecordings: number;
  avgHeartRate: number;
  lastRecording: any;
  riskTrend: 'Improving' | 'Stable' | 'Declining';
  commonConditions: string[];
  aiSummary: string;
  detailedAnalysis: string;
  generatedAt: any;
}

class StethoscopeFirebaseService {
  
  // Upload audio file to Firebase Storage
  async uploadAudioFile(audioUri: string, patientId: string, recordingId: string): Promise<string> {
    try {
      console.log('📤 Uploading audio file to Firebase Storage...');
      
      // Read the file as a blob
      const response = await fetch(audioUri);
      const blob = await response.blob();
      
      // Create storage reference
      const audioRef = storageRef(
        storage, 
        `stethoscope-recordings/${patientId}/${recordingId}.m4a`
      );
      
      // Upload file
      const snapshot = await uploadBytes(audioRef, blob);
      console.log('✅ Audio uploaded successfully');
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('🔗 Audio URL generated:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('❌ Audio upload failed:', error);
      throw new Error('Failed to upload audio file');
    }
  }
  
  // Save analysis to Firestore
  async saveAnalysis(analysisData: Omit<FirebaseHeartAnalysis, 'id'>): Promise<string> {
    try {
      console.log('💾 Saving analysis to Firestore...');
      
      const analysisDoc = {
        ...analysisData,
        timestamp: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'heart_analyses'), analysisDoc);
      console.log('✅ Analysis saved with ID:', docRef.id);
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Failed to save analysis:', error);
      throw new Error('Failed to save analysis to database');
    }
  }
  
  // Get all analyses for a patient
  async getPatientAnalyses(patientId: string): Promise<FirebaseHeartAnalysis[]> {
    try {
      console.log('📖 Fetching patient analyses...');
      
      const q = query(
        collection(db, 'heart_analyses'),
        where('patientId', '==', patientId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const analyses: FirebaseHeartAnalysis[] = [];
      
      querySnapshot.forEach((doc) => {
        analyses.push({
          id: doc.id,
          ...doc.data()
        } as FirebaseHeartAnalysis);
      });
      
      console.log(`✅ Found ${analyses.length} analyses for patient`);
      return analyses;
    } catch (error) {
      console.error('❌ Failed to fetch analyses:', error);
      throw new Error('Failed to fetch patient analyses');
    }
  }
  
  // Get recent analyses (last N recordings)
  async getRecentAnalyses(patientId: string, limitCount: number = 10): Promise<FirebaseHeartAnalysis[]> {
    try {
      const q = query(
        collection(db, 'heart_analyses'),
        where('patientId', '==', patientId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const analyses: FirebaseHeartAnalysis[] = [];
      
      querySnapshot.forEach((doc) => {
        analyses.push({
          id: doc.id,
          ...doc.data()
        } as FirebaseHeartAnalysis);
      });
      
      return analyses;
    } catch (error) {
      console.error('❌ Failed to fetch recent analyses:', error);
      return [];
    }
  }
  
  // Generate patient summary using OpenAI
  async generatePatientSummary(patientId: string): Promise<PatientSummary | null> {
    try {
      console.log('🤖 Generating AI patient summary...');
      
      // Get all patient analyses
      const analyses = await this.getPatientAnalyses(patientId);
      
      if (analyses.length === 0) {
        console.log('No analyses found for patient');
        return null;
      }
      
      // Calculate summary statistics
      const totalRecordings = analyses.length;
      const avgHeartRate = analyses.reduce((sum, a) => sum + a.heartRate, 0) / totalRecordings;
      const lastRecording = analyses[0].timestamp;
      
      // Determine risk trend
      const recentAnalyses = analyses.slice(0, 5);
      const olderAnalyses = analyses.slice(5, 10);
      const recentRiskScore = this.calculateRiskScore(recentAnalyses);
      const olderRiskScore = this.calculateRiskScore(olderAnalyses);
      
      let riskTrend: 'Improving' | 'Stable' | 'Declining' = 'Stable';
      if (recentRiskScore < olderRiskScore - 0.1) riskTrend = 'Improving';
      else if (recentRiskScore > olderRiskScore + 0.1) riskTrend = 'Declining';
      
      // Get common conditions
      const conditionCounts: { [key: string]: number } = {};
      analyses.forEach(a => {
        conditionCounts[a.condition] = (conditionCounts[a.condition] || 0) + 1;
      });
      const commonConditions = Object.entries(conditionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([condition]) => condition);
      
      // Generate AI summary using OpenAI
      const aiSummary = await this.generateAISummary(analyses);
      const detailedAnalysis = await this.generateDetailedAnalysis(analyses);
      
      const summary: PatientSummary = {
        id: `${patientId}_summary`,
        patientId,
        totalRecordings,
        avgHeartRate: Math.round(avgHeartRate),
        lastRecording,
        riskTrend,
        commonConditions,
        aiSummary,
        detailedAnalysis,
        generatedAt: serverTimestamp()
      };
      
      // Save summary to Firestore
      await this.savePatientSummary(summary);
      
      console.log('✅ Patient summary generated successfully');
      return summary;
    } catch (error) {
      console.error('❌ Failed to generate patient summary:', error);
      return null;
    }
  }
  
  // Calculate risk score from analyses
  private calculateRiskScore(analyses: FirebaseHeartAnalysis[]): number {
    if (analyses.length === 0) return 0;
    
    const riskValues = { 'Low': 0.2, 'Medium': 0.5, 'High': 0.8 };
    const avgRisk = analyses.reduce((sum, a) => sum + riskValues[a.riskLevel], 0) / analyses.length;
    return avgRisk;
  }
  
  // Generate AI summary using OpenAI
  private async generateAISummary(analyses: FirebaseHeartAnalysis[]): Promise<string> {
    try {
      const prompt = this.createSummaryPrompt(analyses);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'your-openai-api-key'}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a medical AI assistant specializing in cardiac health analysis. Provide concise, professional summaries of patient heart sound data.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      });
      
      if (!response.ok) {
        throw new Error('OpenAI API request failed');
      }
      
      const data = await response.json();
      return data.choices[0]?.message?.content || 'AI summary unavailable';
    } catch (error) {
      console.error('❌ OpenAI summary generation failed:', error);
      return 'AI analysis temporarily unavailable. Please consult with healthcare provider for detailed assessment.';
    }
  }
  
  // Generate detailed analysis using OpenAI
  private async generateDetailedAnalysis(analyses: FirebaseHeartAnalysis[]): Promise<string> {
    try {
      const prompt = this.createDetailedPrompt(analyses);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'your-openai-api-key'}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a cardiologist AI providing detailed analysis of patient heart sound recordings. Include trends, patterns, and clinical insights.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      });
      
      if (!response.ok) {
        throw new Error('OpenAI API request failed');
      }
      
      const data = await response.json();
      return data.choices[0]?.message?.content || 'Detailed analysis unavailable';
    } catch (error) {
      console.error('❌ OpenAI detailed analysis failed:', error);
      return 'Detailed analysis temporarily unavailable. Historical data shows recorded heart sounds for clinical review.';
    }
  }
  
  // Create summary prompt for OpenAI
  private createSummaryPrompt(analyses: FirebaseHeartAnalysis[]): string {
    const recentAnalyses = analyses.slice(0, 5);
    const heartRates = recentAnalyses.map(a => a.heartRate);
    const conditions = recentAnalyses.map(a => a.condition);
    const riskLevels = recentAnalyses.map(a => a.riskLevel);
    
    return `Analyze this patient's recent heart sound recordings and provide a concise medical summary:

Recent Heart Rates: ${heartRates.join(', ')} BPM
Detected Conditions: ${conditions.join(', ')}
Risk Levels: ${riskLevels.join(', ')}
Total Recordings: ${analyses.length}

Please provide:
1. Overall cardiac health status
2. Key trends or patterns
3. Any concerns or positive indicators
4. Brief recommendations

Keep response under 300 words and use professional medical language.`;
  }
  
  // Create detailed prompt for OpenAI
  private createDetailedPrompt(analyses: FirebaseHeartAnalysis[]): string {
    const analysisData = analyses.slice(0, 10).map(a => ({
      date: a.timestamp,
      heartRate: a.heartRate,
      rhythm: a.rhythm,
      condition: a.condition,
      riskLevel: a.riskLevel,
      confidence: a.confidence
    }));
    
    return `Provide a detailed cardiac analysis for this patient based on their heart sound recording history:

Recording Data:
${JSON.stringify(analysisData, null, 2)}

Please provide a comprehensive analysis including:
1. Temporal trends in heart rate and rhythm
2. Pattern analysis of detected conditions
3. Risk assessment progression
4. Clinical significance of findings
5. Recommendations for monitoring or follow-up
6. Comparison with normal cardiac parameters

Use professional medical terminology and provide actionable insights for healthcare providers.`;
  }
  
  // Save patient summary
  private async savePatientSummary(summary: PatientSummary): Promise<void> {
    try {
      await setDoc(doc(db, 'patient_summaries', summary.id), summary);
      console.log('✅ Patient summary saved');
    } catch (error) {
      console.error('❌ Failed to save patient summary:', error);
    }
  }
  
  // Get patient summary
  async getPatientSummary(patientId: string): Promise<PatientSummary | null> {
    try {
      const summaryDoc = await getDoc(doc(db, 'patient_summaries', `${patientId}_summary`));
      
      if (summaryDoc.exists()) {
        return summaryDoc.data() as PatientSummary;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to get patient summary:', error);
      return null;
    }
  }
  
  // Delete analysis and associated audio file
  async deleteAnalysis(analysisId: string, audioUrl: string): Promise<void> {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'heart_analyses', analysisId));
      
      // Delete audio file from Storage
      const audioRef = storageRef(storage, audioUrl);
      await deleteObject(audioRef);
      
      console.log('✅ Analysis and audio file deleted');
    } catch (error) {
      console.error('❌ Failed to delete analysis:', error);
      throw error;
    }
  }
}

export const stethoscopeFirebaseService = new StethoscopeFirebaseService();
