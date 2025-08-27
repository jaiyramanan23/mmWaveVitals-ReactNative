//mmWaveVitals/components/ui/Input.tsx
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
    ViewStyle
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/DesignSystem';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  containerStyle?: ViewStyle;
  required?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  variant = 'outline',
  size = 'md',
  containerStyle,
  required = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const getInputHeight = () => {
    switch (size) {
      case 'sm': return 44;
      case 'md': return 52;
      case 'lg': return 60;
      default: return 52;
    }
  };

  const getInputStyle = () => {
    const baseStyle = {
      height: getInputHeight(),
      borderRadius: BorderRadius.lg,
      paddingHorizontal: leftIcon ? 52 : Spacing.md, // Increased padding for better icon spacing
      paddingRight: rightIcon ? 52 : Spacing.md, // Increased padding for better icon spacing
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.regular as any,
      color: Colors.text.primary,
      backgroundColor: Colors.background.primary,
      textAlignVertical: 'center' as const,
    };

    switch (variant) {
      case 'filled':
        return {
          ...baseStyle,
          backgroundColor: Colors.neutral[50],
          borderWidth: 1,
          borderColor: error 
            ? Colors.error[500] 
            : isFocused 
              ? Colors.primary[500] 
              : Colors.neutral[200],
        };
      case 'outline':
        return {
          ...baseStyle,
          borderWidth: 1.5,
          borderColor: error 
            ? Colors.error[500] 
            : isFocused 
              ? Colors.primary[500] 
              : Colors.neutral[300],
          backgroundColor: Colors.background.primary,
        };
      default:
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: error 
            ? Colors.error[500] 
            : isFocused 
              ? Colors.primary[500] 
              : Colors.neutral[200],
        };
    }
  };

  const getLabelStyle = () => {
    return {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium as any,
      color: error ? Colors.error[600] : Colors.text.primary,
      marginBottom: Spacing.xs,
    };
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={getLabelStyle()}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[getInputStyle(), props.style]}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={Colors.neutral[400]}
          selectionColor={Colors.primary[500]}
          {...props}
        />
        
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}
        
        {rightIcon && (
          <View style={styles.rightIcon}>
            {rightIcon}
          </View>
        )}
      </View>
      
      {(error || helper) && (
        <View style={styles.helpContainer}>
          <Text style={[
            styles.helpText,
            error ? styles.errorText : styles.helperText
          ]}>
            {error || helper}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  required: {
    color: Colors.error[500],
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
  },
  leftIcon: {
    position: 'absolute',
    left: Spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }], // Half of icon size (20/2)
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
    height: 20,
    zIndex: 1,
  },
  rightIcon: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }], // Half of icon size (20/2)
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
    height: 20,
    zIndex: 1,
  },
  helpContainer: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  helpText: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
  },
  errorText: {
    color: Colors.error[500],
    fontWeight: Typography.fontWeight.medium as any,
  },
  helperText: {
    color: Colors.text.tertiary,
  },
});

export default Input;