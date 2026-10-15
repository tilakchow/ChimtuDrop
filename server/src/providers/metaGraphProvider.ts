import { InstagramProvider } from './types';
import { MediaMetadata, MediaItem } from '../types';
import { config } from '../config';

export class MetaGraphProvider implements InstagramProvider {
  readonly name = 'meta_graph';

  isConfigured(): boolean {
    return Boolean(config.metaAppAccessToken && config.metaAppAccessToken.length > 5);
  }

  async resolve(cleanUrl: string, mediaId: string, postType: string): Promise<MediaMetadata> {
    if (!this.isConfigured()) {
      throw {
        code: 'API_KEY_REQUIRED',
        message: 'Meta App Access Token is not configured on the backend.',
      };
    }

    const token = config.metaAppAccessToken!;
    const endpoint = `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(cleanUrl)}&access_token=${token}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const metaError = errorJson.error;

        if (res.status === 404 || metaError?.code === 100) {
          throw {
            code: 'EXPIRED_OR_DELETED',
            message: 'This Instagram post was not found or is no longer accessible via Meta Graph API.',
          };
        }
        if (res.status === 401 || res.status === 403 || metaError?.code === 190) {
          throw {
            code: 'AUTHENTICATION_REQUIRED',
            message: metaError?.message || 'Meta App Access Token is invalid or expired.',
          };
        }
        throw {
          code: 'PROVIDER_UNAVAILABLE',
          message: metaError?.message || `Meta Graph API responded with status ${res.status}.`,
        };
      }

      const data = await res.json();
      const isVideo = postType === 'reel' || postType === 'tv';

      const mediaItem: MediaItem = {
        id: `ig_${mediaId}_1`,
        type: isVideo ? 'video' : 'image',
        url: data.thumbnail_url,
        thumbnailUrl: data.thumbnail_url,
        width: data.thumbnail_width,
        height: data.thumbnail_height,
        selected: true,
      };

      return {
        originalUrl: cleanUrl,
        canonicalUrl: cleanUrl,
        platform: 'instagram',
        mediaType: isVideo ? 'video' : 'image',
        title: data.title || `Instagram post by @${data.author_name || 'user'}`,
        author: {
          username: data.author_name || 'user',
          displayName: data.author_name,
        },
        thumbnailUrl: data.thumbnail_url,
        items: [mediaItem],
        retrievedAt: Date.now(),
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw {
          code: 'NETWORK_ERROR',
          message: 'Request to Meta Graph API timed out.',
        };
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
