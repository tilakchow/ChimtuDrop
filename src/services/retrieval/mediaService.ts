import { RetrievalResult } from '../../types/media';
import { MediaProviderAdapter, RetrievalConfig } from './types';
import { validateMediaUrl } from './urlValidator';
import { InstagramAdapter } from './adapters/instagramAdapter';
import { XAdapter } from './adapters/xAdapter';
import { DirectMediaAdapter } from './adapters/directMediaAdapter';

export class MediaService {
  private adapters: MediaProviderAdapter[];

  constructor(customAdapters?: MediaProviderAdapter[]) {
    this.adapters = customAdapters || [
      new InstagramAdapter(),
      new XAdapter(),
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
          message: validation.error || 'Please enter a valid Instagram, X (Twitter), or direct media URL.',
        },
      };
    }

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

    const targetUrl = validation.canonicalUrl || inputUrl;
    return adapter.fetchMetadata(targetUrl, config);
  }

  /**
   * Register a new or mock adapter (useful for testing and extensions)
   */
  registerAdapter(adapter: MediaProviderAdapter) {
    this.adapters.unshift(adapter);
  }
}

export const mediaService = new MediaService();
