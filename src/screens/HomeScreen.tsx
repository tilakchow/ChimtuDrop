import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../theme/ThemeContext';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ClayInput } from '../components/common/ClayInput';
import { Badge } from '../components/common/Badge';
import { HistoryItemCard } from '../components/history/HistoryItemCard';
import { mediaService } from '../services/retrieval/mediaService';
import { settingsStorage } from '../services/storage/settingsStorage';
import { historyStorage } from '../services/storage/historyStorage';
import { validateMediaUrl } from '../services/retrieval/urlValidator';
import { MediaMetadata } from '../types/media';
import { DownloadItem } from '../types/download';
import { shareDownloadedFile } from '../utils/shareUtils';

interface HomeScreenProps {
  onMediaFetched: (metadata: MediaMetadata) => void;
  onNavigateToHistory: () => void;
  onNavigateToSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onMediaFetched,
  onNavigateToHistory,
  onNavigateToSettings,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const [inputUrl, setInputUrl] = useState('');
  const [errorText, setErrorText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentDownloads, setRecentDownloads] = useState<DownloadItem[]>([]);
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);

  // Load recent downloads and check clipboard on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const history = await historyStorage.getHistory();
        if (isMounted) {
          setRecentDownloads(history.slice(0, 3));
        }
      } catch {
        // Ignore
      }

      try {
        const text = await Clipboard.getStringAsync();
        if (isMounted && text && text.trim().length > 0) {
          const validation = validateMediaUrl(text.trim());
          if (validation.isValid) {
            setClipboardUrl(text.trim());
          }
        }
      } catch {
        // Ignore
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFetchMedia = async () => {
    setErrorText('');
    const validation = validateMediaUrl(inputUrl);

    if (!validation.isValid) {
      setErrorText(validation.error || 'Please enter a valid media URL.');
      return;
    }

    setIsLoading(true);
    try {
      const settings = await settingsStorage.getSettings();
      const result = await mediaService.fetchMedia(inputUrl, {
        backendEndpoint: settings.customBackendEndpoint,
        apiKey: settings.customApiKey,
      });

      if (result.success && result.data) {
        onMediaFetched(result.data);
      } else {
        const msg = result.error?.message || 'Unable to retrieve media from this link.';
        setErrorText(msg);
        if (result.error?.requiresConfiguration) {
          Alert.alert(
            'API Configuration Required',
            `${msg}\n\nWould you like to configure your API endpoint or key in Settings?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Go to Settings', onPress: onNavigateToSettings },
            ]
          );
        }
      }
    } catch (err: any) {
      setErrorText(err?.message || 'A network error occurred while fetching media.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseSample = (url: string) => {
    setInputUrl(url);
    setErrorText('');
  };

  const handleShareRecent = async (item: DownloadItem) => {
    await shareDownloadedFile(item.fileUri);
  };

  const handleDeleteRecent = async (item: DownloadItem) => {
    Alert.alert('Delete Download', `Are you sure you want to delete "${item.fileName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await historyStorage.deleteHistoryItem(item.id);
          setRecentDownloads((prev) => prev.filter((d) => d.id !== item.id));
        },
      },
    ]);
  };

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
        {/* Top App Bar with Branding and Actions */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View
              style={[
                styles.logoIcon,
                {
                  backgroundColor: colors.primary,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Ionicons name="arrow-down" size={20} color="#FFFFFF" />
            </View>
            <View style={{ marginLeft: spacing.sm }}>
              <Text style={[typography.title1, { color: colors.text, fontWeight: '800' }]}>
                ClipDrop
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Your media. Saved simply.
              </Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <Pressable
              onPress={onNavigateToHistory}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: colors.cardSecondary },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="time-outline" size={20} color={colors.text} />
            </Pressable>

            <Pressable
              onPress={onNavigateToSettings}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: colors.cardSecondary, marginLeft: spacing.sm },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Platform Supported Badges */}
        <View style={styles.platformRow}>
          <Text style={[typography.captionBold, { color: colors.textMuted, marginRight: spacing.sm }]}>
            SUPPORTED:
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Badge platform="instagram" variant="platform" />
            <Badge platform="x" variant="platform" />
            <Badge platform="direct" variant="platform" label="Direct MP4/JPG" />
          </View>
        </View>

        {/* Main Input ClayCard */}
        <ClayCard level="medium" style={{ marginTop: spacing.md }}>
          <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.xs }]}>
            Download Media
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Paste a public post or reel link below to preview and save media.
          </Text>

          <ClayInput
            value={inputUrl}
            onChangeText={(text) => {
              setInputUrl(text);
              if (errorText) setErrorText('');
            }}
            placeholder="Paste Instagram or X link..."
            error={errorText}
            onPaste={() => {
              if (errorText) setErrorText('');
            }}
          />

          {clipboardUrl && clipboardUrl !== inputUrl ? (
            <Pressable
              onPress={() => {
                setInputUrl(clipboardUrl);
                setClipboardUrl(null);
              }}
              style={({ pressed }) => [
                styles.clipboardNotice,
                {
                  backgroundColor: colors.cardSecondary,
                  borderRadius: borderRadius.sm,
                  borderColor: colors.border,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="sparkles" size={14} color={colors.primary} style={{ marginRight: 6 }} />
              <Text numberOfLines={1} style={[typography.caption, { color: colors.primary, flex: 1 }]}>
                Paste detected link: {clipboardUrl}
              </Text>
            </Pressable>
          ) : null}

          <ClayButton
            title="Fetch Media"
            onPress={handleFetchMedia}
            loading={isLoading}
            disabled={!inputUrl.trim() || isLoading}
            icon={<Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />}
            style={{ marginTop: spacing.lg }}
          />
        </ClayCard>

        {/* Quick Sample Media Links for instant authorized testing */}
        <View style={{ marginTop: spacing.xl }}>
          <Text style={[typography.headline, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
            Test with Verified Authorized Media:
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable
              onPress={() => handleUseSample('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4')}
              style={({ pressed }) => [
                styles.sampleChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="film-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[typography.captionBold, { color: colors.text }]}>Sample Video (MP4)</Text>
            </Pressable>

            <Pressable
              onPress={() => handleUseSample('https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200')}
              style={({ pressed }) => [
                styles.sampleChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="image-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[typography.captionBold, { color: colors.text }]}>Sample Photo (JPEG)</Text>
            </Pressable>
          </View>
        </View>

        {/* Recent Downloads Section */}
        {recentDownloads.length > 0 && (
          <View style={{ marginTop: spacing.xxl }}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.headline, { color: colors.text }]}>
                Recent Downloads
              </Text>
              <Pressable onPress={onNavigateToHistory} hitSlop={8}>
                <Text style={[typography.captionBold, { color: colors.primary }]}>
                  View All ({recentDownloads.length})
                </Text>
              </Pressable>
            </View>

            <View style={{ marginTop: spacing.sm }}>
              {recentDownloads.map((item) => (
                <HistoryItemCard
                  key={item.id}
                  item={item}
                  onShare={handleShareRecent}
                  onDelete={handleDeleteRecent}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  clipboardNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
});
