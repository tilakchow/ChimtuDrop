import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Header } from '../components/common/Header';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { MediaMetadata, MediaItem } from '../types/media';
import { DownloadItem, DownloadProgress, DownloadStatus } from '../types/download';
import { downloadManager } from '../services/download/downloadManager';
import { settingsStorage } from '../services/storage/settingsStorage';
import { formatBytes } from '../utils/fileUtils';

interface DownloadManagerScreenProps {
  metadata: MediaMetadata;
  selectedItem: MediaItem;
  customFilename?: string;
  onBackToHome: () => void;
}

export const DownloadManagerScreen: React.FC<DownloadManagerScreenProps> = ({
  metadata,
  selectedItem,
  customFilename,
  onBackToHome,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const [status, setStatus] = useState<DownloadStatus>('downloading');
  const [progress, setProgress] = useState<DownloadProgress>({
    totalBytes: 0,
    downloadedBytes: 0,
    fraction: 0,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedItem, setCompletedItem] = useState<DownloadItem | null>(null);

  const activeDownloadIdRef = useRef<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    (async () => {
      try {
        const settings = await settingsStorage.getSettings();
        if (isCancelled) return;

        const completed = await downloadManager.startDownload(
          metadata,
          selectedItem,
          customFilename,
          settings.autoSaveToGallery,
          (prog) => {
            if (!isCancelled) setProgress(prog);
          },
          (newStatus, err) => {
            if (!isCancelled) {
              setStatus(newStatus);
              if (err) setErrorMessage(err);
            }
          }
        );

        if (!isCancelled) {
          activeDownloadIdRef.current = completed.id;
          setCompletedItem(completed);
          setStatus('completed');
        }
      } catch (err: any) {
        if (!isCancelled) {
          setStatus('failed');
          setErrorMessage(err?.message || 'Download failed due to a network error.');
        }
      }
    })();

    return () => {
      isCancelled = true;
      const currentId = activeDownloadIdRef.current;
      if (currentId) {
        downloadManager.cancelDownload(currentId);
      }
    };
  }, [customFilename, metadata, selectedItem, retryCount]);

  const handleCancel = async () => {
    if (activeDownloadIdRef.current) {
      await downloadManager.cancelDownload(activeDownloadIdRef.current);
    }
    setStatus('cancelled');
  };

  const handleRetry = () => {
    setStatus('downloading');
    setErrorMessage(null);
    setRetryCount((prev) => prev + 1);
  };

  const percent = Math.round(progress.fraction * 100);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="Download Status"
        showBack={status === 'completed' || status === 'failed' || status === 'cancelled'}
        onBack={onBackToHome}
      />

      <View style={[styles.container, { paddingHorizontal: spacing.lg }]}>
        <ClayCard level="medium" style={styles.card}>
          {/* Status Icon */}
          <View style={styles.iconContainer}>
            {status === 'downloading' || status === 'saving' || status === 'pending' ? (
              <View
                style={[
                  styles.statusCircle,
                  { backgroundColor: colors.surfaceRaised, borderColor: colors.primary },
                ]}
              >
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : status === 'completed' ? (
              <View
                style={[
                  styles.statusCircle,
                  { backgroundColor: colors.successBg, borderColor: colors.success },
                ]}
              >
                <Ionicons name="checkmark" size={36} color={colors.success} />
              </View>
            ) : status === 'cancelled' ? (
              <View
                style={[
                  styles.statusCircle,
                  { backgroundColor: colors.warningBg, borderColor: colors.warning },
                ]}
              >
                <Ionicons name="close" size={36} color={colors.warning} />
              </View>
            ) : (
              <View
                style={[
                  styles.statusCircle,
                  { backgroundColor: colors.errorBg, borderColor: colors.error },
                ]}
              >
                <Ionicons name="alert" size={36} color={colors.error} />
              </View>
            )}
          </View>

          {/* Title & Status Message */}
          <Text style={[typography.title2, { color: colors.text, textAlign: 'center', marginTop: spacing.md }]}>
            {status === 'downloading'
              ? 'Downloading Media...'
              : status === 'saving'
              ? 'Saving to Device...'
              : status === 'completed'
              ? 'Download Complete!'
              : status === 'cancelled'
              ? 'Download Cancelled'
              : 'Download Failed'}
          </Text>

          <Text
            numberOfLines={2}
            style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}
          >
            {completedItem?.fileName || metadata.title}
          </Text>

          {/* Progress Bar (during download) */}
          {(status === 'downloading' || status === 'saving') && (
            <View style={{ width: '100%', marginTop: spacing.lg }}>
              <View
                style={[
                  styles.progressBarBackground,
                  { backgroundColor: colors.inset, borderRadius: borderRadius.pill },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: borderRadius.pill,
                      width: `${progress.fraction > 0 ? percent : 20}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.progressRow}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {progress.totalBytes > 0
                    ? `${formatBytes(progress.downloadedBytes)} of ${formatBytes(progress.totalBytes)}`
                    : 'Downloading...'}
                </Text>
                <Text style={[typography.captionBold, { color: colors.primary }]}>
                  {progress.fraction > 0 ? `${percent}%` : ''}
                </Text>
              </View>
            </View>
          )}

          {/* Error Message */}
          {errorMessage && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: colors.errorBg, borderRadius: borderRadius.md, marginTop: spacing.md },
              ]}
            >
              <Ionicons name="warning-outline" size={16} color={colors.error} style={{ marginRight: 6 }} />
              <Text style={[typography.caption, { color: colors.error, flex: 1 }]}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Completed Details */}
          {status === 'completed' && completedItem && (
            <View
              style={[
                styles.successDetails,
                { backgroundColor: colors.cardSecondary, borderRadius: borderRadius.md, marginTop: spacing.lg },
              ]}
            >
              <View style={styles.detailRow}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>File size:</Text>
                <Text style={[typography.captionBold, { color: colors.text }]}>
                  {formatBytes(completedItem.fileSizeBytes)}
                </Text>
              </View>

              <View style={[styles.detailRow, { marginTop: 4 }]}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Gallery:</Text>
                <Text style={[typography.captionBold, { color: completedItem.savedToGallery ? colors.success : colors.textMuted }]}>
                  {completedItem.savedToGallery ? 'Saved to Photos' : 'Saved to App Storage'}
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons based on status */}
          <View style={{ width: '100%', marginTop: spacing.xl }}>
            {status === 'downloading' ? (
              <ClayButton
                title="Cancel Download"
                variant="ghost"
                onPress={handleCancel}
              />
            ) : status === 'completed' ? (
              <ClayButton
                title="DOWNLOAD ANOTHER LINK"
                variant="primary"
                onPress={onBackToHome}
                icon={<Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />}
              />
            ) : (
              <View style={{ gap: spacing.sm }}>
                <ClayButton
                  title="Retry Download"
                  variant="primary"
                  onPress={handleRetry}
                  icon={<Ionicons name="refresh" size={18} color="#FFFFFF" />}
                />
                <ClayButton
                  title="Back to Home"
                  variant="secondary"
                  onPress={onBackToHome}
                />
              </View>
            )}
          </View>
        </ClayCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBackground: {
    height: 10,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    width: '100%',
  },
  successDetails: {
    width: '100%',
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
