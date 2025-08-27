// mmWaveVitals/components/ui/Modal.tsx
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
    Platform,
    Modal as RNModal,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/DesignSystem';

interface ModalProps {
  visible: boolean;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
  size?: 'sm' | 'md' | 'lg' | 'full';
}

const Modal: React.FC<ModalProps> = ({
  visible,
  title,
  children,
  onClose,
  showCloseButton = true,
  animationType = 'slide',
  size = 'md',
}) => {
  const getModalStyles = () => {
    switch (size) {
      case 'sm':
        return {
          width: '80%' as const,
          maxHeight: '60%' as const,
        };
      case 'lg':
        return {
          width: '95%' as const,
          maxHeight: '90%' as const,
        };
      case 'full':
        return {
          width: '100%' as const,
          height: '100%' as const,
        };
      default:
        return {
          width: '90%' as const,
          maxHeight: '80%' as const,
        };
    }
  };

  const modalStyles = getModalStyles();

  return (
    <RNModal
      visible={visible}
      animationType={animationType}
      transparent={size !== 'full'}
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[
        styles.container,
        size === 'full' && styles.fullScreenContainer
      ]}>
        <StatusBar barStyle="light-content" />
        
        {size !== 'full' && (
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onClose}
          />
        )}
        
        <View style={[
          styles.modal,
          modalStyles,
          size === 'full' && styles.fullScreenModal,
        ]}>
          {/* Header */}
          {(title || showCloseButton) && (
            <View style={styles.header}>
              {title && (
                <Text style={styles.title}>{title}</Text>
              )}
              {showCloseButton && onClose && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <MaterialIcons name="close" size={24} color={Colors.neutral[600]} />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>
        </View>
      </SafeAreaView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  fullScreenContainer: {
    backgroundColor: Colors.background.primary,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modal: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: Shadows.large.boxShadow,
      },
      default: {
        shadowColor: Shadows.large.shadowColor,
        shadowOffset: Shadows.large.shadowOffset,
        shadowOpacity: Shadows.large.shadowOpacity,
        shadowRadius: Shadows.large.shadowRadius,
        elevation: Shadows.large.elevation,
      },
    }),
  },
  fullScreenModal: {
    borderRadius: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    flex: 1,
  },
  closeButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral[100],
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
});

export default Modal;
