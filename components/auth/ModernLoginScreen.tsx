// mmWaveVitals/components/auth/ModernLoginScreen.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Shadows, Spacing } from '../../constants/DesignSystem';
import { firebaseService } from '../../services/firebase';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';

const { width, height } = Dimensions.get('window');

interface ModernLoginScreenProps {
  onLoginSuccess: () => void;
}

const ModernLoginScreen: React.FC<ModernLoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Invalid email format');
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Minimum 6 characters required');
      isValid = false;
    }

    return isValid;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isLogin) {
        await firebaseService.auth.signInWithEmailAndPassword(email, password);
        Alert.alert('Success', 'Welcome back!');
      } else {
        await firebaseService.auth.createUserWithEmailAndPassword(email, password);
        Alert.alert('Success', 'Account created successfully!');
      }
      onLoginSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setEmailError('');
    setPasswordError('');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={[Colors.primary[500], Colors.primary[700], Colors.neutral[900]]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo Section */}
            <Animated.View
              style={[
                styles.logoSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.logoContainer}>
                <MaterialIcons name="favorite" size={48} color={Colors.background.primary} />
              </View>
              <Text style={styles.appTitle}>mmWave Vitals</Text>
              <Text style={styles.tagline}>Advanced Health Monitoring</Text>
            </Animated.View>

            {/* Auth Card */}
            <Animated.View
              style={[
                styles.cardContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Card variant="elevated" style={styles.authCard}>
                {/* Header */}
                <View style={styles.headerSection}>
                  <Text style={styles.welcomeTitle}>
                    {isLogin ? 'Welcome Back' : 'Get Started'}
                  </Text>
                  <Text style={styles.subtitle}>
                    {isLogin ? 'Sign in to continue monitoring' : 'Create your account to begin'}
                  </Text>
                </View>

                {/* Form Section */}
                <View style={styles.formSection}>
                  {/* Email Input */}
                  <View style={styles.inputContainer}>
                    <Input
                      placeholder="Email address"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text.trim());
                        if (emailError) setEmailError('');
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      error={emailError}
                      
                      style={styles.input}
                    />
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputContainer}>
                    <Input
                      placeholder="Password"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (passwordError) setPasswordError('');
                      }}
                      secureTextEntry={!showPassword}
                      autoComplete={isLogin ? 'password' : 'new-password'}
                      autoCorrect={false}
                      error={passwordError}
               
                      rightIcon={
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons
                            name={showPassword ? "visibility" : "visibility-off"}
                            size={20}
                            color={Colors.neutral[400]}
                          />
                        </TouchableOpacity>
                      }
                      style={styles.input}
                    />
                  </View>

                  {/* Forgot Password Link */}
                  {isLogin && (
                    <TouchableOpacity style={styles.forgotPasswordContainer}>
                      <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                  {/* Primary Button */}
                  <Button
                    title={isLogin ? 'Sign In' : 'Create Account'}
                    onPress={handleAuth}
                    loading={isLoading}
                    disabled={false}
                    fullWidth
                    style={styles.primaryButton}
                  />

                  {/* Toggle Auth Mode */}
                  <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={toggleAuthMode}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.toggleText}>
                      {isLogin ? "Don't have an account? " : "Already have an account? "}
                      <Text style={styles.toggleLink}>
                        {isLogin ? 'Sign Up' : 'Sign In'}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </Animated.View>

            {/* Security Badge */}
            <Animated.View
              style={[
                styles.securityBadge,
                { opacity: fadeAnim }
              ]}
            >
              <MaterialIcons name="security" size={14} color={Colors.success[500]} />
              <Text style={styles.securityText}>Secure & Encrypted</Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['2xl'],
    minHeight: height,
  },
  
  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.background.primary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },

  // Card Section
  cardContainer: {
    marginBottom: Spacing.xl,
  },
  authCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 24,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['2xl'],
    ...Shadows.large,
    minHeight: 400,
  },

  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Form Section
  formSection: {
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  input: {
    minHeight: 52,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: Spacing.xs,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.primary[500],
    fontWeight: '500',
  },

  // Action Section
  actionSection: {
    gap: Spacing.lg,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: Spacing.md + 2,
    minHeight: 52,
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  toggleText: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  toggleLink: {
    color: Colors.primary[500],
    fontWeight: '600',
  },

  // Security Badge
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  securityText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
});

export default ModernLoginScreen;