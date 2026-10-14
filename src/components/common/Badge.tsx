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
}

export const Badge: React.FC<BadgeProps> = ({
  platform,
  mediaType,
  label,
  variant = 'platform',
  status,
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
      name = 'X (Twitter)';
    }

    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={12} color={text} style={{ marginRight: 4 }} />
        <Text style={[typography.captionBold, { color: text, fontSize: 11 }]}>{label || name}</Text>
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
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(108, 92, 231, 0.08)',
          },
        ]}
      >
        <Ionicons name={icon} size={12} color={colors.primary} style={{ marginRight: 4 }} />
        <Text style={[typography.captionBold, { color: colors.primary, fontSize: 11 }]}>
          {label || title}
        </Text>
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
        <Text style={[typography.captionBold, { color, fontSize: 11, textTransform: 'capitalize' }]}>
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
});
