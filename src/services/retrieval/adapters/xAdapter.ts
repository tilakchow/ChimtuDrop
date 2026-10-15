import { MediaProviderAdapter, RetrievalConfig } from '../types';
import { MediaMetadata, RetrievalResult, MediaItem, QualityOption } from '../../../types/media';

export class XAdapter implements MediaProviderAdapter {
  readonly platform = 'x' as const;

  canHandle(url: string): boolean {
    return /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+)/i.test(url);
  }

  extractId(url: string): string | null {
    const match = url.match(/status\/([0-9]+)/i);
    return match ? match[1] : null;
  }

  async fetchMetadata(url: string, config?: RetrievalConfig): Promise<RetrievalResult> {
    const tweetId = this.extractId(url);
    if (!tweetId) {
      return {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Could not extract tweet ID from the provided X/Twitter URL.',
        },
      };
    }

    // 1. If user has configured a custom backend, try it first
    if (config?.backendEndpoint) {
      const backendRes = await this.fetchFromCustomBackend(tweetId, url, config);
      if (backendRes.success) {
        return backendRes;
      }
    }

    // 2. Fetch using official Twitter Syndication embed endpoint (always works for public tweets)
    try {
      const syndicationUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en`;
      const res = await fetch(syndicationUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          'Accept': 'application/json',
        },
      });

      if (res.status === 404) {
        return {
          success: false,
          error: {
            code: 'EXPIRED_OR_DELETED',
            message: 'This X post could not be found. It may have been deleted or the account was suspended.',
          },
        };
      }

      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          return {
            success: false,
            error: {
              code: 'PRIVATE_OR_INACCESSIBLE',
              message: 'This post is from a private account or requires authentication to view.',
            },
          };
        }
        return {
          success: false,
          error: {
            code: 'PROVIDER_UNAVAILABLE',
            message: `X service returned error (${res.status}). You can configure a custom API endpoint in Settings.`,
          },
        };
      }

      const data = await res.json();

      if (data.tombstone) {
        return {
          success: false,
          error: {
            code: 'PRIVATE_OR_INACCESSIBLE',
            message: data.tombstone.text?.text || 'This post is unavailable or private.',
          },
        };
      }

      const mediaDetails = data.mediaDetails;
      if (!mediaDetails || !Array.isArray(mediaDetails) || mediaDetails.length === 0) {
        return {
          success: false,
          error: {
            code: 'UNSUPPORTED_POST_TYPE',
            message: 'This X post does not contain any downloadable photos or videos.',
          },
        };
      }

      const items: MediaItem[] = [];
      let overallType: 'video' | 'image' | 'carousel' = 'image';

      for (let i = 0; i < mediaDetails.length; i++) {
        const item = mediaDetails[i];
        if (item.type === 'video' || item.type === 'animated_gif') {
          overallType = mediaDetails.length > 1 ? 'carousel' : 'video';
          const variants = item.video_info?.variants || [];
          
          // Filter to mp4 video variants
          const mp4Variants = variants
            .filter((v: any) => v.content_type === 'video/mp4' && v.url)
            .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

          if (mp4Variants.length === 0) {
            continue;
          }

          const highestQuality = mp4Variants[0];
          const qualities: QualityOption[] = mp4Variants.map((v: any, qIdx: number) => {
            const bitrateKbps = v.bitrate ? Math.round(v.bitrate / 1000) : 0;
            return {
              id: `q_${qIdx}`,
              label: bitrateKbps > 0 ? `${bitrateKbps} kbps MP4` : `Quality ${qIdx + 1}`,
              url: v.url,
              bitrate: v.bitrate,
              extension: 'mp4',
            };
          });

          items.push({
            id: `x_${item.id_str || i}`,
            type: 'video',
            url: highestQuality.url,
            thumbnailUrl: item.media_url_https,
            qualities,
            selected: true,
          });
        } else if (item.type === 'photo') {
          // Photos on Twitter can be fetched in orig or large size
          const photoUrl = item.media_url_https ? `${item.media_url_https}?name=orig` : item.media_url_https;
          items.push({
            id: `x_${item.id_str || i}`,
            type: 'image',
            url: photoUrl,
            thumbnailUrl: item.media_url_https,
            selected: true,
          });
        }
      }

      if (items.length === 0) {
        return {
          success: false,
          error: {
            code: 'UNSUPPORTED_POST_TYPE',
            message: 'No downloadable media found in this post.',
          },
        };
      }

      if (items.length > 1) {
        overallType = 'carousel';
      }

      const metadata: MediaMetadata = {
        originalUrl: url,
        canonicalUrl: `https://x.com/${data.user?.screen_name || 'user'}/status/${tweetId}`,
        platform: 'x',
        mediaType: overallType,
        title: data.text ? data.text.slice(0, 50).replace(/\n/g, ' ') : 'X Media',
        author: {
          username: data.user?.screen_name || 'unknown',
          displayName: data.user?.name,
          avatarUrl: data.user?.profile_image_url_https,
        },
        thumbnailUrl: items[0]?.thumbnailUrl,
        items,
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
          message: 'Failed to retrieve X post. Please check your internet connection or configure an API key in Settings.',
          details: err?.message,
        },
      };
    }
  }

  private async fetchFromCustomBackend(
    _tweetId: string,
    url: string,
    config: RetrievalConfig
  ): Promise<RetrievalResult> {
    try {
      const base = config.backendEndpoint?.replace(/\/$/, '');
      const endpoint = `${base}/api/extract`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return { success: false };
      }

      const data = await res.json();
      return {
        success: true,
        data,
      };
    } catch {
      return { success: false };
    }
  }
}
