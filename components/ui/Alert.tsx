// mmWaveVitals/components/ui/Alert.tsx
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/DesignSystem';

interface AlertProps {
  title?: string;
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  style?: ViewStyle;
  showIcon?: boolean;
}

const Alert: React.FC<AlertProps> = ({ 
  title, 
  message, 
  variant = 'info',
  style,
  showIcon = true
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: Colors.success[50],
          borderColor: Colors.success[100],
          titleColor: Colors.success[600],
          messageColor: Colors.success[600],
          iconColor: Colors.success[500],
          iconName: 'check-circle',
        };
      case 'warning':
        return {
          backgroundColor: Colors.warning[50],
          borderColor: Colors.warning[100],
          titleColor: Colors.warning[600],
          messageColor: Colors.warning[600],
          iconColor: Colors.warning[500],
          iconName: 'warning',
        };
      case 'error':
        return {
          backgroundColor: Colors.error[50],
          borderColor: Colors.error[100],
          titleColor: Colors.error[600],
          messageColor: Colors.error[600],
          iconColor: Colors.error[500],
          iconName: 'error',
        };
      default:
        return {
          backgroundColor: Colors.primary[50],
          borderColor: Colors.primary[100],
          titleColor: Colors.primary[600],
          messageColor: Colors.primary[600],
          iconColor: Colors.primary[500],
          iconName: 'info',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: variantStyles.backgroundColor,
        borderColor: variantStyles.borderColor,
      },
      style
    ]}>
      {showIcon && (
        <MaterialIcons 
          name={variantStyles.iconName as any} 
          size={20} 
          color={variantStyles.iconColor}
          style={styles.icon}
        />
      )}
      <View style={styles.content}>
        {title && (
          <Text style={[
            styles.title,
            { color: variantStyles.titleColor }
          ]}>
            {title}
          </Text>
        )}
        <Text style={[
          styles.message,
          { color: variantStyles.messageColor }
        ]}>
          {message}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginVertical: Spacing.xs,
  },
  icon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600' as const,
    marginBottom: Spacing.xs,
  },
  message: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
});

export default Alert;
