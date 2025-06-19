import { Platform } from 'react-native';

// Font weights
export const fontWeights = {
  light: '300',
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
} as const;

// Font families (based on Inter font loaded in App.tsx)
export const fontFamilies = {
  regular: Platform.select({
    ios: 'Inter-Regular',
    android: 'Inter-Regular',
    default: 'Inter-Regular',
  }),
  medium: Platform.select({
    ios: 'Inter-Medium',
    android: 'Inter-Medium',
    default: 'Inter-Medium',
  }),
  semiBold: Platform.select({
    ios: 'Inter-SemiBold',
    android: 'Inter-SemiBold',
    default: 'Inter-SemiBold',
  }),
  bold: Platform.select({
    ios: 'Inter-Bold',
    android: 'Inter-Bold',
    default: 'Inter-Bold',
  }),
} as const;

// Typography scale
export const typography = {
  // Headings
  h1: {
    fontFamily: fontFamilies.bold,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.25,
  },
  h3: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: fontWeights.semiBold,
    letterSpacing: 0,
  },
  h4: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: fontWeights.semiBold,
    letterSpacing: 0,
  },
  h5: {
    fontFamily: fontFamilies.medium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.medium,
    letterSpacing: 0,
  },
  h6: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeights.medium,
    letterSpacing: 0,
  },

  // Body text
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeights.regular,
    letterSpacing: 0,
  },
  bodyLarge: {
    fontFamily: fontFamilies.regular,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: fontWeights.regular,
    letterSpacing: 0,
  },
  bodySmall: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
    letterSpacing: 0,
  },

  // UI elements
  button: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.5,
  },
  buttonLarge: {
    fontFamily: fontFamilies.medium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.5,
  },
  buttonSmall: {
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.5,
  },

  // Caption and labels
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.regular,
    letterSpacing: 0.4,
  },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.1,
  },
  labelLarge: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.1,
  },

  // Special variants
  overline: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  
  // Financial display
  currency: {
    fontFamily: fontFamilies.bold,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.5,
  },
  amount: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: fontWeights.semiBold,
    letterSpacing: 0,
  },
  amountSmall: {
    fontFamily: fontFamilies.medium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.medium,
    letterSpacing: 0,
  },

  // Input fields
  input: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeights.regular,
    letterSpacing: 0,
  },
  inputLarge: {
    fontFamily: fontFamilies.regular,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: fontWeights.regular,
    letterSpacing: 0,
  },

  // Navigation
  tabLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.4,
  },
  navigationTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: fontWeights.semiBold,
    letterSpacing: 0,
  },
} as const;

// Responsive typography utilities
export const getResponsiveFontSize = (baseSize: number, scale: 'small' | 'medium' | 'large' = 'medium') => {
  const scales = {
    small: 0.875,  // 14/16
    medium: 1,     // 16/16
    large: 1.125,  // 18/16
  };
  
  return Math.round(baseSize * scales[scale]);
};

// Line height utilities
export const getLineHeight = (fontSize: number, ratio: number = 1.5) => {
  return Math.round(fontSize * ratio);
};

// Letter spacing utilities
export const getLetterSpacing = (fontSize: number, tracking: 'tight' | 'normal' | 'wide' = 'normal') => {
  const trackingValues = {
    tight: -0.025,
    normal: 0,
    wide: 0.025,
  };
  
  return fontSize * trackingValues[tracking];
};

// Text style utilities
export const createTextStyle = (variant: keyof typeof typography, overrides?: any) => {
  return {
    ...typography[variant],
    ...overrides,
  };
};

// Platform-specific adjustments
export const platformTextStyle = {
  ios: {
    // iOS-specific text adjustments
    includeFontPadding: false,
    textAlignVertical: 'center' as const,
  },
  android: {
    // Android-specific text adjustments
    includeFontPadding: false,
    textAlignVertical: 'center' as const,
  },
  default: {},
};

export default typography;
