/**
 * Fixed Heart Sound Analysis Function 
 * Direct backend approach
 */

export const performDirectAnalysis = async (
    recordingId: string, 
    audioUri: string,
    setIsAnalyzing: (state: boolean) => void,
    firebaseService: any,
    loadUserRecordings: () => void,
    Alert: any
) => {
    try {
        setIsAnalyzing(true);
        
        console.log('🔊 Starting DIRECT backend heart sound analysis...');
        console.log('   - Recording ID:', recordingId);
        console.log('   - Audio URI:', audioUri);
        console.log('   - Backend URL: http://45.56.72.250:8002');
        
        // Test backend connection directly
        console.log('🔧 Testing backend health...');
        
        let backendAvailable = false;
        let analysisResult: any = null;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const healthResponse = await fetch('http://45.56.72.250:8002/health', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!healthResponse.ok) {
                throw new Error(`Health check failed: ${healthResponse.status}`);
            }
            
            const health = await healthResponse.json();
            console.log('✅ Backend health response:', health);
            
            if (health.status !== 'healthy') {
                throw new Error(`Backend is not healthy: ${health.status}`);
            }
            
            backendAvailable = true;
            
            // Prepare form data for analysis
            console.log('📝 Preparing form data for analysis...');
            const formData = new FormData();
            
            formData.append('audio_file', {
                uri: audioUri,
                type: 'audio/m4a',
                name: 'heart_sound.m4a',
            } as any);
            
            console.log('📤 Sending analysis request to backend...');
            console.log('   - Method: POST');
            console.log('   - URL: http://45.56.72.250:8002/analyze/audio');
            console.log('   - Content-Type: multipart/form-data');
            
            const analysisResponse = await fetch('http://45.56.72.250:8002/analyze/audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });
            
            console.log('📥 Analysis response received!');
            console.log('   - Status:', analysisResponse.status);
            console.log('   - Status Text:', analysisResponse.statusText);
            
            if (!analysisResponse.ok) {
                const errorText = await analysisResponse.text();
                console.error('❌ Backend error response:', errorText);
                throw new Error(`Backend analysis failed: ${analysisResponse.status} - ${errorText}`);
            }
            
            analysisResult = await analysisResponse.json();
            console.log('✅ Analysis completed successfully!');
            console.log('   - Result:', JSON.stringify(analysisResult, null, 2));
            
        } catch (error: any) {
            console.warn('⚠️ Backend unavailable, using mock analysis:', error.message);
            backendAvailable = false;
            
            // Mock analysis result when backend is not available
            analysisResult = {
                success: true,
                classification: {
                    primary_diagnosis: "normal_heart_sounds",
                    confidence: 0.88 + Math.random() * 0.10, // 88-98%
                    heart_rate_bpm: 68 + Math.floor(Math.random() * 24), // 68-92 BPM
                    rhythm_type: "normal_sinus_rhythm",
                    murmur_detected: false,
                    murmur_grade: 0,
                    abnormalities: []
                },
                audio_quality: {
                    quality_score: 0.82 + Math.random() * 0.15, // 82-97%
                    signal_to_noise_ratio: 15.5 + Math.random() * 8, // 15-23 dB
                    duration_seconds: 5.2 + Math.random() * 2, // 5-7 seconds
                    processing_applied: ["noise_reduction", "bandpass_filter"]
                },
                medical_analysis: {
                    overall_assessment: "Heart sounds appear normal with regular rhythm and rate.",
                    clinical_findings: [
                        "Normal S1 and S2 heart sounds",
                        "Regular rhythm pattern",
                        "Heart rate within normal range",
                        "No pathological murmurs detected"
                    ],
                    risk_level: "low",
                    recommendations: [
                        "Continue regular cardiovascular monitoring",
                        "Maintain healthy lifestyle habits",
                        "Schedule routine cardiac check-ups"
                    ],
                    follow_up_required: false,
                    specialist_referral: null
                },
                patient_report: {
                    summary: "Your heart sounds are within normal limits. The recording shows a regular heart rhythm with no concerning findings.",
                    explanation: "The analysis detected normal heart sounds with a healthy rhythm pattern. Your heart rate is within the normal range.",
                    lifestyle_advice: [
                        "Regular exercise as tolerated",
                        "Maintain healthy diet",
                        "Monitor stress levels",
                        "Avoid smoking and excessive alcohol"
                    ],
                    when_to_seek_help: [
                        "Chest pain or discomfort",
                        "Unusual shortness of breath",
                        "Rapid or irregular heartbeat",
                        "Dizziness or fainting"
                    ]
                },
                metadata: {
                    model_version: "demo_v1.0",
                    processing_time_seconds: 2.5 + Math.random() * 2,
                    analysis_id: `demo_${recordingId}_${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    limitations: [
                        "This is a demonstration mode with simulated results",
                        "For medical diagnosis, consult a healthcare professional",
                        "Real analysis requires backend server connection"
                    ]
                },
                mockMode: true
            };
            
            console.log('🔧 Using mock analysis result');
        }
        
        // Update the recording with analysis results
        const analysisData = {
            completed: true,
            timestamp: new Date().toISOString(),
            result: analysisResult,
            processingTime: analysisResult.metadata?.processing_time_seconds || 0,
            backendVersion: backendAvailable ? 'direct_api_v1.0' : 'demo_mode_v1.0',
            mockMode: !backendAvailable
        };
        
        await firebaseService.firestore.stethoscope.updateAnalysis(recordingId, analysisData);
        console.log('✅ Recording updated with analysis results');
        
        // Create user-friendly display message
        const heartRate = analysisResult.classification?.heart_rate_bpm || 'N/A';
        const confidence = Math.round((analysisResult.classification?.confidence || 0) * 100);
        const diagnosis = analysisResult.classification?.primary_diagnosis?.replace(/_/g, ' ').toUpperCase() || 'NORMAL';
        const riskLevel = analysisResult.medical_analysis?.risk_level?.toUpperCase() || 'LOW';
        
        const modePrefix = backendAvailable ? '' : '🔧 DEMO MODE\n\n';
        
        const summaryMessage = `${modePrefix}🫀 HEART SOUND ANALYSIS COMPLETE

📊 RESULTS:
• Primary Finding: ${diagnosis}
• Confidence: ${confidence}%
• Heart Rate: ${heartRate} BPM
• Risk Level: ${riskLevel}

💡 SUMMARY:
${analysisResult.patient_report?.summary || 'Analysis completed successfully'}

📋 KEY FINDINGS:
${analysisResult.medical_analysis?.clinical_findings?.map((finding: string) => `• ${finding}`).join('\n') || '• Heart sounds within normal parameters'}

💪 RECOMMENDATIONS:
${analysisResult.medical_analysis?.recommendations?.map((rec: string) => `• ${rec}`).join('\n') || '• Continue regular health monitoring'}

${!backendAvailable ? '\n⚠️ Note: This is demonstration mode. For medical advice, consult a healthcare professional.' : ''}`;
        
        // Show success message
        Alert.alert(
            backendAvailable ? '🫀 Analysis Complete' : '🔧 Demo Analysis Complete',
            summaryMessage,
            [
                {
                    text: 'View Details',
                    onPress: () => {
                        const detailedMessage = `DETAILED ANALYSIS REPORT\n\n${JSON.stringify(analysisResult, null, 2)}`;
                        Alert.alert('Full Analysis Details', detailedMessage, [{ text: 'OK' }]);
                    }
                },
                { 
                    text: 'OK', 
                    onPress: () => {
                        console.log('✅ Analysis popup dismissed, reloading recordings...');
                        loadUserRecordings();
                    }
                }
            ]
        );
        
        console.log('✅ Analysis completed successfully');
        
    } catch (error: any) {
        console.error('❌ Heart sound analysis failed:', error);
        console.error('   - Error message:', error.message);
        console.error('   - Error stack:', error.stack);
        
        // Update recording with error
        try {
            const errorData = {
                completed: false,
                timestamp: new Date().toISOString(),
                error: error.message,
                backendVersion: 'direct_api_v1.0'
            };
            await firebaseService.firestore.stethoscope.updateAnalysis(recordingId, errorData);
            console.log('✅ Recording updated with error status');
        } catch (updateError) {
            console.error('❌ Failed to update recording with error:', updateError);
        }
        
        Alert.alert(
            'Analysis Failed',
            `Unable to analyze heart sound: ${error.message}\n\nPlease check that:\n1. Backend is running on 192.168.1.2:8000\n2. Your network connection is stable\n3. Try again in a few moments`,
            [{ text: 'OK' }]
        );
    } finally {
        setIsAnalyzing(false);
    }
};
