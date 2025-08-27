//mmWaveVitals/constants/DesignSystem.ts
// Professional Healthcare Design System
// Following Apple's Human Interface Guidelines and healthcare standards

export const Colors = {
  // Primary Healthcare Colors
  primary: {
    50: '#E8F5F3',
    100: '#C6E7E2',
    200: '#9DD8CF',
    300: '#74C8BC',
    400: '#55BBAE',
    500: '#36AFA0', // Main brand color
    600: '#319B8D',
    700: '#2A8376',
    800: '#236B5F',
    900: '#1A4D43',
  },
  
  // Semantic Colors
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
  },
  
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
  },
  
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },
  
  // Neutral Colors (Apple-inspired)
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F7',
    200: '#E5E5EA',
    300: '#D1D1D6',
    400: '#C7C7CC',
    500: '#AEAEB2',
    600: '#8E8E93',
    700: '#636366',
    800: '#48484A',
    900: '#1C1C1E',
  },
  
  // Medical Status Colors
  vital: {
    heart: '#FF6B6B',
    breath: '#4ECDC4',
    motion: '#45B7D1',
    presence: '#96CEB4',
  },
  
  // Background Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#FAFAFA',
    tertiary: '#F5F5F7',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
  },
  
  // Text Colors
  text: {
    primary: '#1C1C1E',
    secondary: '#636366',
    tertiary: '#8E8E93',
    inverse: '#FFFFFF',
    accent: '#36AFA0',
  },
};

export const Typography = {
  // Font Families (iOS System Fonts)
  fontFamily: {
    primary: 'System',
    rounded: 'SF Pro Rounded',
    mono: 'SF Mono',
  },
  
  // Font Sizes (Apple's type scale)
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
    '6xl': 48,
  },
  
  // Font Weights
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
};

export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  base: 8,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

export const Shadows = {
  // Cross-platform shadows
  small: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    // Web support
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
    // Web support
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
  },
  large: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    // Web support
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.12)',
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
    // Web support
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
  },
};

export const Animation = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    inOut: 'ease-in-out',
    out: 'ease-out',
    in: 'ease-in',
  },
};

// Component-specific design tokens
export const Components = {
  button: {
    height: {
      sm: 36,
      md: 44,
      lg: 52,
    },
    borderRadius: BorderRadius.md,
    fontSize: {
      sm: Typography.fontSize.sm,
      md: Typography.fontSize.base,
      lg: Typography.fontSize.lg,
    },
  },
  
  input: {
    height: 52,
    borderRadius: BorderRadius.md,
    fontSize: Typography.fontSize.base,
    borderWidth: 1,
  },
  
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadow: Shadows.medium,
  },
  
  icon: {
    size: {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 28,
      xl: 32,
    },
  },
};

// Medical-specific design standards
export const Medical = {
  criticalValues: {
    low: Colors.warning[500],
    normal: Colors.success[500],
    high: Colors.error[500],
  },
  
  chartColors: [
    '#FF6B6B', // Heart rate
    '#4ECDC4', // Breath rate
    '#45B7D1', // Motion
    '#96CEB4', // Presence
    '#FECA57', // Signal quality
  ],
  
  statusIndicators: {
    active: Colors.success[500],
    inactive: Colors.neutral[400],
    warning: Colors.warning[500],
    critical: Colors.error[500],
  },
};

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Animation,
  Components,
  Medical,
};
