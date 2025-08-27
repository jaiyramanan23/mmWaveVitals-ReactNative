/**
 * GPT Integration Service for Heart Health AI Assistant
 * Provides natural language processing and personalized responses
 */

interface GPTResponse {
  message: string;
  suggestions: string[];
  needsFollow?: boolean;
}

interface HeartAnalysisData {
  heartRate: number;
  rhythm: string;
  confidence: number;
  findings: string[];
  recommendations: string[];
}

export class GPTHeartAssistant {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
  }

  /**
   * Generate personalized pre-analysis instructions
   */
  async generatePreAnalysisInstructions(userProfile?: any): Promise<GPTResponse> {
    try {
      const prompt = `
        You are a friendly AI heart health assistant. Generate warm, encouraging instructions for a user about to have their heart sounds analyzed. 

        User context: ${userProfile ? `Age: ${userProfile.age}, Previous recordings: ${userProfile.recordingCount || 0}` : 'First-time user'}

        Provide:
        1. A welcoming message (2-3 sentences)
        2. 3 key preparation tips
        3. Reassuring tone

        Keep it conversational and supportive, like Siri would speak.
      `;

      const response = await this.callGPT(prompt);
      
      return {
        message: response,
        suggestions: [
          "Make sure you're in a quiet environment",
          "Sit comfortably and relax",
          "Ensure good stethoscope contact"
        ]
      };
    } catch (error) {
      console.error('GPT pre-analysis error:', error);
      return this.getFallbackPreAnalysis();
    }
  }

  /**
   * Generate personalized analysis results explanation
   */
  async explainResults(analysisData: HeartAnalysisData, userProfile?: any): Promise<GPTResponse> {
    try {
      const prompt = `
        You are an AI heart health assistant explaining heart sound analysis results to a patient. 

        Analysis Results:
        - Heart Rate: ${analysisData.heartRate} BPM
        - Rhythm: ${analysisData.rhythm}
        - Confidence: ${analysisData.confidence}%
        - Findings: ${analysisData.findings.join(', ')}

        User context: ${userProfile ? `Age: ${userProfile.age}` : 'Adult'}

        Provide:
        1. A clear, reassuring explanation of the results
        2. What these numbers mean in simple terms
        3. Next steps or recommendations
        4. When to consult a doctor (if needed)

        Be supportive, clear, and avoid medical jargon. Sound like a knowledgeable but caring assistant.
      `;

      const response = await this.callGPT(prompt);
      
      return {
        message: response,
        suggestions: analysisData.recommendations,
        needsFollow: analysisData.findings.some(f => 
          f.toLowerCase().includes('irregular') || 
          f.toLowerCase().includes('murmur') ||
          f.toLowerCase().includes('abnormal')
        )
      };
    } catch (error) {
      console.error('GPT results explanation error:', error);
      return this.getFallbackResultsExplanation(analysisData);
    }
  }

  /**
   * Generate motivational health tips
   */
  async generateHealthTips(userProfile?: any): Promise<string[]> {
    try {
      const prompt = `
        Generate 3 personalized heart health tips for a user who just completed a heart sound analysis.

        User context: ${userProfile ? `Age: ${userProfile.age}, Activity level: ${userProfile.activityLevel || 'moderate'}` : 'General user'}

        Make them:
        1. Actionable and specific
        2. Encouraging and positive
        3. Easy to implement

        Return as a simple list.
      `;

      const response = await this.callGPT(prompt);
      
      return response.split('\n').filter(tip => tip.trim().length > 0).slice(0, 3);
    } catch (error) {
      console.error('GPT health tips error:', error);
      return this.getFallbackHealthTips();
    }
  }

  /**
   * Answer user questions about heart health
   */
  async answerQuestion(question: string, context?: string): Promise<GPTResponse> {
    try {
      const prompt = `
        You are a knowledgeable but careful AI heart health assistant. A user is asking: "${question}"

        Context: ${context || 'General heart health inquiry'}

        Provide:
        1. A helpful, accurate answer
        2. Important disclaimers about consulting healthcare professionals
        3. Encourage professional medical advice for specific concerns

        Be informative but always emphasize the importance of professional medical care.
      `;

      const response = await this.callGPT(prompt);
      
      return {
        message: response,
        suggestions: [
          "Consult with your doctor",
          "Keep track of symptoms",
          "Continue regular monitoring"
        ]
      };
    } catch (error) {
      console.error('GPT question answering error:', error);
      return this.getFallbackAnswer();
    }
  }

  /**
   * Private method to call GPT API
   */
  private async callGPT(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a friendly, knowledgeable AI heart health assistant. Provide accurate, helpful information while always encouraging users to consult healthcare professionals for medical advice.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`GPT API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Fallback responses when GPT is unavailable
   */
  private getFallbackPreAnalysis(): GPTResponse {
    return {
      message: "Welcome! I'm here to help analyze your heart sounds. Let's take a moment to ensure you're comfortable and ready. Remember, this analysis is for informational purposes and should complement, not replace, professional medical care.",
      suggestions: [
        "Find a quiet, comfortable space",
        "Ensure your stethoscope is clean and properly connected",
        "Take a few deep breaths to relax"
      ]
    };
  }

  private getFallbackResultsExplanation(data: HeartAnalysisData): GPTResponse {
    const isNormal = data.heartRate >= 60 && data.heartRate <= 100 && data.rhythm.toLowerCase().includes('normal');
    
    return {
      message: isNormal 
        ? `Great news! Your heart rate of ${data.heartRate} BPM is within the normal range, and your rhythm appears ${data.rhythm.toLowerCase()}. Your heart sounds are showing good patterns with ${data.confidence}% confidence in the analysis.`
        : `Your analysis shows a heart rate of ${data.heartRate} BPM with ${data.rhythm.toLowerCase()} rhythm. While this analysis provides valuable insights, I recommend discussing these results with your healthcare provider for proper interpretation.`,
      suggestions: data.recommendations,
      needsFollow: !isNormal
    };
  }

  private getFallbackHealthTips(): string[] {
    return [
      "Take a 10-minute walk daily to strengthen your heart",
      "Practice deep breathing exercises to reduce stress",
      "Stay hydrated and maintain a balanced diet"
    ];
  }

  private getFallbackAnswer(): GPTResponse {
    return {
      message: "I'd be happy to help with general heart health information. However, for specific medical questions or concerns about your heart health, I always recommend consulting with a qualified healthcare professional who can provide personalized medical advice.",
      suggestions: [
        "Schedule a check-up with your doctor",
        "Keep a health diary",
        "Monitor your symptoms"
      ]
    };
  }
}

// Export singleton instance
export const gptAssistant = new GPTHeartAssistant();
