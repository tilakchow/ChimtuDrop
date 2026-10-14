import { HistoryStorage } from '../services/storage/historyStorage';
import { DownloadItem } from '../types/download';

// In-memory mock for AsyncStorage
const storageMap = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => storageMap.get(key) || null),
  setItem: jest.fn(async (key: string, value: string) => {
    storageMap.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    storageMap.delete(key);
  }),
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(async () => ({ exists: true, size: 1024000 })),
  deleteAsync: jest.fn(async () => {}),
}));

describe('History Storage Service', () => {
  let storage: HistoryStorage;

  beforeEach(() => {
    storageMap.clear();
    storage = new HistoryStorage();
  });

  const mockItem: DownloadItem = {
    id: 'item_1',
    sourceUrl: 'https://x.com/user/status/123',
    platform: 'x',
    mediaType: 'video',
    title: 'Test Video',
    fileUri: 'file:///downloads/test_1.mp4',
    fileName: 'test_1.mp4',
    fileSizeBytes: 1024000,
    downloadedAt: Date.now(),
    status: 'completed',
  };

  it('initially returns empty array', async () => {
    const list = await storage.getHistory();
    expect(list).toEqual([]);
  });

  it('adds items to history', async () => {
    await storage.addHistoryItem(mockItem);
    const list = await storage.getHistory();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('item_1');
  });

  it('prevents duplicate items with identical fileUri', async () => {
    await storage.addHistoryItem(mockItem);
    const updatedMock = { ...mockItem, title: 'Updated Title' };
    await storage.addHistoryItem(updatedMock);

    const list = await storage.getHistory();
    expect(list.length).toBe(1);
    expect(list[0].title).toBe('Updated Title');
  });

  it('deletes history items', async () => {
    await storage.addHistoryItem(mockItem);
    await storage.deleteHistoryItem('item_1');

    const list = await storage.getHistory();
    expect(list.length).toBe(0);
  });

  it('clears all history', async () => {
    await storage.addHistoryItem(mockItem);
    await storage.addHistoryItem({ ...mockItem, id: 'item_2', fileUri: 'file:///downloads/test_2.mp4' });

    let list = await storage.getHistory();
    expect(list.length).toBe(2);

    await storage.clearHistory();
    list = await storage.getHistory();
    expect(list.length).toBe(0);
  });
});
