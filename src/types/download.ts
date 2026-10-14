import { SupportedPlatform, MediaType } from './media';

export type DownloadStatus = 
  | 'idle'
  | 'pending'
  | 'downloading'
  | 'saving'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadProgress {
  totalBytes: number;
  downloadedBytes: number;
  fraction: number; // 0 to 1
  speedBytesPerSec?: number;
}

export interface DownloadItem {
  id: string;
  sourceUrl: string;
  platform: SupportedPlatform;
  mediaType: MediaType;
  title: string;
  thumbnailUri?: string;
  fileUri: string;
  fileName: string;
  fileSizeBytes: number;
  downloadedAt: number;
  status: DownloadStatus;
  progress?: DownloadProgress;
  errorMessage?: string;
  savedToGallery?: boolean;
}
