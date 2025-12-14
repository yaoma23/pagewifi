export const COLORS = {
  primary: '#007AFF', // iOS Blue
  secondary: '#5856D6', // iOS Indigo
  background: '#FFFFFF',
  surface: '#F2F2F7', // iOS System Gray 6
  text: '#000000',
  textSecondary: '#8E8E93', // iOS System Gray
  border: '#C6C6C8', // iOS System Gray 3
  error: '#FF3B30', // iOS Red
  success: '#34C759', // iOS Green
  warning: '#FFCC00', // iOS Yellow
  white: '#FFFFFF',
  black: '#000000',
};

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const FONTS = {
  regular: {
    fontWeight: '400' as const,
  },
  medium: {
    fontWeight: '500' as const,
  },
  bold: {
    fontWeight: '700' as const,
  },
  sizes: {
    xs: 12,
    s: 14,
    m: 16,
    l: 20,
    xl: 24,
    xxl: 32,
  },
};

export const Theme = {
  colors: COLORS,
  spacing: SPACING,
  fonts: FONTS,
};
