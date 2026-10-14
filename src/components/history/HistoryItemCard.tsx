import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { DownloadItem } from '../../types/download';
import { Badge } from '../common/Badge';
import { formatBytes, formatDate } from '../../utils/fileUtils';

interface HistoryItemCardProps {
  item: DownloadItem;
  onShare: (item: DownloadItem) => void;
  onDelete: (item: DownloadItem) => void;
  onPress?: (item: DownloadItem) => void;
}

export const HistoryItemCard: React.FC<HistoryItemCardProps> = ({
  item,
  onShare,
  onDelete,
  onPress,
}) => {
  const { colors, typography, spacing, borderRadius, getClayShadow, isDark } = useTheme();

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginBottom: spacing.md,
          ...getClayShadow('soft'),
        },
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.row}>
        {/* Thumbnail / Preview */}
        <View
          style={[
            styles.thumbnailContainer,
            {
              backgroundColor: colors.inset,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          {item.thumbnailUri ? (
            <Image
              source={{ uri: item.thumbnailUri }}
              style={[styles.thumbnail, { borderRadius: borderRadius.md }]}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name={item.mediaType === 'video' ? 'videocam' : 'image'}
              size={24}
              color={colors.primary}
            />
          )}
          {item.mediaType === 'video' && (
            <View style={styles.videoOverlay}>
              <Ionicons name="play" size={12} color="#FFF" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={[styles.info, { marginLeft: spacing.md }]}>
          <View style={styles.topRow}>
            <Badge platform={item.platform} variant="platform" />
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {formatDate(item.downloadedAt)}
            </Text>
          </View>

          <Text
            numberOfLines={1}
            style={[typography.headline, { color: colors.text, marginTop: 4 }]}
          >
            {item.fileName}
          </Text>

          <View style={styles.metaRow}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {formatBytes(item.fileSizeBytes)}
            </Text>
            {item.savedToGallery && (
              <View style={[styles.galleryTag, { backgroundColor: isDark ? '#1C3829' : '#E8F5E9' }]}>
                <Ionicons name="images-outline" size={11} color={colors.success} style={{ marginRight: 3 }} />
                <Text style={[typography.captionBold, { color: colors.success, fontSize: 10 }]}>Gallery</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => onShare(item)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: isDark ? '#2E2B3A' : '#EDE8F5' },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="share-outline" size={16} color={colors.primary} />
          </Pressable>

          <Pressable
            onPress={() => onDelete(item)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: isDark ? '#3D2024' : '#FCE8E8', marginTop: 8 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  galleryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  actions: {
    alignItems: 'center',
    marginLeft: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
