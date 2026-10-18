export interface ThemeColors {
  mode: 'dark' | 'light';
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  borderHighlight: string;
  pillBackground: string;
  
  // Neo-Fintech Acid Accent & Precision Monochrome
  primary: string;           // Acid Volt / Neon Lime
  primaryForeground: string; // Dark contrast on acid volt
  secondary: string;
  
  // Status
  success: string;
  successSubtle: string;
  danger: string;
  dangerSubtle: string;
  warning: string;
  warningSubtle: string;
  
  // Tipografia com alto contraste
  text: string;
  textSecondary: string;
  textMuted: string;
  
  cardShadow: string;
}

export const DarkTheme: ThemeColors = {
  mode: 'dark',
  background: '#040405',         // OLED Deep Black
  surface: '#0D0E12',            // Titanium Graphite
  surfaceElevated: '#15171E',
  surfaceSubtle: '#1C1F28',
  border: 'rgba(255, 255, 255, 0.07)',
  borderSubtle: 'rgba(255, 255, 255, 0.04)',
  borderStrong: 'rgba(255, 255, 255, 0.12)',
  borderHighlight: 'rgba(217, 249, 32, 0.25)',
  pillBackground: 'rgba(255, 255, 255, 0.06)',
  
  primary: '#D9F920',            // Acid Volt (Estilo Cash App / Linear / Off-White)
  primaryForeground: '#040405',
  secondary: '#3B82F6',
  
  success: '#10B981',
  successSubtle: 'rgba(16, 185, 129, 0.14)',
  danger: '#FF3B30',
  dangerSubtle: 'rgba(255, 59, 48, 0.14)',
  warning: '#F59E0B',
  warningSubtle: 'rgba(245, 158, 11, 0.14)',
  
  text: '#F3F4F6',
  textSecondary: '#8B93A5',
  textMuted: '#525866',
  
  cardShadow: 'rgba(0, 0, 0, 0.4)',
};

export const LightTheme: ThemeColors = {
  mode: 'light',
  background: '#F6F7F9',         // Crisp Ceramic
  surface: '#FFFFFF',
  surfaceElevated: '#F0F2F5',
  surfaceSubtle: '#E5E8ED',
  border: 'rgba(0, 0, 0, 0.05)',
  borderSubtle: 'rgba(0, 0, 0, 0.03)',
  borderStrong: 'rgba(0, 0, 0, 0.09)',
  borderHighlight: 'rgba(0, 0, 0, 0.14)',
  pillBackground: 'rgba(0, 0, 0, 0.04)',
  
  primary: '#090A0C',            // Deep Carbon Black no modo claro
  primaryForeground: '#FFFFFF',
  secondary: '#2563EB',
  
  success: '#059669',
  successSubtle: 'rgba(5, 150, 105, 0.10)',
  danger: '#E11D48',
  dangerSubtle: 'rgba(225, 29, 72, 0.10)',
  warning: '#D97706',
  warningSubtle: 'rgba(217, 119, 6, 0.10)',
  
  text: '#090A0C',
  textSecondary: '#4A5160',
  textMuted: '#8C94A4',
  
  cardShadow: 'rgba(0, 0, 0, 0.04)',
};
