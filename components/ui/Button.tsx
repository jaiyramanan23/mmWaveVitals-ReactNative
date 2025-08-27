//mmWaveVitals/components/ui/Button.tsx
import React from 'react';
import {
    ActivityIndicator,
    Platform,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle
} from 'react-native';
import { Colors, Components, Shadows, Typography } from '../../constants/DesignSystem';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      height: Components.button.height[size],
      borderRadius: Components.button.borderRadius,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: size === 'sm' ? 16 : size === 'md' ? 20 : 24,
    };

    // Add shadows based on platform
    if (Platform.OS === 'web') {
      baseStyle.boxShadow = Shadows.small.boxShadow;
    } else {
      Object.assign(baseStyle, {
        shadowColor: Shadows.small.shadowColor,
        shadowOffset: Shadows.small.shadowOffset,
        shadowOpacity: Shadows.small.shadowOpacity,
        shadowRadius: Shadows.small.shadowRadius,
        elevation: Shadows.small.elevation,
      });
    }

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? Colors.neutral[300] : Colors.primary[500],
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? Colors.neutral[200] : Colors.neutral[100],
          borderWidth: 1,
          borderColor: Colors.neutral[200],
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: disabled ? Colors.neutral[300] : Colors.primary[500],
          ...Platform.select({
            ios: {},
            android: { elevation: 0 },
          }),
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          ...Platform.select({
            ios: {},
            android: { elevation: 0 },
          }),
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: disabled ? Colors.neutral[300] : Colors.error[500],
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: Components.button.fontSize[size],
      fontWeight: Typography.fontWeight.semibold as any,
      marginLeft: icon ? 8 : 0,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          color: Colors.text.inverse,
        };
      case 'secondary':
        return {
          ...baseStyle,
          color: disabled ? Colors.text.tertiary : Colors.text.primary,
        };
      case 'outline':
        return {
          ...baseStyle,
          color: disabled ? Colors.text.tertiary : Colors.primary[500],
        };
      case 'ghost':
        return {
          ...baseStyle,
          color: disabled ? Colors.text.tertiary : Colors.primary[500],
        };
      case 'danger':
        return {
          ...baseStyle,
          color: Colors.text.inverse,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'primary' || variant === 'danger' ? Colors.text.inverse : Colors.primary[500]} 
          size="small" 
        />
      ) : (
        <>
          {icon}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;
