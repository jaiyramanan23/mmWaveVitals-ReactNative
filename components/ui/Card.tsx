//mmWaveVitals/components/ui/Card.tsx
import React from 'react';
import { Platform, View, ViewStyle } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing } from '../../constants/DesignSystem';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'md',
  style,
}) => {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: BorderRadius.xl,
      backgroundColor: Colors.background.surface,
    };

    // Apply padding
    const paddingValue = {
      none: 0,
      sm: Spacing.sm,
      md: Spacing.lg,
      lg: Spacing.xl,
      xl: Spacing['2xl'],
    }[padding];

    baseStyle.padding = paddingValue;

    // Apply variant styles
    switch (variant) {
      case 'elevated':
        if (Platform.OS === 'web') {
          baseStyle.boxShadow = Shadows.medium.boxShadow;
        } else {
          Object.assign(baseStyle, {
            shadowColor: Shadows.medium.shadowColor,
            shadowOffset: Shadows.medium.shadowOffset,
            shadowOpacity: Shadows.medium.shadowOpacity,
            shadowRadius: Shadows.medium.shadowRadius,
            elevation: Shadows.medium.elevation,
          });
        }
        return baseStyle;
      case 'outlined':
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: Colors.neutral[200],
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      default:
        return baseStyle;
    }
  };

  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
};

export default Card;
