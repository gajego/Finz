export interface ThemeColors {
  mode: 'dark' | 'light';
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  border: string;
  borderStrong: string;
  
  // Neo-Fintech Acid Accent & Precision Monochrome
  primary: string;           // Acid Volt / Neon Lime
  primaryForeground: string; // Dark contrast on acid volt
  secondary: string;
  
  // Status
  success: string;
  danger: string;
  warning: string;
  
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
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.18)',
  
  primary: '#D9F920',            // Acid Volt (Estilo Cash App / Linear / Off-White)
  primaryForeground: '#040405',
  secondary: '#3B82F6',
  
  success: '#10B981',
  danger: '#FF3B30',
  warning: '#F59E0B',
  
  text: '#F3F4F6',
  textSecondary: '#8B93A5',
  textMuted: '#525866',
  
  cardShadow: '#000000',
};

export const LightTheme: ThemeColors = {
  mode: 'light',
  background: '#F6F7F9',         // Crisp Ceramic
  surface: '#FFFFFF',
  surfaceElevated: '#EDEFF2',
  surfaceSubtle: '#E2E5EA',
  border: 'rgba(0, 0, 0, 0.07)',
  borderStrong: 'rgba(0, 0, 0, 0.16)',
  
  primary: '#090A0C',            // Deep Carbon Black no modo claro
  primaryForeground: '#FFFFFF',
  secondary: '#2563EB',
  
  success: '#059669',
  danger: '#E11D48',
  warning: '#D97706',
  
  text: '#090A0C',
  textSecondary: '#4A5160',
  textMuted: '#8C94A4',
  
  cardShadow: 'rgba(0, 0, 0, 0.06)',
};
