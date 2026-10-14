import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Header } from '../components/common/Header';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { Badge } from '../components/common/Badge';
import { CarouselSelector } from '../components/preview/CarouselSelector';
import { QualityPicker } from '../components/preview/QualityPicker';
import { MediaMetadata, MediaItem, QualityOption } from '../types/media';
import { formatBytes } from '../utils/fileUtils';

interface MediaPreviewScreenProps {
  metadata: MediaMetadata;
  onBack: () => void;
  onStartDownload: (item: MediaItem, customFilename?: string) => void;
  onStartBatchDownload?: (items: MediaItem[], baseFilename?: string) => void;
}

export const MediaPreviewScreen: React.FC<MediaPreviewScreenProps> = ({
  metadata,
  onBack,
  onStartDownload,
  onStartBatchDownload,
}) => {
  const { colors, typography, spacing, borderRadius, isDark } = useTheme();

  // Carousel item selection state
  const isCarousel = metadata.items.length > 1;
  const [selectedIndices, setSelectedIndices] = useState<number[]>(
    metadata.items.map((_, i) => i)
  );

  // Active item for single item or first item
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const activeItem = metadata.items[activeItemIndex] || metadata.items[0];

  // Editable filename
  const [customFilename, setCustomFilename] = useState(
    metadata.title
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 35) || `${metadata.platform}_media`
  );

  // Selected quality option (if item has multiple qualities)
  const [selectedQuality, setSelectedQuality] = useState<QualityOption | undefined>(
    activeItem?.qualities?.[0]
  );

  const handleToggleCarouselIndex = (index: number) => {
    setSelectedIndices((prev) => {
      if (prev.includes(index)) {
        if (prev.length === 1) {
          Alert.alert('Notice', 'At least one item must be selected.');
          return prev;
        }
        return prev.filter((i) => i !== index);
      } else {
        return [...prev, index];
      }
    });
    setActiveItemIndex(index);
  };

  const handleDownload = () => {
    if (!activeItem) return;

    if (isCarousel && selectedIndices.length > 1 && onStartBatchDownload) {
      const itemsToDownload = selectedIndices.map((i) => metadata.items[i]);
      onStartBatchDownload(itemsToDownload, customFilename);
    } else {
      // If quality is selected, update item URL
      const itemToDownload: MediaItem = {
        ...activeItem,
        url: selectedQuality ? selectedQuality.url : activeItem.url,
      };
      onStartDownload(itemToDownload, customFilename);
    }
  };

  const displayThumbnail = activeItem?.thumbnailUrl || metadata.thumbnailUrl;
  const knownFileSize = selectedQuality?.fileSizeBytes || activeItem?.fileSizeBytes;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Media Preview" showBack onBack={onBack} />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Preview Card */}
        <ClayCard level="medium">
          {/* Platform and Type Badges */}
          <View style={styles.badgeRow}>
            <Badge platform={metadata.platform} variant="platform" />
            <Badge mediaType={metadata.mediaType} variant="mediaType" />
          </View>

          {/* Media Visual Preview */}
          <View
            style={[
              styles.previewContainer,
              {
                backgroundColor: colors.inset,
                borderRadius: borderRadius.md,
                marginTop: spacing.md,
              },
            ]}
          >
            {displayThumbnail ? (
              <Image
                source={{ uri: displayThumbnail }}
                style={[styles.previewImage, { borderRadius: borderRadius.md }]}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons
                  name={activeItem?.type === 'video' ? 'videocam-outline' : 'image-outline'}
                  size={54}
                  color={colors.primary}
                />
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: 8 }]}>
                  Preview unavailable from server
                </Text>
              </View>
            )}

            {activeItem?.type === 'video' && (
              <View style={styles.videoBadge}>
                <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={[typography.captionBold, { color: '#FFFFFF' }]}>Video</Text>
              </View>
            )}
          </View>

          {/* Author info if available */}
          {metadata.author && (
            <View style={[styles.authorRow, { marginTop: spacing.md }]}>
              {metadata.author.avatarUrl ? (
                <Image
                  source={{ uri: metadata.author.avatarUrl }}
                  style={[styles.avatar, { borderRadius: 14 }]}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceRaised, borderRadius: 14 }]}>
                  <Ionicons name="person" size={14} color={colors.primary} />
                </View>
              )}
              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Text numberOfLines={1} style={[typography.headline, { color: colors.text }]}>
                  {metadata.author.displayName || metadata.author.username}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  @{metadata.author.username}
                </Text>
              </View>
            </View>
          )}

          {/* Title / Caption */}
          <Text
            numberOfLines={3}
            style={[typography.body, { color: colors.text, marginTop: spacing.sm }]}
          >
            {metadata.title}
          </Text>

          {/* Carousel Selector if multiple items */}
          {isCarousel && (
            <CarouselSelector
              items={metadata.items}
              selectedIndices={selectedIndices}
              onToggleIndex={handleToggleCarouselIndex}
              onSelectAll={() => setSelectedIndices(metadata.items.map((_, i) => i))}
              onDeselectAll={() => setSelectedIndices([0])}
            />
          )}

          {/* Quality Picker if available */}
          {activeItem?.qualities && activeItem.qualities.length > 0 && (
            <QualityPicker
              qualities={activeItem.qualities}
              selectedQualityId={selectedQuality?.id}
              onSelectQuality={(q) => setSelectedQuality(q)}
            />
          )}

          {/* Filename & Details Card */}
          <View style={[styles.fileDetailsSection, { marginTop: spacing.lg }]}>
            <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.xs }]}>
              Save File As
            </Text>
            <View
              style={[
                styles.filenameInputContainer,
                {
                  backgroundColor: colors.inset,
                  borderRadius: borderRadius.md,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(108,92,231,0.1)',
                },
              ]}
            >
              <Ionicons name="document-text-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <TextInput
                value={customFilename}
                onChangeText={setCustomFilename}
                placeholder="Enter filename..."
                placeholderTextColor={colors.textMuted}
                style={[typography.body, styles.filenameInput, { color: colors.text }]}
              />
              <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                .{activeItem?.type === 'video' ? 'mp4' : 'jpg'}
              </Text>
            </View>

            {knownFileSize ? (
              <View style={styles.fileSizeRow}>
                <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Estimated size: {formatBytes(knownFileSize)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Download CTA Button */}
          <ClayButton
            title={
              isCarousel && selectedIndices.length > 1
                ? `Download ${selectedIndices.length} Items`
                : 'Download Media'
            }
            onPress={handleDownload}
            icon={<Ionicons name="download" size={18} color="#FFFFFF" />}
            size="lg"
            style={{ marginTop: spacing.xl }}
          />
        </ClayCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewContainer: {
    width: '100%',
    height: 240,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  videoBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDetailsSection: {},
  filenameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  filenameInput: {
    flex: 1,
    paddingVertical: 4,
  },
  fileSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
});
