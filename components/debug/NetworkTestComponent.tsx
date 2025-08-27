import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { runNetworkDiagnostics } from '../../debug-network-android';

interface NetworkTestProps {
    onClose: () => void;
}

export const NetworkTestComponent: React.FC<NetworkTestProps> = ({ onClose }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState<string>('');

    const runTests = async () => {
        setIsRunning(true);
        setTestResults('🔍 Starting network diagnostics...\n\n');
        
        // Capture console logs during the test
        const originalLog = console.log;
        const logs: string[] = [];
        
        console.log = (...args) => {
            const message = args.join(' ');
            logs.push(message);
            originalLog(...args);
        };
        
        try {
            await runNetworkDiagnostics();
            setTestResults(logs.join('\n'));
        } catch (error) {
            setTestResults(logs.join('\n') + `\n❌ Test failed: ${error}`);
        } finally {
            console.log = originalLog;
            setIsRunning(false);
        }
    };

    const testBackendDirectly = async () => {
        try {
            setTestResults('🔄 Testing backend directly...\n\n');
            
            const response = await fetch('http://45.56.72.250:8002/health', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'mmWaveVitals-Android-Direct-Test/1.0.0'
                }
            });
            
            if (response.ok) {
                const data = await response.text();
                setTestResults(prev => prev + `✅ Backend is reachable!\n${data}\n`);
                Alert.alert('Success', 'Backend server is reachable from this device!');
            } else {
                setTestResults(prev => prev + `⚠️ Backend responded with status: ${response.status}\n`);
            }
            
        } catch (error) {
            setTestResults(prev => prev + `❌ Backend test failed: ${error}\n`);
            Alert.alert('Network Error', `Backend is not reachable: ${error}`);
        }
    };

    return (
        <View style={{ flex: 1, padding: 20, backgroundColor: '#f5f5f5' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>
                🔧 Android Network Diagnostics
            </Text>
            
            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: isRunning ? '#ccc' : '#007AFF',
                        padding: 10,
                        borderRadius: 5,
                        marginRight: 10,
                        flex: 1
                    }}
                    onPress={runTests}
                    disabled={isRunning}
                >
                    <Text style={{ color: 'white', textAlign: 'center' }}>
                        {isRunning ? '🔄 Running...' : '🔍 Run Full Diagnostics'}
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={{
                        backgroundColor: '#FF6B35',
                        padding: 10,
                        borderRadius: 5,
                        flex: 1
                    }}
                    onPress={testBackendDirectly}
                >
                    <Text style={{ color: 'white', textAlign: 'center' }}>
                        🎯 Test Backend Only
                    </Text>
                </TouchableOpacity>
            </View>
            
            <ScrollView style={{ 
                flex: 1, 
                backgroundColor: '#000', 
                padding: 10, 
                borderRadius: 5 
            }}>
                <Text style={{ 
                    color: '#00ff00', 
                    fontFamily: 'monospace', 
                    fontSize: 12 
                }}>
                    {testResults || 'Press a button above to start testing network connectivity...'}
                </Text>
            </ScrollView>
            
            <TouchableOpacity
                style={{
                    backgroundColor: '#8E8E93',
                    padding: 15,
                    borderRadius: 5,
                    marginTop: 10
                }}
                onPress={onClose}
            >
                <Text style={{ color: 'white', textAlign: 'center', fontSize: 16 }}>
                    Close
                </Text>
            </TouchableOpacity>
            
            <Text style={{ 
                fontSize: 12, 
                color: '#666', 
                marginTop: 10, 
                textAlign: 'center' 
            }}>
                This tool helps diagnose why heart analysis fails on Android APK builds
            </Text>
        </View>
    );
};
