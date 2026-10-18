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

  // Neo-Fintech Luxury Accents & Tactile Surfaces
  cardSpecularLight: string;
  chipGoldPrimary: string;
  chipGoldSecondary: string;
  chipGoldBorder: string;
  chipSilverPrimary: string;
  chipSilverSecondary: string;
  chipSilverBorder: string;
  badgeBackground: string;
}

export const DarkTheme: ThemeColors = {
  mode: 'dark',
  background: '#040405',         // OLED Deep Black
  surface: '#0D0E12',            // Titanium Graphite
  surfaceElevated: '#15171E',
  surfaceSubtle: '#1C1F28',
  border: 'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',
  borderHighlight: 'rgba(217, 249, 32, 0.28)',
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
  
  cardShadow: 'rgba(0, 0, 0, 0.55)',

  // Luxo e Cartões
  cardSpecularLight: 'rgba(255, 255, 255, 0.15)',
  chipGoldPrimary: '#D4AF37',
  chipGoldSecondary: '#EAD385',
  chipGoldBorder: '#8A6D1E',
  chipSilverPrimary: '#CBD5E1',
  chipSilverSecondary: '#F1F5F9',
  chipSilverBorder: '#64748B',
  badgeBackground: 'rgba(217, 249, 32, 0.12)',
};

export const LightTheme: ThemeColors = {
  mode: 'light',
  background: '#F6F7F9',         // Crisp Ceramic
  surface: '#FFFFFF',
  surfaceElevated: '#F0F2F5',
  surfaceSubtle: '#E5E8ED',
  border: 'rgba(0, 0, 0, 0.06)',
  borderSubtle: 'rgba(0, 0, 0, 0.04)',
  borderStrong: 'rgba(0, 0, 0, 0.12)',
  borderHighlight: 'rgba(0, 0, 0, 0.18)',
  pillBackground: 'rgba(0, 0, 0, 0.05)',
  
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
  
  cardShadow: 'rgba(0, 0, 0, 0.08)',

  // Luxo e Cartões
  cardSpecularLight: 'rgba(255, 255, 255, 0.25)',
  chipGoldPrimary: '#D4AF37',
  chipGoldSecondary: '#EAD385',
  chipGoldBorder: '#8A6D1E',
  chipSilverPrimary: '#CBD5E1',
  chipSilverSecondary: '#F1F5F9',
  chipSilverBorder: '#64748B',
  badgeBackground: 'rgba(9, 10, 12, 0.06)',
};
