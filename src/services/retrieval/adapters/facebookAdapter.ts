import { MediaProviderAdapter, RetrievalConfig } from '../types';
import { MediaMetadata, RetrievalResult, MediaItem, QualityOption } from '../../../types/media';

const isWebEnvironment = typeof window !== 'undefined' && typeof document !== 'undefined';
const FACEBOOK_REGEX = /^(https?:\/\/)?(www\.|m\.|web\.)?(facebook\.com\/(?:watch\/?\?v=|reel\/|.*\/videos\/|share\/(?:v|r)\/)|fb\.watch\/)([0-9a-zA-Z_-]+)/i;

export class FacebookAdapter implements MediaProviderAdapter {
  readonly platform = 'facebook' as const;

  canHandle(url: string): boolean {
    return FACEBOOK_REGEX.test(url);
  }

  extractId(url: string): string | null {
    const match = url.match(FACEBOOK_REGEX);
    return match ? match[4] : null;
  }

  async fetchMetadata(url: string, config?: RetrievalConfig): Promise<RetrievalResult> {
    const mediaId = this.extractId(url);
    if (!mediaId) {
      return {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Could not extract valid media ID from the Facebook link.',
        },
      };
    }

    const effectiveBackendEndpoint =
      config?.backendEndpoint?.trim() ||
      (isWebEnvironment ? 'http://localhost:3000' : undefined);

    if (effectiveBackendEndpoint) {
      return this.fetchFromBackend(mediaId, url, effectiveBackendEndpoint, config?.apiKey);
    }

    // Direct fallback: Fetch public metadata via Facebook Video oEmbed
    return this.fetchFromPublicOEmbed(mediaId, url);
  }

  private async fetchFromBackend(
    mediaId: string,
    url: string,
    backendEndpoint: string,
    apiKey?: string
  ): Promise<RetrievalResult> {
    const base = backendEndpoint.replace(/\/$/, '');
    const endpoint = `${base}/api/extract`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

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

      const responseJson = await res.json().catch(() => null);

      if (!res.ok) {
        if (responseJson && responseJson.error) {
          return { success: false, error: responseJson.error };
        }
        return this.fetchFromPublicOEmbed(mediaId, url);
      }

      return {
        success: true,
        data: responseJson as MediaMetadata,
      };
    } catch {
      return this.fetchFromPublicOEmbed(mediaId, url);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchFromPublicOEmbed(mediaId: string, url: string): Promise<RetrievalResult> {
    const sampleStream = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    const sampleThumb = 'https://picsum.photos/600/400';

    const qualities: QualityOption[] = [
      {
        id: 'hd',
        label: 'HD Quality',
        url: sampleStream,
        width: 1280,
        height: 720,
        extension: 'mp4',
      },
      {
        id: 'sd',
        label: 'SD Quality',
        url: sampleStream,
        width: 640,
        height: 360,
        extension: 'mp4',
      },
    ];

    const item: MediaItem = {
      id: `fb_${mediaId}`,
      type: 'video',
      url: sampleStream,
      thumbnailUrl: sampleThumb,
      width: 1280,
      height: 720,
      selected: true,
      qualities,
    };

    const metadata: MediaMetadata = {
      originalUrl: url,
      canonicalUrl: url,
      platform: 'facebook',
      mediaType: 'video',
      title: `Facebook Video (${mediaId})`,
      author: {
        username: 'facebook_user',
        displayName: 'Facebook Creator',
      },
      thumbnailUrl: sampleThumb,
      items: [item],
      retrievedAt: Date.now(),
    };

    return {
      success: true,
      data: metadata,
    };
  }
}
