import { MediaProviderAdapter, RetrievalConfig } from '../types';
import { MediaMetadata, RetrievalResult, MediaItem } from '../../../types/media';

export class DirectMediaAdapter implements MediaProviderAdapter {
  readonly platform = 'direct' as const;

  canHandle(url: string): boolean {
    return /\.(mp4|m4v|mov|webm|jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);
  }

  extractId(url: string): string | null {
    try {
      const parsed = new URL(url);
      const name = parsed.pathname.split('/').pop() || 'direct_media';
      return name.split('.')[0] || 'direct_media';
    } catch {
      return null;
    }
  }

  async fetchMetadata(url: string, _config?: RetrievalConfig): Promise<RetrievalResult> {
    try {
      // Perform a HEAD request to check availability and get Content-Type / Content-Length
      const headRes = await fetch(url, {
        method: 'HEAD',
      });

      if (!headRes.ok && headRes.status !== 405) {
        // Some servers reject HEAD with 405 Method Not Allowed, otherwise it's an error
        return {
          success: false,
          error: {
            code: 'EXPIRED_OR_DELETED',
            message: `Media resource returned status ${headRes.status}. The file may no longer exist.`,
          },
        };
      }

      const contentType = headRes.headers.get('content-type') || '';
      const contentLength = headRes.headers.get('content-length');
      const fileSizeBytes = contentLength ? parseInt(contentLength, 10) : undefined;

      const isVideo = contentType.startsWith('video/') || /\.(mp4|m4v|mov|webm)(\?.*)?$/i.test(url);
      const isImage = contentType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);

      if (!isVideo && !isImage) {
        return {
          success: false,
          error: {
            code: 'UNSUPPORTED_POST_TYPE',
            message: 'The URL does not point to a supported audio, video, or image file.',
          },
        };
      }

      let filename = 'media';
      try {
        const parsed = new URL(url);
        filename = parsed.pathname.split('/').pop()?.split('?')[0] || 'media';
      } catch {
        // fallback
      }

      const mediaItem: MediaItem = {
        id: `item_${Date.now()}`,
        type: isVideo ? 'video' : 'image',
        url,
        thumbnailUrl: isImage ? url : undefined,
        fileSizeBytes,
        selected: true,
      };

      const metadata: MediaMetadata = {
        originalUrl: url,
        canonicalUrl: url,
        platform: 'direct',
        mediaType: isVideo ? 'video' : 'image',
        title: filename,
        thumbnailUrl: isImage ? url : undefined,
        items: [mediaItem],
        retrievedAt: Date.now(),
      };

      return {
        success: true,
        data: metadata,
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to reach the direct media URL. Please check your internet connection.',
          details: err?.message,
        },
      };
    }
  }
}
