import { ViewStyle } from 'react-native';

export const getClayShadow = (isDark: boolean, level: 'soft' | 'medium' | 'floating' | 'inset' = 'medium'): ViewStyle => {
  if (level === 'inset') {
    return {
      borderWidth: 1,
      borderColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(108, 92, 231, 0.08)',
      backgroundColor: isDark ? '#191722' : '#EAE5F3',
    };
  }

  const shadowColor = isDark ? '#000000' : '#4C3B71';

  switch (level) {
    case 'soft':
      return {
        shadowColor,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
      };
    case 'floating':
      return {
        shadowColor,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: isDark ? 0.5 : 0.16,
        shadowRadius: 18,
        elevation: 8,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.95)',
      };
    case 'medium':
    default:
      return {
        shadowColor,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.45 : 0.12,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.95)',
      };
  }
};
