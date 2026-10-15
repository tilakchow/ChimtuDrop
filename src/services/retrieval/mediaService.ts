import { RetrievalResult, MediaMetadata } from '../../types/media';
import { MediaProviderAdapter, RetrievalConfig } from './types';
import { validateMediaUrl } from './urlValidator';
import { InstagramAdapter } from './adapters/instagramAdapter';
import { XAdapter } from './adapters/xAdapter';
import { YouTubeAdapter } from './adapters/youtubeAdapter';
import { FacebookAdapter } from './adapters/facebookAdapter';
import { DirectMediaAdapter } from './adapters/directMediaAdapter';
import { resolveBackendUrl } from '../../utils/networkUtils';

export class MediaService {
  private adapters: MediaProviderAdapter[];

  constructor(customAdapters?: MediaProviderAdapter[]) {
    this.adapters = customAdapters || [
      new InstagramAdapter(),
      new XAdapter(),
      new YouTubeAdapter(),
      new FacebookAdapter(),
      new DirectMediaAdapter(),
    ];
  }

  /**
   * Main entry point to validate URL and fetch media metadata
   */
  async fetchMedia(inputUrl: string, config?: RetrievalConfig): Promise<RetrievalResult> {
    const validation = validateMediaUrl(inputUrl);

    if (!validation.isValid || !validation.platform) {
      return {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: validation.error || 'Please enter a valid Instagram, X (Twitter), YouTube, Facebook, or direct media URL.',
        },
      };
    }

    const targetUrl = validation.canonicalUrl || inputUrl;

    // 1. If backend is configured, attempt extraction via FastAPI yt-dlp backend
    const effectiveBackend = resolveBackendUrl(config?.backendEndpoint);

    if (effectiveBackend && validation.platform !== 'direct') {
      const backendResult = await this.fetchFromFastApiBackend(targetUrl, effectiveBackend, config?.apiKey);
      if (backendResult.success) {
        return backendResult;
      }
      // If backend returned a specific error or network error on backend-dependent platforms, return it directly
      if (backendResult.error && (backendResult.error.code !== 'NETWORK_ERROR' || validation.platform === 'instagram' || validation.platform === 'x')) {
        return backendResult;
      }
    }

    // 2. Fallback to platform-specific client adapter
    const adapter = this.adapters.find((a) => a.platform === validation.platform);

    if (!adapter) {
      return {
        success: false,
        error: {
          code: 'UNSUPPORTED_PLATFORM',
          message: `No provider adapter registered for platform: ${validation.platform}`,
        },
      };
    }

    return adapter.fetchMetadata(targetUrl, config);
  }

  /**
   * Fast extraction via FastAPI backend /api/extract
   */
  private async fetchFromFastApiBackend(
    url: string,
    backendEndpoint: string,
    apiKey?: string
  ): Promise<RetrievalResult> {
    const base = backendEndpoint.replace(/\/$/, '');
    const endpoint = `${base}/api/extract`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        const detail = errorJson?.detail || `Server returned HTTP ${res.status}`;

        let code: any = 'PROVIDER_UNAVAILABLE';
        if (res.status === 400) code = 'INVALID_URL';
        else if (res.status === 403) code = 'AUTHENTICATION_REQUIRED';
        else if (res.status === 404) code = 'EXPIRED_OR_DELETED';

        return {
          success: false,
          error: { code, message: detail },
        };
      }

      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        data.items = data.items.map((item: any) => {
          const itemUrl = item.url || item.qualities?.[0]?.url || item.qualities?.[0]?.direct_url || data.download_endpoint || '';
          return {
            ...item,
            url: itemUrl,
            previewUrl: item.preview_url || item.previewUrl || undefined,
            qualities: (item.qualities || []).map((q: any) => ({
              ...q,
              url: q.url || q.direct_url || itemUrl,
              extension: q.ext || 'mp4',
            })),
          };
        });
      }

      return {
        success: true,
        data: data as MediaMetadata,
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: `Unable to connect to ChimtuDrop backend at ${backendEndpoint}. Please ensure "npm run backend" is running on your computer.`,
          details: err?.message,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Register a new or mock adapter (useful for testing and extensions)
   */
  registerAdapter(adapter: MediaProviderAdapter) {
    this.adapters.unshift(adapter);
  }
}

export const mediaService = new MediaService();
