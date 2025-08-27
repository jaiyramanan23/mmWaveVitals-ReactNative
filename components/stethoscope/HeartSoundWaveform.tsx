// mmWaveVitals/components/stethoscope/HeartSoundWaveform.tsx
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Colors } from '../../constants/DesignSystem';

interface HeartSoundWaveformProps {
    data: number[];
    isRecording: boolean;
    height: number;
    width: number;
    compact?: boolean;
}

const HeartSoundWaveform: React.FC<HeartSoundWaveformProps> = ({
    data,
    isRecording,
    height,
    width,
    compact = false,
}) => {
    const animationRef = useRef<any>(null);

    useEffect(() => {
        if (isRecording && !compact) {
            // Add animation effect for recording state
        }
        return () => {
            if (animationRef.current) {
                clearInterval(animationRef.current);
            }
        };
    }, [isRecording, compact]);

    const generatePath = () => {
        if (data.length < 2) return '';

        const stepX = width / Math.max(data.length - 1, 1);
        const midY = height / 2;
        const amplitude = height * 0.4;

        let path = `M 0 ${midY}`;

        data.forEach((value, index) => {
            const x = index * stepX;
            const y = midY - (value * amplitude);
            path += ` L ${x} ${y}`;
        });

        return path;
    };

    const renderGridLines = () => {
        if (compact) return null;

        const gridLines = [];
        const horizontalLines = 5;
        const verticalLines = 10;

        // Horizontal grid lines
        for (let i = 0; i <= horizontalLines; i++) {
            const y = (height / horizontalLines) * i;
            gridLines.push(
                <Line
                    key={`h-${i}`}
                    x1={0}
                    y1={y}
                    x2={width}
                    y2={y}
                    stroke={Colors.neutral[300]}
                    strokeWidth={0.5}
                    opacity={0.3}
                />
            );
        }

        // Vertical grid lines
        for (let i = 0; i <= verticalLines; i++) {
            const x = (width / verticalLines) * i;
            gridLines.push(
                <Line
                    key={`v-${i}`}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={height}
                    stroke={Colors.neutral[300]}
                    strokeWidth={0.5}
                    opacity={0.3}
                />
            );
        }

        return gridLines;
    };

    const renderHeartSoundLabels = () => {
        if (compact || data.length < 100) return null;

        // Detect S1 and S2 peaks in the waveform
        const peaks = [];
        for (let i = 1; i < data.length - 1; i++) {
            if (Math.abs(data[i]) > 0.5 && 
                Math.abs(data[i]) > Math.abs(data[i - 1]) && 
                Math.abs(data[i]) > Math.abs(data[i + 1])) {
                peaks.push({ index: i, value: data[i] });
            }
        }

        // Label major peaks as S1 or S2
        return peaks.slice(0, 4).map((peak, index) => {
            const x = (peak.index / data.length) * width;
            const label = index % 2 === 0 ? 'S1' : 'S2';
            return (
                <SvgText
                    key={`label-${index}`}
                    x={x}
                    y={15}
                    fill={Colors.primary[500]}
                    fontSize={10}
                    fontWeight="600"
                    textAnchor="middle"
                >
                    {label}
                </SvgText>
            );
        });
    };

    return (
        <View style={[styles.container, { height, width }]}>
            <Svg width={width} height={height}>
                {/* Background */}
                <Rect
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    fill={compact ? 'transparent' : Colors.background.surface}
                />

                {/* Grid lines */}
                {renderGridLines()}

                {/* Center line */}
                <Line
                    x1={0}
                    y1={height / 2}
                    x2={width}
                    y2={height / 2}
                    stroke={Colors.neutral[400]}
                    strokeWidth={1}
                    opacity={0.5}
                />

                {/* Waveform */}
                <Path
                    d={generatePath()}
                    fill="none"
                    stroke={isRecording ? Colors.error[500] : Colors.primary[500]}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Heart sound labels */}
                {renderHeartSoundLabels()}

                {/* Recording indicator */}
                {isRecording && !compact && (
                    <Rect
                        x={width - 70}
                        y={10}
                        width={60}
                        height={20}
                        rx={10}
                        fill={Colors.error[500]}
                        opacity={0.8}
                    />
                )}
                {isRecording && !compact && (
                    <SvgText
                        x={width - 40}
                        y={24}
                        fill={Colors.text.inverse}
                        fontSize={11}
                        fontWeight="600"
                        textAnchor="middle"
                    >
                        LIVE
                    </SvgText>
                )}
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 8,
        overflow: 'hidden',
    },
});

export default HeartSoundWaveform;