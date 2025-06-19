export const colors = {
  // Primary brand colors (derived from Centrika branding)
  primary: '#1A73E8',
  primaryDark: '#1557B0',
  primaryLight: '#4285F4',

  // Secondary colors
  secondary: '#34A853',
  accent: '#FF6B35',

  // Status colors
  success: '#34A853',
  warning: '#FBBC04',
  error: '#EA4335',
  info: '#1A73E8',

  // Grayscale
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Blue variants
  blue: {
    50: '#EBF8FF',
    100: '#BEE3F8',
    200: '#90CDF4',
    300: '#63B3ED',
    400: '#4299E1',
    500: '#3182CE',
    600: '#2B77CB',
    700: '#2C5282',
    800: '#2A4365',
    900: '#1A365D',
  },

  // Green variants
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },

  // Red variants
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Yellow variants
  yellow: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Text colors
  text: {
    primary: '#1F2937',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
  },

  // Background colors
  background: '#F9FAFB',
  surface: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Border colors
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
  },

  // Card colors
  card: {
    background: '#FFFFFF',
    border: '#E5E7EB',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },

  // Input colors
  input: {
    background: '#FFFFFF',
    border: '#D1D5DB',
    borderFocus: '#1A73E8',
    placeholder: '#9CA3AF',
  },

  // Button colors
  button: {
    primary: '#1A73E8',
    primaryHover: '#1557B0',
    secondary: '#F3F4F6',
    secondaryHover: '#E5E7EB',
    danger: '#EA4335',
    dangerHover: '#D33B2C',
  },

  // Financial colors (for amounts, balances, etc.)
  financial: {
    positive: '#22C55E',
    negative: '#EF4444',
    neutral: '#6B7280',
    balance: '#1A73E8',
  },

  // Rwanda flag colors (for cultural relevance)
  rwanda: {
    blue: '#00A1DE',
    yellow: '#FAD201',
    green: '#00A651',
  },

  // Transparency levels
  opacity: {
    10: 'rgba(0, 0, 0, 0.1)',
    20: 'rgba(0, 0, 0, 0.2)',
    30: 'rgba(0, 0, 0, 0.3)',
    40: 'rgba(0, 0, 0, 0.4)',
    50: 'rgba(0, 0, 0, 0.5)',
    60: 'rgba(0, 0, 0, 0.6)',
    70: 'rgba(0, 0, 0, 0.7)',
    80: 'rgba(0, 0, 0, 0.8)',
    90: 'rgba(0, 0, 0, 0.9)',
  },
};

// Color utilities
export const getColorWithOpacity = (color: string, opacity: number): string => {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const colorMixer = (color1: string, color2: string, ratio: number): string => {
  // Simple color mixing utility (simplified implementation)
  // In production, you might want a more sophisticated color mixing library
  return ratio > 0.5 ? color1 : color2;
};

export default colors;
