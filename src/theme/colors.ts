export interface ThemeColors {
  mode: 'dark' | 'light';
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryMuted: string;
  secondary: string;
  secondaryMuted: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  dangerMuted: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  glassBackground: string;
  cardShadow: string;
}

export const DarkTheme: ThemeColors = {
  mode: 'dark',
  background: '#090B10',
  surface: '#121620',
  surfaceElevated: '#1A202E',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.14)',
  primary: '#00F59B',
  primaryMuted: 'rgba(0, 245, 155, 0.12)',
  secondary: '#6366F1',
  secondaryMuted: 'rgba(99, 102, 241, 0.15)',
  accent: '#38BDF8',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.15)',
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  glassBackground: 'rgba(18, 22, 32, 0.75)',
  cardShadow: 'rgba(0, 0, 0, 0.5)',
};

export const LightTheme: ThemeColors = {
  mode: 'light',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  border: 'rgba(0, 0, 0, 0.06)',
  borderLight: 'rgba(0, 0, 0, 0.10)',
  primary: '#00B871',
  primaryMuted: 'rgba(0, 184, 113, 0.12)',
  secondary: '#4F46E5',
  secondaryMuted: 'rgba(79, 70, 229, 0.12)',
  accent: '#0284C7',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  dangerMuted: 'rgba(220, 38, 38, 0.12)',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  glassBackground: 'rgba(255, 255, 255, 0.85)',
  cardShadow: 'rgba(0, 0, 0, 0.08)',
};
