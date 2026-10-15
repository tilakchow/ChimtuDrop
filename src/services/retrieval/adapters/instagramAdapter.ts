import { MediaProviderAdapter, RetrievalConfig } from '../types';
import { MediaMetadata, RetrievalResult, MediaItem } from '../../../types/media';
import { resolveBackendUrl } from '../../../utils/networkUtils';

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

    // Stories cannot be retrieved anonymously
    if (isStory) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Instagram Stories require authenticated account access and cannot be downloaded anonymously.',
          details: 'Stories are ephemeral (24-hour) media protected by Instagram user login authentication.',
        },
      };
    }

    // Determine target backend endpoint (auto-maps localhost to LAN IP on mobile):
    const effectiveBackendEndpoint = config?.backendEndpoint?.trim()
      ? resolveBackendUrl(config.backendEndpoint)
      : undefined;

    if (effectiveBackendEndpoint) {
      return this.fetchFromCustomBackend(url, effectiveBackendEndpoint, config?.apiKey);
    }

    // Direct API key fallback if configured without backend
    if (config?.apiKey) {
      return this.fetchWithApiKey(url, config.apiKey);
    }

    // Boundary: Guide user to configure backend or start server
    return {
      success: false,
      error: {
        code: 'API_KEY_REQUIRED',
        requiresConfiguration: true,
        message: 'Instagram media retrieval requires the ChimtuDrop backend service.',
        details:
          'Please start the ChimtuDrop backend server ("npm run backend") and ensure your phone is connected on the same Wi-Fi.',
      },
    };
  }

  private async fetchFromCustomBackend(
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
          return {
            success: false,
            error: responseJson.error,
          };
        }

        const detail = responseJson?.detail || `Server returned HTTP ${res.status}`;
        return {
          success: false,
          error: {
            code: res.status === 400 ? 'INVALID_URL' : res.status === 403 ? 'AUTHENTICATION_REQUIRED' : 'PROVIDER_UNAVAILABLE',
            message: detail,
          },
        };
      }

      if (!responseJson || !responseJson.items || responseJson.items.length === 0) {
        return {
          success: false,
          error: {
            code: 'PROVIDER_UNAVAILABLE',
            message: 'Backend succeeded but returned empty media content.',
          },
        };
      }

      return {
        success: true,
        data: responseJson as MediaMetadata,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: `Connection to backend at ${backendEndpoint} timed out.`,
            details: 'Ensure the server is running ("npm run backend") and accessible on your local network.',
            requiresConfiguration: false,
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: `Unable to connect to ChimtuDrop backend at ${backendEndpoint}.`,
          details: 'Please ensure your computer and phone are connected to the same Wi-Fi network and "npm run backend" is running.',
          requiresConfiguration: false,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchWithApiKey(url: string, apiKey: string): Promise<RetrievalResult> {
    try {
      // Official Meta Graph API oEmbed for Instagram
      const oembedUrl = `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${apiKey}`;
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
        title: data.title || 'Instagram Photo',
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
