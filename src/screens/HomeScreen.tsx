import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../theme/ThemeContext';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ClayInput } from '../components/common/ClayInput';
import { Badge } from '../components/common/Badge';
import { QualityPicker } from '../components/preview/QualityPicker';
import { MediaVideoPreview } from '../components/preview/MediaVideoPreview';
import { mediaService } from '../services/retrieval/mediaService';
import { downloadManager } from '../services/download/downloadManager';
import { settingsStorage } from '../services/storage/settingsStorage';
import { validateMediaUrl } from '../services/retrieval/urlValidator';
import { MediaMetadata, MediaItem, QualityOption } from '../types/media';
import { DownloadItem, DownloadProgress, DownloadStatus } from '../types/download';
import { formatBytes } from '../utils/fileUtils';
import { generateCleanFilename } from '../utils/filenameUtils';

const getDisplayTitle = (rawTitle?: string, platform?: string): string => {
  if (!rawTitle) return `${platform ? platform.toUpperCase() : 'Media'} Ready`;
  const cleaned = rawTitle.replace(/^(video|post|reel|tweet)\s+by\s+[^:\n_]+/i, '').trim();
  return cleaned.length > 2 ? cleaned : `${platform ? platform.toUpperCase() : 'Media'} Ready`;
};

interface HomeScreenProps {
  onMediaFetched?: (metadata: MediaMetadata) => void;
  onNavigateToSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onMediaFetched,
  onNavigateToSettings,
}) => {
  const { colors, typography, spacing, borderRadius, isDark } = useTheme();

  const [inputUrl, setInputUrl] = useState('');
  const [errorText, setErrorText] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  // In-Place Preview & Download States
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<QualityOption | undefined>(undefined);
  const [customFilename, setCustomFilename] = useState('');

  // In-Place Download Progress States
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    totalBytes: 0,
    downloadedBytes: 0,
    fraction: 0,
  });
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [completedItem, setCompletedItem] = useState<DownloadItem | null>(null);

  const activeDownloadIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedUrlRef = useRef<string>('');

  /**
   * Main Fetch Logic (Supports auto-trigger and manual trigger)
   */
  const handleFetchMedia = async (urlToFetch?: string) => {
    const targetUrl = (urlToFetch || inputUrl).trim();
    if (!targetUrl) return;

    const validation = validateMediaUrl(targetUrl);
    if (!validation.isValid) {
      setErrorText(validation.error || 'Please enter a valid social media URL.');
      return;
    }

    // Avoid refetching identical URL if already active
    if (lastFetchedUrlRef.current === targetUrl && metadata) {
      return;
    }

    setErrorText('');
    setIsFetching(true);
    setDownloadStatus('idle');
    setDownloadError(null);
    setCompletedItem(null);

    try {
      const settings = await settingsStorage.getSettings();
      const result = await mediaService.fetchMedia(targetUrl, {
        backendEndpoint: settings.customBackendEndpoint,
        apiKey: settings.customApiKey,
      });

      if (result.success && result.data) {
        const fetchedData = result.data;
        lastFetchedUrlRef.current = targetUrl;
        setMetadata(fetchedData);

        const item = fetchedData.items?.[0] || null;
        setActiveItem(item);

        const defaultQuality = item?.qualities?.[0] || undefined;
        setSelectedQuality(defaultQuality);

        // Format clean sensible default filename using title or timestamp
        const cleanTitle = generateCleanFilename(fetchedData.title, item?.type || 'video');
        setCustomFilename(cleanTitle);

        onMediaFetched?.(fetchedData);
      } else {
        const msg = result.error?.message || 'Unable to retrieve media from this link.';
        setErrorText(msg);
        setMetadata(null);
      }
    } catch (err: any) {
      setErrorText(err?.message || 'A network error occurred while fetching media.');
      setMetadata(null);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const text = await Clipboard.getStringAsync();
        if (isMounted && text && text.trim().length > 0) {
          const validation = validateMediaUrl(text.trim());
          if (validation.isValid) {
            setInputUrl(text.trim());
            handleFetchMedia(text.trim());
          }
        }
      } catch {
        // Ignore
      }
    })();

    return () => {
      isMounted = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Auto-Fetch when user pastes or types a valid media URL
   */
  const handleUrlChange = (text: string) => {
    setInputUrl(text);
    if (errorText) setErrorText('');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = text.trim();
    if (trimmed.length > 8) {
      const validation = validateMediaUrl(trimmed);
      if (validation.isValid && trimmed !== lastFetchedUrlRef.current && !isFetching) {
        // Auto-fetch immediately after 250ms when a valid URL is pasted/typed
        debounceTimerRef.current = setTimeout(() => {
          handleFetchMedia(trimmed);
        }, 250);
      }
    }
  };

  /**
   * One-Tap Paste and Instant Fetch
   */
  const handlePasteClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim().length > 0) {
        const trimmed = text.trim();
        setInputUrl(trimmed);
        setErrorText('');
        handleFetchMedia(trimmed);
      }
    } catch {
      // Ignore
    }
  };

  const handleClear = () => {
    setInputUrl('');
    setErrorText('');
    setMetadata(null);
    setActiveItem(null);
    setDownloadStatus('idle');
    setCompletedItem(null);
    lastFetchedUrlRef.current = '';
  };

  /**
   * In-Place Download Execution
   */
  const handleStartDownload = async () => {
    if (!metadata || !activeItem) return;

    setDownloadStatus('downloading');
    setDownloadError(null);
    setDownloadProgress({ totalBytes: 0, downloadedBytes: 0, fraction: 0 });

    try {
      const settings = await settingsStorage.getSettings();

      // Resolve safe item to download with reliable URL
      const targetUrl = selectedQuality?.url || (selectedQuality as any)?.direct_url || activeItem.url;
      const itemToDownload: MediaItem = {
        ...activeItem,
        url: targetUrl,
      };

      const completed = await downloadManager.startDownload(
        metadata,
        itemToDownload,
        customFilename,
        settings.autoSaveToGallery,
        (progress) => {
          setDownloadProgress(progress);
        },
        (status, err) => {
          setDownloadStatus(status);
          if (err) setDownloadError(err);
        }
      );

      activeDownloadIdRef.current = completed.id;
      setCompletedItem(completed);
      setDownloadStatus('completed');
    } catch (err: any) {
      setDownloadStatus('failed');
      setDownloadError(err?.message || 'Download execution failed.');
    }
  };

  const handleCancelDownload = async () => {
    if (activeDownloadIdRef.current) {
      await downloadManager.cancelDownload(activeDownloadIdRef.current);
    }
    setDownloadStatus('cancelled');
  };

  const displayThumbnail = activeItem?.thumbnailUrl || metadata?.thumbnailUrl;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top App Bar with Elevated Card Branding & Settings */}
        <View
          style={[
            styles.topBarCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.xl,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm + 2,
            },
          ]}
        >
          <View style={styles.brandRow}>
            <View
              style={[
                styles.logoWrapper,
                {
                  backgroundColor: isDark ? 'rgba(108, 92, 231, 0.15)' : '#F0EDFC',
                  borderColor: isDark ? 'rgba(142, 125, 255, 0.25)' : 'rgba(108, 92, 231, 0.2)',
                },
              ]}
            >
              <Image
                source={require('../../assets/chimtudrop-logo.png')}
                style={styles.logoMascot}
                resizeMode="contain"
              />
            </View>
            <View style={{ marginLeft: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[typography.title1, { color: colors.text, fontSize: 19 }]}>
                  CHIMTU <Text style={{ color: colors.primary }}>DROP.</Text>
                </Text>
                <View
                  style={[
                    styles.liveIndicator,
                    {
                      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#E6F8F2',
                      borderColor: isDark ? 'rgba(52, 211, 153, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                    },
                  ]}
                >
                  <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                  <Text style={[typography.monoCaption, { color: colors.success, fontSize: 8.5, letterSpacing: 0.8 }]}>
                    READY
                  </Text>
                </View>
              </View>
              <Text style={[typography.monoCaption, { color: colors.textSecondary, fontSize: 9.5, letterSpacing: 1.1 }]}>
                SAVE FROM THE SCROLL
              </Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <Pressable
              onPress={onNavigateToSettings}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                },
                pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
              ]}
            >
              <Ionicons name="settings-outline" size={19} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Platform Supported Badges (Clean Icon-Only Row) */}
        <View style={[styles.platformRow, { marginTop: spacing.md, marginBottom: 2 }]}>
          <Text style={[typography.monoLabel, { color: colors.textMuted, marginRight: spacing.sm, fontSize: 10 }]}>
            SUPPORTED:
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Badge platform="instagram" variant="platform" iconOnly />
            <Badge platform="x" variant="platform" iconOnly />
            <Badge platform="youtube" variant="platform" iconOnly />
            <Badge platform="facebook" variant="platform" iconOnly />
          </View>
        </View>

        {/* Main URL Input Card */}
        <ClayCard level="medium" style={{ marginTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
            <Text style={[typography.hero, { color: colors.text, fontSize: 28, letterSpacing: -0.6 }]}>
              DROP A <Text style={{ color: colors.primary }}>LINK.</Text>
            </Text>
            {metadata && (
              <Pressable onPress={handleClear} hitSlop={8}>
                <Text style={[typography.monoLabel, { color: colors.primary, fontSize: 11 }]}>
                  CLEAR
                </Text>
              </Pressable>
            )}
          </View>

          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Supports Instagram, YouTube, X, and Facebook.
          </Text>

          <ClayInput
            value={inputUrl}
            onChangeText={handleUrlChange}
            placeholder="Paste your link here..."
            error={errorText}
            onPaste={handlePasteClipboard}
          />
        </ClayCard>

        {/* Loading Spinner Indicator Card */}
        {isFetching && (
          <ClayCard level="soft" style={{ marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.xl }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.headline, { color: colors.text, marginTop: spacing.md }]}>
              Fetching Media Details...
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
              Extracting video formats and resolutions from server
            </Text>
          </ClayCard>
        )}

        {/* ============================================================== */}
        {/* IN-PLACE ONE-PAGE MEDIA PREVIEW & DOWNLOAD CARD                */}
        {/* ============================================================== */}
        {metadata && activeItem && !isFetching && (
          <ClayCard level="medium" style={{ marginTop: spacing.lg }}>
            {/* Header with Badges and Close button */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Badge platform={metadata.platform} variant="platform" />
                <Badge mediaType={metadata.mediaType} variant="mediaType" />
              </View>
              <Pressable onPress={handleClear} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Real Playable Video or Clean Thumbnail Fallback */}
            <View style={{ marginTop: spacing.md }}>
              <MediaVideoPreview
                previewUrl={activeItem.previewUrl}
                thumbnailUrl={displayThumbnail}
                mediaType={activeItem.type}
                durationSeconds={metadata.durationSeconds}
                aspectRatio={
                  activeItem.width && activeItem.height
                    ? activeItem.width / activeItem.height
                    : 16 / 9
                }
              />
            </View>

            {/* Clean Secondary Title/Caption */}
            <Text numberOfLines={2} style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
              {getDisplayTitle(metadata.title, metadata.platform)}
            </Text>

            {/* Quality Selector: only displayed if there are genuinely multiple quality options to choose from */}
            {activeItem.qualities && activeItem.qualities.length > 1 ? (
              <QualityPicker
                qualities={activeItem.qualities}
                selectedQualityId={selectedQuality?.id}
                onSelectQuality={(q) => setSelectedQuality(q)}
              />
            ) : null}

            {/* Editable Filename */}
            <View style={{ marginTop: spacing.md }}>
              <Text style={[typography.monoLabel, { color: colors.textSecondary, marginBottom: 4, fontSize: 11 }]}>
                SAVE FILE AS:
              </Text>
              <View
                style={[
                  styles.filenameBox,
                  { backgroundColor: colors.inset, borderRadius: borderRadius.md, borderColor: colors.border },
                ]}
              >
                <Ionicons name="document-text-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <TextInput
                  value={customFilename}
                  onChangeText={setCustomFilename}
                  placeholder="Enter file name..."
                  placeholderTextColor={colors.textMuted}
                  style={[typography.body, { flex: 1, color: colors.text, paddingVertical: 2 }]}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* ========================================================== */}
            {/* IN-PLACE DOWNLOAD CONTROLS & LIVE PROGRESS                */}
            {/* ========================================================== */}
            {downloadStatus === 'idle' && (
              <ClayButton
                title="DOWNLOAD BEST QUALITY"
                onPress={handleStartDownload}
                variant="primary"
                size="lg"
                icon={<Ionicons name="arrow-down-circle" size={20} color="#FFFFFF" />}
                style={{ marginTop: spacing.lg }}
              />
            )}

            {downloadStatus === 'downloading' && (
              <View style={[styles.downloadingBox, { backgroundColor: colors.inset, borderRadius: borderRadius.md, marginTop: spacing.lg }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[typography.bodyBold, { color: colors.text }]}>
                    Downloading... {Math.round(downloadProgress.fraction * 100)}%
                  </Text>
                  {downloadProgress.speedBytesPerSec ? (
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {formatBytes(downloadProgress.speedBytesPerSec)}/s
                    </Text>
                  ) : null}
                </View>

                {/* Progress Bar Track */}
                <View style={[styles.progressBarTrack, { backgroundColor: colors.border, borderRadius: 4 }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: colors.primary,
                        borderRadius: 4,
                        width: `${Math.max(5, Math.min(100, Math.round(downloadProgress.fraction * 100)))}%`,
                      },
                    ]}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {downloadProgress.totalBytes > 0
                      ? `${formatBytes(downloadProgress.downloadedBytes)} of ${formatBytes(downloadProgress.totalBytes)}`
                      : 'Connecting to server...'}
                  </Text>
                  <Pressable onPress={handleCancelDownload} hitSlop={8}>
                    <Text style={[typography.captionBold, { color: '#E53935' }]}>
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {downloadStatus === 'completed' && completedItem && (
              <View style={[styles.completedBox, { backgroundColor: '#E8F5E9', borderColor: '#4CAF50', borderRadius: borderRadius.md, marginTop: spacing.lg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Ionicons name="checkmark-circle" size={22} color="#2E7D32" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyBold, { color: '#2E7D32' }]}>
                      Saved Successfully!
                    </Text>
                    <Text style={[typography.caption, { color: '#388E3C' }]}>
                      Exported to your phone photo gallery
                    </Text>
                  </View>
                </View>

                <ClayButton
                  title="DOWNLOAD ANOTHER"
                  onPress={handleClear}
                  variant="primary"
                  size="md"
                  icon={<Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />}
                  style={{ width: '100%' }}
                />
              </View>
            )}

            {downloadStatus === 'failed' && (
              <View style={[styles.failedBox, { backgroundColor: '#FFEBEE', borderColor: '#E53935', borderRadius: borderRadius.md, marginTop: spacing.lg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="alert-circle" size={20} color="#C62828" style={{ marginRight: 6 }} />
                  <Text style={[typography.bodyBold, { color: '#C62828', flex: 1 }]}>
                    Download Failed
                  </Text>
                </View>
                <Text style={[typography.caption, { color: '#C62828', marginBottom: 10 }]}>
                  {downloadError || 'Failed to download file. Please try again.'}
                </Text>
                <ClayButton
                  title="RETRY DOWNLOAD"
                  onPress={handleStartDownload}
                  variant="primary"
                  size="sm"
                  icon={<Ionicons name="refresh-outline" size={16} color="#FFFFFF" />}
                />
              </View>
            )}
          </ClayCard>
        )}

        {/* Reference Footer Note */}
        <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg }]}>
          Only save public media you have rights to use.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  topBarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  logoMascot: {
    width: 32,
    height: 32,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  clipboardNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  previewContainer: {
    width: '100%',
    height: 240,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  playButtonCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(108, 92, 231, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filenameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  downloadingBox: {
    padding: 14,
  },
  progressBarTrack: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  completedBox: {
    padding: 14,
    borderWidth: 1,
  },
  failedBox: {
    padding: 14,
    borderWidth: 1,
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
