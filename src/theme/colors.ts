export interface ColorPalette {
  background: string;
  card: string;
  cardSecondary: string;
  surfaceRaised: string;
  inset: string;
  
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  secondary: string;
  secondaryLight: string;
  
  accent: string;
  
  text: string;
  textSecondary: string;
  textMuted: string;
  
  border: string;
  borderHighlight: string;
  
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;

  platformInstagram: string;
  platformInstagramBg: string;
  platformX: string;
  platformXBg: string;
  platformDirect: string;
  platformDirectBg: string;
}

export const lightColors: ColorPalette = {
  background: '#F6F4FA',
  card: '#FFFFFF',
  cardSecondary: '#EFEBF6',
  surfaceRaised: '#EDE8F5',
  inset: '#E7E2F0',
  
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5643CC',
  
  secondary: '#8E78FF',
  secondaryLight: '#D8D0FC',
  
  accent: '#E056FD',
  
  text: '#272335',
  textSecondary: '#645F77',
  textMuted: '#9B95AC',
  
  border: 'rgba(108, 92, 231, 0.1)',
  borderHighlight: 'rgba(255, 255, 255, 0.9)',
  
  success: '#10B981',
  successBg: '#E6F8F2',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  error: '#EF4444',
  errorBg: '#FEE2E2',

  platformInstagram: '#E1306C',
  platformInstagramBg: '#FCE7EE',
  platformX: '#0F1419',
  platformXBg: '#E9ECF0',
  platformDirect: '#4A69BD',
  platformDirectBg: '#E4EBFA',
};

export const darkColors: ColorPalette = {
  background: '#15131B',
  card: '#201D27',
  cardSecondary: '#292534',
  surfaceRaised: '#2E293B',
  inset: '#1A1822',
  
  primary: '#8E7DFF',
  primaryLight: '#B8ADFF',
  primaryDark: '#6D5CD8',
  
  secondary: '#9F90F7',
  secondaryLight: '#3D365C',
  
  accent: '#D973FD',
  
  text: '#F5F3F9',
  textSecondary: '#B3ADC1',
  textMuted: '#79738A',
  
  border: 'rgba(255, 255, 255, 0.08)',
  borderHighlight: 'rgba(255, 255, 255, 0.15)',
  
  success: '#34D399',
  successBg: '#064E3B',
  warning: '#FBBF24',
  warningBg: '#78350F',
  error: '#F87171',
  errorBg: '#7F1D1D',

  platformInstagram: '#FF4D80',
  platformInstagramBg: '#4A1224',
  platformX: '#F1F3F5',
  platformXBg: '#2C3038',
  platformDirect: '#6A8BE6',
  platformDirectBg: '#1B2745',
};
