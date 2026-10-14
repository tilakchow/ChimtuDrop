import { MediaProviderAdapter, RetrievalConfig } from '../types';
import { MediaMetadata, RetrievalResult, MediaItem } from '../../../types/media';

export class InstagramAdapter implements MediaProviderAdapter {
  readonly platform = 'instagram' as const;

  canHandle(url: string): boolean {
    return /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|reels|tv|stories)\/([a-zA-Z0-9_\-\.]+)/i.test(url);
  }

  extractId(url: string): string | null {
    const match = url.match(/instagram\.com\/(?:p|reel|reels|tv|stories)\/([a-zA-Z0-9_\-\.]+)/i);
    return match ? match[1] : null;
  }

  async fetchMetadata(url: string, config?: RetrievalConfig): Promise<RetrievalResult> {
    const mediaId = this.extractId(url);
    if (!mediaId) {
      return {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Could not extract valid media ID from the Instagram link.',
        },
      };
    }

    const isStory = url.toLowerCase().includes('/stories/');

    // 1. If user configured a custom backend service endpoint (e.g. self-hosted downloader proxy, RapidAPI server)
    if (config?.backendEndpoint) {
      return this.fetchFromCustomBackend(mediaId, url, config, isStory);
    }

    // 2. If user configured a Meta Graph API access token or RapidAPI key
    if (config?.apiKey) {
      return this.fetchWithApiKey(url, config.apiKey);
    }

    // 3. Honest boundary: Meta does not provide an open, unauthenticated public media download endpoint
    return {
      success: false,
      error: {
        code: 'API_KEY_REQUIRED',
        requiresConfiguration: true,
        message: 'Instagram media retrieval requires an authorized backend service or API key.',
        details: isStory
          ? 'Instagram Stories require authenticated account access. Please configure an authorized backend service in Settings.'
          : 'Meta restricts unauthenticated direct media downloads. You can connect your self-hosted backend or API key in Settings > API Configuration.',
      },
    };
  }

  private async fetchFromCustomBackend(
    mediaId: string,
    url: string,
    config: RetrievalConfig,
    isStory: boolean
  ): Promise<RetrievalResult> {
    try {
      const endpoint = `${config.backendEndpoint?.replace(/\/$/, '')}/instagram?id=${mediaId}&url=${encodeURIComponent(url)}&isStory=${isStory}`;
      const res = await fetch(endpoint, {
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return {
            success: false,
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'Authentication failed for the configured backend service.',
            },
          };
        }
        if (res.status === 404) {
          return {
            success: false,
            error: {
              code: 'EXPIRED_OR_DELETED',
              message: 'The requested Instagram post or Story was not found or has expired.',
            },
          };
        }
        return {
          success: false,
          error: {
            code: 'PROVIDER_UNAVAILABLE',
            message: `Instagram retrieval backend returned status ${res.status}.`,
          },
        };
      }

      const data = await res.json();
      return {
        success: true,
        data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to the configured Instagram backend service.',
          details: err?.message,
        },
      };
    }
  }

  private async fetchWithApiKey(url: string, apiKey: string): Promise<RetrievalResult> {
    try {
      // Official Meta Graph API oEmbed for Instagram
      const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${apiKey}`;
      const res = await fetch(oembedUrl);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: 'PROVIDER_UNAVAILABLE',
            message: errorData.error?.message || 'Failed to retrieve Instagram media with the provided API token.',
          },
        };
      }

      const data = await res.json();
      const mediaItem: MediaItem = {
        id: `ig_${Date.now()}`,
        type: 'image',
        url: data.thumbnail_url,
        thumbnailUrl: data.thumbnail_url,
        selected: true,
      };

      const metadata: MediaMetadata = {
        originalUrl: url,
        canonicalUrl: url,
        platform: 'instagram',
        mediaType: 'image',
        title: data.title || `Instagram post by @${data.author_name || 'user'}`,
        author: {
          username: data.author_name || 'user',
          displayName: data.author_name,
        },
        thumbnailUrl: data.thumbnail_url,
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
          message: 'Network error connecting to Instagram API.',
          details: err?.message,
        },
      };
    }
  }
}
