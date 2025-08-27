/**
 * Enhanced Heart Sound Analysis Test
 * Uses Kaggle dataset-trained backend for accurate analysis
 */

export const testBackendAnalysis = async (audioUri: string) => {
    try {
        console.log('🔧 Testing enhanced backend connection...');
        
        // Test health endpoint on advanced backend
        const healthResponse = await fetch('http://192.168.1.2:8001/health');
        const health = await healthResponse.json();
        console.log('✅ Advanced backend health:', health);
        
        if (health.status !== 'healthy') {
            throw new Error('Backend is not healthy');
        }
        
        // Log advanced capabilities
        if (health.capabilities) {
            console.log('🤖 ML Models trained:', health.capabilities.models_trained);
            console.log('🎵 Audio processing:', health.capabilities.audio_processing);
            console.log('📊 Dataset available:', health.capabilities.dataset_available);
        }
        
        // Log model performance
        if (health.model_performance) {
            console.log('🏆 Best model accuracy:', health.model_performance.best_accuracy);
            console.log('🔧 Feature count:', health.model_performance.feature_count);
        }
        
        // Prepare form data with enhanced metadata
        console.log('📝 Preparing enhanced analysis request...');
        const formData = new FormData();
        
        formData.append('audio_file', {
            uri: audioUri,
            type: 'audio/m4a',
            name: 'heart_sound.m4a',
        } as any);
        
        // Add analysis preferences
        formData.append('analysis_type', 'comprehensive');
        formData.append('include_features', 'true');
        formData.append('timestamp', new Date().toISOString());
        
        // Send analysis request to advanced backend
        console.log('📤 Sending to advanced ML backend...');
        const response = await fetch('http://192.168.1.2:8001/analyze/audio', {
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            body: formData,
        });
        
        console.log('📥 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Enhanced analysis failed: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Enhanced analysis successful:', result);
        
        // Log analysis source and details
        if (result.analysis_method === 'ml_kaggle_dataset') {
            console.log('🎯 Analysis powered by ML models trained on Kaggle dataset');
        } else {
            console.log('🔄 Analysis using fallback method');
        }
        
        // Log ML classification results
        if (result.classification) {
            console.log(`🩺 Diagnosis: ${result.classification.prediction}`);
            console.log(`🎯 Confidence: ${(result.classification.confidence * 100).toFixed(1)}%`);
            console.log(`❤️ Heart Rate: ${result.classification.heart_rate_bpm} BPM`);
        }
        
        // Log audio features
        if (result.audio_features) {
            console.log(`📊 Extracted ${Object.keys(result.audio_features).length} audio features`);
        }
        
        // Log system info
        if (result.system_info) {
            console.log(`🤖 ML Method: ${result.system_info.ml_method}`);
            console.log(`📈 Training samples: ${result.system_info.training_samples}`);
        }
        
        return result;
        
    } catch (error: any) {
        console.error('❌ Enhanced backend test failed:', error);
        throw error;
    }
};
