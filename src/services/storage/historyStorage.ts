import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { DownloadItem } from '../../types/download';

const HISTORY_STORAGE_KEY = '@clipdrop_download_history_v1';

export class HistoryStorage {
  async getHistory(): Promise<DownloadItem[]> {
    try {
      const data = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (!data) return [];
      const parsed: DownloadItem[] = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('Failed to load history:', err);
      return [];
    }
  }

  async addHistoryItem(item: DownloadItem): Promise<void> {
    try {
      const history = await this.getHistory();
      // Remove any existing duplicate by fileUri or sourceUrl
      const filtered = history.filter((h) => h.id !== item.id && h.fileUri !== item.fileUri);
      const updated = [item, ...filtered];
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to add history item:', err);
    }
  }

  async updateHistoryItem(id: string, updates: Partial<DownloadItem>): Promise<void> {
    try {
      const history = await this.getHistory();
      const updated = history.map((item) => (item.id === id ? { ...item, ...updates } : item));
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to update history item:', err);
    }
  }

  async deleteHistoryItem(id: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const itemToDelete = history.find((h) => h.id === id);
      
      // Attempt to delete local file from disk if it exists
      if (itemToDelete?.fileUri) {
        try {
          const info = await FileSystem.getInfoAsync(itemToDelete.fileUri);
          if (info.exists) {
            await FileSystem.deleteAsync(itemToDelete.fileUri, { idempotent: true });
          }
        } catch {
          // File might already be gone
        }
      }

      const updated = history.filter((h) => h.id !== id);
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to delete history item:', err);
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear history:', err);
    }
  }

  /**
   * Syncs history with actual files on disk
   */
  async verifyAndSync(): Promise<DownloadItem[]> {
    const history = await this.getHistory();
    const verified: DownloadItem[] = [];

    for (const item of history) {
      try {
        if (!item.fileUri) continue;
        const info = await FileSystem.getInfoAsync(item.fileUri);
        if (info.exists) {
          verified.push({
            ...item,
            fileSizeBytes: (info as any).size || item.fileSizeBytes,
          });
        }
      } catch {
        // If file checking fails, preserve item
        verified.push(item);
      }
    }

    if (verified.length !== history.length) {
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(verified));
    }

    return verified;
  }
}

export const historyStorage = new HistoryStorage();
