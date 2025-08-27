// mmWaveVitals/components/ui/Badge.tsx
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/DesignSystem';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const Badge: React.FC<BadgeProps> = ({ 
  label, 
  variant = 'primary', 
  size = 'md',
  style 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: Colors.success[100],
          color: Colors.success[600],
        };
      case 'warning':
        return {
          backgroundColor: Colors.warning[100],
          color: Colors.warning[600],
        };
      case 'error':
        return {
          backgroundColor: Colors.error[100],
          color: Colors.error[600],
        };
      case 'neutral':
        return {
          backgroundColor: Colors.neutral[100],
          color: Colors.neutral[700],
        };
      default:
        return {
          backgroundColor: Colors.primary[100],
          color: Colors.primary[600],
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: Spacing.xs,
          paddingVertical: 2,
          fontSize: Typography.fontSize.xs,
        };
      case 'lg':
        return {
          paddingHorizontal: Spacing.sm,
          paddingVertical: Spacing.xs,
          fontSize: Typography.fontSize.sm,
        };
      default:
        return {
          paddingHorizontal: Spacing.sm,
          paddingVertical: 4,
          fontSize: Typography.fontSize.xs,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: variantStyles.backgroundColor,
        paddingHorizontal: sizeStyles.paddingHorizontal,
        paddingVertical: sizeStyles.paddingVertical,
      },
      style
    ]}>
      <Text style={[
        styles.label,
        {
          color: variantStyles.color,
          fontSize: sizeStyles.fontSize,
        }
      ]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '600' as const,
    textAlign: 'center',
  },
});

export default Badge;
