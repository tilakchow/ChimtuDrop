import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { SupportedPlatform, MediaType } from '../../types/media';

interface BadgeProps {
  platform?: SupportedPlatform;
  mediaType?: MediaType;
  label?: string;
  variant?: 'platform' | 'mediaType' | 'status';
  status?: 'completed' | 'failed' | 'downloading';
  iconOnly?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  platform,
  mediaType,
  label,
  variant = 'platform',
  status,
  iconOnly = false,
}) => {
  const { colors, typography, isDark } = useTheme();

  if (variant === 'platform' && platform) {
    let bg = colors.platformDirectBg;
    let text = colors.platformDirect;
    let icon: keyof typeof Ionicons.glyphMap = 'link';
    let name = 'Direct';

    if (platform === 'instagram') {
      bg = colors.platformInstagramBg;
      text = colors.platformInstagram;
      icon = 'logo-instagram';
      name = 'Instagram';
    } else if (platform === 'x') {
      bg = colors.platformXBg;
      text = colors.platformX;
      icon = 'logo-twitter';
      name = 'X';
    } else if (platform === 'youtube') {
      bg = isDark ? 'rgba(255, 0, 0, 0.2)' : '#FFEBEE';
      text = '#E50914';
      icon = 'logo-youtube';
      name = 'YouTube';
    } else if (platform === 'facebook') {
      bg = isDark ? 'rgba(24, 119, 242, 0.2)' : '#E7F3FF';
      text = '#1877F2';
      icon = 'logo-facebook';
      name = 'Facebook';
    }

    return (
      <View style={[styles.badge, iconOnly && styles.badgeIconOnly, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={iconOnly ? 14 : 11} color={text} style={iconOnly ? undefined : { marginRight: 4 }} />
        {!iconOnly && (
          <Text style={[typography.monoLabel, { color: text, fontSize: 10 }]}>{label || name}</Text>
        )}
      </View>
    );
  }

  if (variant === 'mediaType' && mediaType) {
    let icon: keyof typeof Ionicons.glyphMap = 'image-outline';
    let title = 'Photo';

    if (mediaType === 'video') {
      icon = 'videocam-outline';
      title = 'Video';
    } else if (mediaType === 'carousel') {
      icon = 'albums-outline';
      title = 'Carousel';
    }

    return (
      <View
        style={[
          styles.badge,
          iconOnly && styles.badgeIconOnly,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(108, 92, 231, 0.08)',
          },
        ]}
      >
        <Ionicons name={icon} size={iconOnly ? 14 : 11} color={colors.primary} style={iconOnly ? undefined : { marginRight: 4 }} />
        {!iconOnly && (
          <Text style={[typography.monoLabel, { color: colors.primary, fontSize: 10 }]}>
            {label || title}
          </Text>
        )}
      </View>
    );
  }

  if (variant === 'status' && status) {
    const isCompleted = status === 'completed';
    const isFailed = status === 'failed';
    const color = isCompleted ? colors.success : isFailed ? colors.error : colors.warning;
    const bg = isCompleted ? colors.successBg : isFailed ? colors.errorBg : colors.warningBg;

    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[typography.monoLabel, { color, fontSize: 10 }]}>
          {status}
        </Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeIconOnly: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
    minHeight: 28,
  },
});
