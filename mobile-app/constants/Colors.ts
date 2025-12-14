export const Colors = {
  // Primary colors - Premium Blue & Teal
  deepBlue: '#2563EB', // Brighter, more modern blue (Tailwind Blue 600)
  deepBlueDark: '#1E40AF', // Darker shade for press states
  emeraldGreen: '#10B981', // Emerald 500
  brightCyan: '#06B6D4', // Cyan 500
  accent: '#F59E0B', // Amber 500 for accents

  // Neutral colors - Slate scale for premium feel
  white: '#FFFFFF',
  black: '#0F172A', // Slate 900 instead of pure black
  gray50: '#F8FAFC', // Slate 50
  gray100: '#F1F5F9', // Slate 100
  gray200: '#E2E8F0', // Slate 200
  gray300: '#CBD5E1', // Slate 300
  gray400: '#94A3B8', // Slate 400
  gray500: '#64748B', // Slate 500
  gray600: '#475569', // Slate 600
  gray700: '#334155', // Slate 700
  gray800: '#1E293B', // Slate 800
  gray900: '#0F172A', // Slate 900

  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Opacity variants
  blueLight: 'rgba(37, 99, 235, 0.1)',
  emeraldLight: 'rgba(16, 185, 129, 0.1)',
  cyanLight: 'rgba(6, 182, 212, 0.1)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

export const FontWeights = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
