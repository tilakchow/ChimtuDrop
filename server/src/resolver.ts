import { MediaMetadata } from './types';
import {
  validateInstagramUrl,
  validateYouTubeUrl,
  validateFacebookUrl,
  validateAnyMediaUrl,
} from './validators';
import { InstagramProvider } from './providers/types';
import { RapidApiProvider } from './providers/rapidApiProvider';
import { MetaGraphProvider } from './providers/metaGraphProvider';
import { TestProvider } from './providers/testProvider';
import { YouTubeProvider } from './providers/youtubeProvider';
import { FacebookProvider } from './providers/facebookProvider';

export class MediaResolver {
  private igProviders: InstagramProvider[];
  private youtubeProvider: YouTubeProvider;
  private facebookProvider: FacebookProvider;

  constructor() {
    this.igProviders = [
      new RapidApiProvider(),
      new MetaGraphProvider(),
      new TestProvider(),
    ];
    this.youtubeProvider = new YouTubeProvider();
    this.facebookProvider = new FacebookProvider();
  }

  getConfiguredProviderNames(): string[] {
    const list: string[] = [];
    for (const p of this.igProviders) {
      if (p.isConfigured()) list.push(p.name);
    }
    list.push('youtube');
    list.push('facebook');
    return list;
  }

  async resolveInstagram(rawUrl: string): Promise<MediaMetadata> {
    const validation = validateInstagramUrl(rawUrl);
    if (!validation.isValid || !validation.cleanUrl || !validation.mediaId) {
      throw validation.error || {
        code: 'INVALID_URL',
        message: 'Invalid Instagram URL format.',
      };
    }

    const { cleanUrl, mediaId, postType = 'post' } = validation;
    const activeProviders = this.igProviders.filter((p) => p.isConfigured());

    if (activeProviders.length === 0) {
      throw {
        code: 'PROVIDER_UNAVAILABLE',
        message: 'No authorized Instagram media retrieval provider is configured on this backend server.',
        details:
          'Please configure RAPIDAPI_KEY or META_APP_ACCESS_TOKEN in server/.env, or enable ENABLE_TEST_PROVIDER=true.',
        requiresConfiguration: true,
      };
    }

    let lastError: any = null;
    for (const provider of activeProviders) {
      try {
        const result = await provider.resolve(cleanUrl, mediaId, postType);
        return result;
      } catch (err: any) {
        lastError = err;
        if (
          err.code === 'PRIVATE_OR_INACCESSIBLE' ||
          err.code === 'EXPIRED_OR_DELETED' ||
          err.code === 'AUTHENTICATION_REQUIRED'
        ) {
          throw err;
        }
      }
    }

    throw lastError || {
      code: 'PROVIDER_UNAVAILABLE',
      message: 'Failed to retrieve media from all configured Instagram providers.',
    };
  }

  async resolveYouTube(rawUrl: string): Promise<MediaMetadata> {
    const validation = validateYouTubeUrl(rawUrl);
    if (!validation.isValid || !validation.cleanUrl || !validation.mediaId) {
      throw validation.error || {
        code: 'INVALID_URL',
        message: 'Invalid YouTube URL format.',
      };
    }

    return this.youtubeProvider.resolve(validation.cleanUrl, validation.mediaId, validation.postType || 'video');
  }

  async resolveFacebook(rawUrl: string): Promise<MediaMetadata> {
    const validation = validateFacebookUrl(rawUrl);
    if (!validation.isValid || !validation.cleanUrl || !validation.mediaId) {
      throw validation.error || {
        code: 'INVALID_URL',
        message: 'Invalid Facebook URL format.',
      };
    }

    return this.facebookProvider.resolve(validation.cleanUrl, validation.mediaId, validation.postType || 'video');
  }

  /**
   * Unified entry point: automatically detects platform and resolves media
   */
  async resolveAny(rawUrl: string): Promise<MediaMetadata> {
    const validation = validateAnyMediaUrl(rawUrl);
    if (!validation.isValid) {
      throw validation.error || {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'Unsupported link. Supported: Instagram, YouTube, Facebook, X (Twitter).',
      };
    }

    if (validation.platform === 'instagram') {
      return this.resolveInstagram(rawUrl);
    }
    if (validation.platform === 'youtube') {
      return this.resolveYouTube(rawUrl);
    }
    if (validation.platform === 'facebook') {
      return this.resolveFacebook(rawUrl);
    }

    throw {
      code: 'UNSUPPORTED_PLATFORM',
      message: `No resolver registered for platform: ${validation.platform}`,
    };
  }

  // Alias for backward compatibility
  async resolveUrl(rawUrl: string): Promise<MediaMetadata> {
    return this.resolveAny(rawUrl);
  }
}

export const mediaResolver = new MediaResolver();
// For backwards compatibility
export const instagramResolver = mediaResolver;
export const InstagramResolver = MediaResolver;
