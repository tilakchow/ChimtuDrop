import * as FileSystem from 'expo-file-system/legacy';
import { DownloadManager } from '../services/download/downloadManager';
import { MediaMetadata, MediaItem } from '../types/media';

// Mock FileSystem
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///app_docs/',
  getInfoAsync: jest.fn(async (uri: string) => {
    // downloads directory exists, target file does not yet exist
    if (uri.endsWith('downloads/')) return { exists: true, isDirectory: true };
    return { exists: false };
  }),
  makeDirectoryAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
  createDownloadResumable: jest.fn((url, targetFileUri, options, callback) => {
    return {
      downloadAsync: jest.fn(async () => {
        // simulate progress callback
        callback({
          totalBytesExpectedToWrite: 5000000,
          totalBytesWritten: 2500000,
        });
        callback({
          totalBytesExpectedToWrite: 5000000,
          totalBytesWritten: 5000000,
        });

        // Mock saved file verification
        (FileSystem.getInfoAsync as jest.Mock).mockImplementationOnce(async () => ({
          exists: true,
          size: 5000000,
        }));

        return { uri: targetFileUri, status: 200 };
      }),
      cancelAsync: jest.fn(async () => {}),
    };
  }),
}));

// Mock MediaLibrary
jest.mock('expo-media-library/legacy', () => ({
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  saveToLibraryAsync: jest.fn(async () => {}),
}));
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  saveToLibraryAsync: jest.fn(async () => {}),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => JSON.stringify([])),
  setItem: jest.fn(async () => {}),
}));

describe('Download Manager', () => {
  let manager: DownloadManager;

  beforeEach(() => {
    manager = new DownloadManager();
  });

  const mockMetadata: MediaMetadata = {
    originalUrl: 'https://example.com/video.mp4',
    canonicalUrl: 'https://example.com/video.mp4',
    platform: 'direct',
    mediaType: 'video',
    title: 'Sample Video Clip',
    items: [],
    retrievedAt: Date.now(),
  };

  const mockItem: MediaItem = {
    id: 'item_1',
    type: 'video',
    url: 'https://example.com/video.mp4',
  };

  it('downloads media file and emits progress and status transitions', async () => {
    const statuses: string[] = [];
    const progresses: number[] = [];

    const result = await manager.startDownload(
      mockMetadata,
      mockItem,
      'test_video',
      true,
      (p) => progresses.push(p.fraction),
      (s) => statuses.push(s)
    );

    expect(statuses).toContain('downloading');
    expect(statuses).toContain('saving');
    expect(statuses).toContain('completed');
    expect(progresses.length).toBeGreaterThan(0);
    expect(result.status).toBe('completed');
    expect(result.fileName).toBe('test_video.mp4');
    expect(result.savedToGallery).toBe(true);
  });
});
