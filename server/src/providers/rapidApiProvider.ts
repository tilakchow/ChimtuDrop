import { InstagramProvider } from './types';
import { MediaMetadata, MediaItem } from '../types';
import { config } from '../config';

export class RapidApiProvider implements InstagramProvider {
  readonly name = 'rapidapi';

  isConfigured(): boolean {
    return Boolean(config.rapidApiKey && config.rapidApiKey.length > 5);
  }

  async resolve(cleanUrl: string, mediaId: string, postType: string): Promise<MediaMetadata> {
    if (!this.isConfigured()) {
      throw {
        code: 'API_KEY_REQUIRED',
        message: 'RapidAPI key is not configured on the backend.',
      };
    }

    const host = config.rapidApiHost;
    const apiKey = config.rapidApiKey!;

    // Supported common endpoint: https://{host}/?url={cleanUrl}
    const endpoint = config.rapidApiEndpoint || `https://${host}/?url=${encodeURIComponent(cleanUrl)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': host,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw {
            code: 'EXPIRED_OR_DELETED',
            message: 'The requested Instagram post or Reel was not found or has been removed.',
          };
        }
        if (res.status === 429) {
          throw {
            code: 'RATE_LIMITED',
            message: 'RapidAPI quota or rate limit exceeded for Instagram retrieval.',
          };
        }
        if (res.status === 401 || res.status === 403) {
          throw {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Invalid RapidAPI key or unauthorized access to the Instagram API provider.',
          };
        }
        throw {
          code: 'PROVIDER_UNAVAILABLE',
          message: `RapidAPI provider responded with status ${res.status}.`,
        };
      }

      const data = await res.json();

      // Normalize media items from common RapidAPI response formats
      const items: MediaItem[] = [];
      const mediaList = Array.isArray(data) ? data : data.data || data.media || [data];

      for (let i = 0; i < mediaList.length; i++) {
        const item = mediaList[i];
        const mediaUrl = item.download_url || item.url || item.video_url || item.image_url;
        if (!mediaUrl) continue;

        const isVideo = item.type === 'video' || postType === 'reel' || mediaUrl.includes('.mp4');
        items.push({
          id: `ig_${mediaId}_${i + 1}`,
          type: isVideo ? 'video' : 'image',
          url: mediaUrl,
          thumbnailUrl: item.thumbnail_url || item.thumb || item.cover || data.thumbnail_url,
          width: item.width,
          height: item.height,
          selected: true,
          qualities: isVideo
            ? [
                {
                  id: 'hd',
                  label: 'HD (Original)',
                  url: mediaUrl,
                  extension: 'mp4',
                },
              ]
            : undefined,
        });
      }

      if (items.length === 0) {
        throw {
          code: 'PROVIDER_UNAVAILABLE',
          message: 'The provider responded successfully but no downloadable media stream could be extracted.',
        };
      }

      const isVideo = items[0].type === 'video';
      const metadata: MediaMetadata = {
        originalUrl: cleanUrl,
        canonicalUrl: cleanUrl,
        platform: 'instagram',
        mediaType: items.length > 1 ? 'carousel' : isVideo ? 'video' : 'image',
        title: data.title || data.caption || `Instagram ${postType} (${mediaId})`,
        author: {
          username: data.author?.username || data.username || data.owner?.username || 'instagram_user',
          displayName: data.author?.name || data.full_name,
        },
        thumbnailUrl: items[0].thumbnailUrl,
        items,
        retrievedAt: Date.now(),
      };

      return metadata;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw {
          code: 'NETWORK_ERROR',
          message: 'Request to Instagram API provider timed out.',
        };
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
