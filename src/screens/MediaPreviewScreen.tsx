import React, { useState } from 'react';
import {
  View,
  Text,
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
import { MediaVideoPreview } from '../components/preview/MediaVideoPreview';
import { MediaMetadata, MediaItem, QualityOption } from '../types/media';
import { formatBytes } from '../utils/fileUtils';
import { generateCleanFilename } from '../utils/filenameUtils';

const getCleanTitle = (rawTitle?: string, platform?: string): string => {
  if (!rawTitle) return `${platform ? platform.toUpperCase() : 'Media'} Stream`;
  const cleaned = rawTitle.replace(/^(video|post|reel|tweet)\s+by\s+[^:\n_]+/i, '').trim();
  return cleaned.length > 2 ? cleaned : `${platform ? platform.toUpperCase() : 'Media'} Stream`;
};

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

  // Editable clean sensible filename using media title or timestamp
  const [customFilename, setCustomFilename] = useState(() =>
    generateCleanFilename(metadata.title, activeItem?.type || 'video')
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
      // If quality is selected, update item URL safely
      const itemToDownload: MediaItem = {
        ...activeItem,
        url: selectedQuality?.url || (selectedQuality as any)?.direct_url || activeItem.url,
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

          {/* Real Playable Video or Clean Thumbnail Fallback */}
          <View style={{ marginTop: spacing.md }}>
            <MediaVideoPreview
              previewUrl={activeItem?.previewUrl}
              thumbnailUrl={displayThumbnail}
              mediaType={activeItem?.type}
              durationSeconds={metadata.durationSeconds}
              aspectRatio={
                activeItem?.width && activeItem?.height
                  ? activeItem.width / activeItem.height
                  : 16 / 9
              }
            />
          </View>

          {/* Title / Caption */}
          <Text
            numberOfLines={2}
            style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}
          >
            {getCleanTitle(metadata.title, metadata.platform)}
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

          {/* Quality Picker: only displayed if there are genuinely multiple quality options to choose from */}
          {activeItem?.qualities && activeItem.qualities.length > 1 ? (
            <QualityPicker
              qualities={activeItem.qualities}
              selectedQualityId={selectedQuality?.id}
              onSelectQuality={(q) => setSelectedQuality(q)}
            />
          ) : null}

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
                ? `DOWNLOAD ${selectedIndices.length} ITEMS`
                : 'DOWNLOAD BEST QUALITY'
            }
            onPress={handleDownload}
            icon={<Ionicons name="arrow-down-circle" size={20} color="#FFFFFF" />}
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
