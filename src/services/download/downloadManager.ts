import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { DownloadItem, DownloadProgress, DownloadStatus } from '../../types/download';
import { MediaItem, MediaMetadata } from '../../types/media';
import { generateSafeFileName } from '../retrieval/urlValidator';
import { historyStorage } from '../storage/historyStorage';

export interface ActiveDownloadHandle {
  id: string;
  resumable?: FileSystem.DownloadResumable;
  cancel: () => Promise<void>;
}

export class DownloadManager {
  private activeDownloads: Map<string, ActiveDownloadHandle> = new Map();

  /**
   * Request media library permissions for saving media to gallery on Android
   */
  async requestStoragePermission(): Promise<boolean> {
    try {
      const response = await MediaLibrary.requestPermissionsAsync(true);
      return response.granted;
    } catch (err) {
      console.warn('Error requesting storage permission:', err);
      return false;
    }
  }

  /**
   * Check if storage permission is currently granted
   */
  async checkStoragePermission(): Promise<boolean> {
    try {
      const permissions = await MediaLibrary.getPermissionsAsync(true);
      return permissions.granted;
    } catch {
      return false;
    }
  }

  /**
   * Starts downloading a media item
   */
  async startDownload(
    metadata: MediaMetadata,
    selectedItem: MediaItem,
    customFilename?: string,
    autoSaveGallery: boolean = true,
    onProgress?: (progress: DownloadProgress) => void,
    onStatusChange?: (status: DownloadStatus, error?: string) => void
  ): Promise<DownloadItem> {
    const downloadId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const extension = selectedItem.type === 'video' ? 'mp4' : 'jpg';
    
    let fileName = customFilename?.trim() || generateSafeFileName(metadata.title, metadata.platform, extension);
    if (!fileName.endsWith(`.${extension}`)) {
      fileName = `${fileName}.${extension}`;
    }

    const downloadDir = `${FileSystem.documentDirectory}downloads/`;
    // Ensure download directory exists
    const dirInfo = await FileSystem.getInfoAsync(downloadDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
    }

    // Handle existing file duplicate names safely
    let targetFileUri = `${downloadDir}${fileName}`;
    let fileInfo = await FileSystem.getInfoAsync(targetFileUri);
    let counter = 1;
    while (fileInfo.exists) {
      const baseName = fileName.replace(`.${extension}`, '');
      targetFileUri = `${downloadDir}${baseName}_${counter}.${extension}`;
      fileInfo = await FileSystem.getInfoAsync(targetFileUri);
      counter++;
    }

    const downloadUrl = selectedItem.url;
    if (!downloadUrl) {
      throw new Error('No valid download URL provided for this media item.');
    }

    onStatusChange?.('downloading');

    let downloadResumable: FileSystem.DownloadResumable | null = null;
    let isCancelled = false;

    const handle: ActiveDownloadHandle = {
      id: downloadId,
      cancel: async () => {
        isCancelled = true;
        if (downloadResumable) {
          try {
            await downloadResumable.cancelAsync();
          } catch {
            // Ignore
          }
        }
        onStatusChange?.('cancelled');
      },
    };

    this.activeDownloads.set(downloadId, handle);

    try {
      downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        targetFileUri,
        {},
        (downloadProgress) => {
          if (isCancelled) return;
          const total = downloadProgress.totalBytesExpectedToWrite;
          const written = downloadProgress.totalBytesWritten;
          const fraction = total > 0 ? written / total : 0;
          onProgress?.({
            totalBytes: total,
            downloadedBytes: written,
            fraction: Math.min(1, Math.max(0, fraction)),
          });
        }
      );

      handle.resumable = downloadResumable;

      const result = await downloadResumable.downloadAsync();

      if (isCancelled) {
        // Clean up partial file
        try {
          await FileSystem.deleteAsync(targetFileUri, { idempotent: true });
        } catch {
          // Ignore
        }
        throw new Error('Download was cancelled.');
      }

      if (!result || !result.uri) {
        throw new Error('Download completed but file could not be verified.');
      }

      // Verify the file was actually saved
      const savedInfo = await FileSystem.getInfoAsync(result.uri);
      if (!savedInfo.exists) {
        throw new Error('File download verification failed: target file is missing.');
      }

      onStatusChange?.('saving');

      let savedToGallery = false;
      if (autoSaveGallery) {
        try {
          const hasPermission = await this.requestStoragePermission();
          if (hasPermission) {
            await MediaLibrary.saveToLibraryAsync(result.uri);
            savedToGallery = true;
          }
        } catch (mediaLibErr) {
          console.warn('Could not save to MediaLibrary (still saved to app storage):', mediaLibErr);
        }
      }

      const completedItem: DownloadItem = {
        id: downloadId,
        sourceUrl: metadata.canonicalUrl,
        platform: metadata.platform,
        mediaType: selectedItem.type,
        title: metadata.title,
        thumbnailUri: selectedItem.thumbnailUrl || metadata.thumbnailUrl,
        fileUri: result.uri,
        fileName,
        fileSizeBytes: (savedInfo as any).size || 0,
        downloadedAt: Date.now(),
        status: 'completed',
        savedToGallery,
      };

      // Persist to history
      await historyStorage.addHistoryItem(completedItem);

      onStatusChange?.('completed');
      return completedItem;
    } catch (err: any) {
      if (isCancelled) {
        onStatusChange?.('cancelled');
        throw new Error('Download cancelled');
      }

      const errorMessage = err?.message || 'Download failed due to a network error.';
      onStatusChange?.('failed', errorMessage);
      throw err;
    } finally {
      this.activeDownloads.delete(downloadId);
    }
  }

  /**
   * Cancel an ongoing download
   */
  async cancelDownload(downloadId: string): Promise<void> {
    const handle = this.activeDownloads.get(downloadId);
    if (handle) {
      await handle.cancel();
      this.activeDownloads.delete(downloadId);
    }
  }
}

export const downloadManager = new DownloadManager();
