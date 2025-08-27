/**
 * Enhanced Analysis Summary Component
 * Shows clinical analysis results with medical focus
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { ClinicalAnalysisResult } from '../../services/clinicalBackend';
import DetailedAnalysisModal from './DetailedAnalysisModal';

interface AnalysisSummaryCardProps {
    analysisResult: ClinicalAnalysisResult;
    onViewDetails?: () => void;
}

const AnalysisSummaryCard: React.FC<AnalysisSummaryCardProps> = ({
    analysisResult,
    onViewDetails
}) => {
    const [showDetailedModal, setShowDetailedModal] = useState(false);
    const [scaleAnim] = useState(new Animated.Value(1));

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();

        setShowDetailedModal(true);
        onViewDetails?.();
    };

    const getConditionIcon = (condition: string) => {
        const lowerCondition = condition.toLowerCase();
        if (lowerCondition.includes('normal')) return 'favorite';
        if (lowerCondition.includes('murmur')) return 'hearing';
        if (lowerCondition.includes('arrhythmia') || lowerCondition.includes('fibrillation')) return 'timeline';
        if (lowerCondition.includes('tachycardia')) return 'flash-on';
        if (lowerCondition.includes('bradycardia')) return 'access-time';
        return 'monitor-heart';
    };

    const getConditionColor = (condition: string) => {
        const lowerCondition = condition.toLowerCase();
        if (lowerCondition.includes('normal')) return '#4CAF50';
        if (lowerCondition.includes('murmur')) return '#FF8800';
        if (lowerCondition.includes('arrhythmia') || lowerCondition.includes('fibrillation')) return '#FF4444';
        if (lowerCondition.includes('tachycardia')) return '#FF6B00';
        if (lowerCondition.includes('bradycardia')) return '#2196F3';
        return '#9C27B0';
    };

    const getUrgencyIcon = (urgency: string) => {
        switch (urgency) {
            case 'immediate': return 'emergency';
            case 'urgent': return 'warning';
            case 'scheduled': return 'schedule';
            case 'routine': return 'check-circle';
            default: return 'info';
        }
    };

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'immediate': return '#FF4444';
            case 'urgent': return '#FF8800';
            case 'scheduled': return '#FFA500';
            case 'routine': return '#4CAF50';
            default: return '#666';
        }
    };

    const showQuickAlert = () => {
        const urgencyEmoji = {
            'immediate': '🚨',
            'urgent': '⚠️',
            'scheduled': '📅',
            'routine': '✅'
        }[analysisResult.clinical_analysis.urgency] || 'ℹ️';

        Alert.alert(
            `${urgencyEmoji} Clinical Analysis Summary`,
            `Condition: ${analysisResult.clinical_analysis.condition}\n\n` +
            `Urgency: ${analysisResult.clinical_analysis.urgency.toUpperCase()}\n` +
            `Confidence: ${(analysisResult.clinical_analysis.confidence * 100).toFixed(1)}%\n\n` +
            `Recommended Action:\n${analysisResult.clinical_analysis.recommended_action}\n\n` +
            `Tap "View Full Report" for detailed medical recommendations.`,
            [
                { text: 'Got it', style: 'default' },
                { 
                    text: 'View Full Report', 
                    style: 'default',
                    onPress: () => setShowDetailedModal(true)
                }
            ]
        );
    };

    return (
        <>
            <Animated.View 
                style={[
                    styles.card, 
                    { transform: [{ scale: scaleAnim }] }
                ]}
            >
                {/* Header with Condition */}
                <View style={styles.header}>
                    <View style={styles.conditionContainer}>
                        <MaterialIcons 
                            name={getConditionIcon(analysisResult.clinical_analysis.condition)} 
                            size={24} 
                            color={getConditionColor(analysisResult.clinical_analysis.condition)} 
                        />
                        <Text style={[styles.conditionText, { color: getConditionColor(analysisResult.clinical_analysis.condition) }]}>
                            {analysisResult.clinical_analysis.condition}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={showQuickAlert} style={styles.infoButton}>
                        <MaterialIcons name="info-outline" size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* Confidence and Urgency Row */}
                <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Confidence</Text>
                        <Text style={styles.confidenceValue}>
                            {(analysisResult.clinical_analysis.confidence * 100).toFixed(1)}%
                        </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.metricItem}>
                        <View style={styles.urgencyContainer}>
                            <MaterialIcons 
                                name={getUrgencyIcon(analysisResult.clinical_analysis.urgency)} 
                                size={16} 
                                color={getUrgencyColor(analysisResult.clinical_analysis.urgency)} 
                            />
                            <Text style={[styles.urgencyText, { color: getUrgencyColor(analysisResult.clinical_analysis.urgency) }]}>
                                {analysisResult.clinical_analysis.urgency.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Severity Badge */}
                <View style={styles.severityContainer}>
                    <View style={[
                        styles.severityBadge, 
                        { backgroundColor: analysisResult.clinical_analysis.severity === 'high' ? '#FF444420' : 
                                          analysisResult.clinical_analysis.severity === 'medium' ? '#FF880020' : '#4CAF5020' }
                    ]}>
                        <Text style={[
                            styles.severityText,
                            { color: analysisResult.clinical_analysis.severity === 'high' ? '#FF4444' : 
                                     analysisResult.clinical_analysis.severity === 'medium' ? '#FF8800' : '#4CAF50' }
                        ]}>
                            {analysisResult.clinical_analysis.severity.toUpperCase()} SEVERITY
                        </Text>
                    </View>
                </View>

                {/* Quick Insights */}
                <View style={styles.insightsContainer}>
                    <Text style={styles.insightsTitle}>Key Findings:</Text>
                    <View style={styles.findingsList}>
                        <View style={styles.findingItem}>
                            <MaterialIcons 
                                name={analysisResult.clinical_analysis.clinical_features.murmur_detected ? "hearing" : "hearing-disabled"} 
                                size={16} 
                                color={analysisResult.clinical_analysis.clinical_features.murmur_detected ? "#FF8800" : "#4CAF50"} 
                            />
                            <Text style={styles.findingText}>
                                Murmur {analysisResult.clinical_analysis.clinical_features.murmur_detected ? 'Detected' : 'Not Detected'}
                            </Text>
                        </View>
                        <View style={styles.findingItem}>
                            <MaterialIcons 
                                name={analysisResult.clinical_analysis.clinical_features.rhythm_irregular ? "timeline" : "check-circle"} 
                                size={16} 
                                color={analysisResult.clinical_analysis.clinical_features.rhythm_irregular ? "#FF8800" : "#4CAF50"} 
                            />
                            <Text style={styles.findingText}>
                                Rhythm: {analysisResult.clinical_analysis.clinical_features.rhythm_irregular ? 'Irregular' : 'Regular'}
                            </Text>
                        </View>
                        <View style={styles.findingItem}>
                            <MaterialIcons name="signal-cellular-alt" size={16} color="#2196F3" />
                            <Text style={styles.findingText}>
                                Signal: {analysisResult.clinical_analysis.clinical_features.signal_quality}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Action Summary */}
                <View style={styles.actionSummary}>
                    <Text style={styles.actionTitle}>Recommended Action:</Text>
                    <Text style={styles.actionText} numberOfLines={2}>
                        {analysisResult.clinical_analysis.recommended_action}
                    </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={styles.detailsButton}
                        onPress={handlePress}
                    >
                        <MaterialIcons name="description" size={20} color="white" />
                        <Text style={styles.detailsButtonText}>View Full Report</Text>
                    </TouchableOpacity>
                    
                    {analysisResult.clinical_analysis.urgency === 'immediate' && (
                        <TouchableOpacity 
                            style={styles.emergencyButton}
                            onPress={() => Alert.alert(
                                '🚨 Immediate Medical Attention Required',
                                'This analysis suggests seeking immediate medical attention. Please contact emergency services or visit the nearest emergency room.',
                                [
                                    { text: 'Understood', style: 'default' },
                                    { text: 'Call Emergency', style: 'destructive' }
                                ]
                            )}
                        >
                            <MaterialIcons name="emergency" size={18} color="white" />
                            <Text style={styles.emergencyButtonText}>Emergency</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>

            <DetailedAnalysisModal
                visible={showDetailedModal}
                analysisResult={analysisResult}
                onClose={() => setShowDetailedModal(false)}
            />
        </>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginVertical: 8,
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    conditionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    conditionText: {
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 8,
    },
    infoButton: {
        padding: 4,
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    metricItem: {
        flex: 1,
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    confidenceValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#4CAF50',
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: '#e1e8ed',
        marginHorizontal: 16,
    },
    urgencyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    urgencyText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    severityContainer: {
        marginBottom: 16,
        alignItems: 'center',
    },
    severityBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    severityText: {
        fontSize: 12,
        fontWeight: '600',
    },
    insightsContainer: {
        marginBottom: 16,
    },
    insightsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    findingsList: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
    },
    findingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    findingText: {
        fontSize: 13,
        color: '#333',
        marginLeft: 8,
    },
    actionSummary: {
        marginBottom: 20,
        backgroundColor: '#f0f7ff',
        borderRadius: 8,
        padding: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
    },
    actionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    actionText: {
        fontSize: 13,
        color: '#333',
        lineHeight: 18,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailsButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        marginRight: 8,
    },
    detailsButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    emergencyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF4444',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 25,
    },
    emergencyButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
});

export default AnalysisSummaryCard;
