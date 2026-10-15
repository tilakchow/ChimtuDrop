export type SupportedPlatform = 'instagram' | 'x' | 'youtube' | 'facebook' | 'direct';

export type MediaType = 'video' | 'image' | 'carousel';

export interface QualityOption {
  id: string;
  label: string;
  url: string;
  width?: number;
  height?: number;
  bitrate?: number;
  fileSizeBytes?: number;
  extension: 'mp4' | 'jpg' | 'png' | 'webp';
}

export interface MediaItem {
  id: string;
  type: 'video' | 'image';
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  width?: number;
  height?: number;
  fileSizeBytes?: number;
  selected?: boolean;
  qualities?: QualityOption[];
}

export interface MediaMetadata {
  originalUrl: string;
  canonicalUrl: string;
  platform: SupportedPlatform;
  mediaType: MediaType;
  title: string;
  author?: {
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  durationSeconds?: number;
  thumbnailUrl?: string;
  items: MediaItem[];
  retrievedAt: number;
}

export interface RetrievalResult {
  success: boolean;
  data?: MediaMetadata;
  error?: {
    code: 
      | 'INVALID_URL'
      | 'UNSUPPORTED_PLATFORM'
      | 'UNSUPPORTED_POST_TYPE'
      | 'PRIVATE_OR_INACCESSIBLE'
      | 'EXPIRED_OR_DELETED'
      | 'AUTHENTICATION_REQUIRED'
      | 'PROVIDER_UNAVAILABLE'
      | 'NETWORK_ERROR'
      | 'API_KEY_REQUIRED'
      | 'RATE_LIMITED'
      | 'UNKNOWN';
    message: string;
    details?: string;
    requiresConfiguration?: boolean;
  };
}
