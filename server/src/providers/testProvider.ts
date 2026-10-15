import { InstagramProvider } from './types';
import { MediaMetadata, MediaItem } from '../types';
import { config } from '../config';

/**
 * Test & Development Provider
 * Allows testing and verifying the complete download and preview pipeline
 * using authorized test media streams without requiring paid third-party API credentials.
 */
export class TestProvider implements InstagramProvider {
  readonly name = 'test_provider';

  isConfigured(): boolean {
    return config.enableTestProvider;
  }

  // Known test/sample IDs or matches
  canHandleTest(url: string, mediaId: string): boolean {
    return (
      config.enableTestProvider ||
      mediaId.startsWith('test_') ||
      mediaId === 'sample' ||
      url.includes('sample') ||
      url.includes('test')
    );
  }

  async resolve(cleanUrl: string, mediaId: string, postType: string): Promise<MediaMetadata> {
    const isVideo = postType === 'reel' || postType === 'tv' || mediaId.includes('video');

    // High quality, stable public test assets
    const sampleVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    const samplePhotoUrl = 'https://picsum.photos/1080/1350';
    const sampleThumbUrl = 'https://picsum.photos/400/400';

    const items: MediaItem[] = [
      {
        id: `ig_${mediaId}_1`,
        type: isVideo ? 'video' : 'image',
        url: isVideo ? sampleVideoUrl : samplePhotoUrl,
        thumbnailUrl: sampleThumbUrl,
        width: 1080,
        height: isVideo ? 1920 : 1350,
        fileSizeBytes: isVideo ? 15462800 : 854000,
        selected: true,
        qualities: isVideo
          ? [
              {
                id: '1080p',
                label: '1080p Full HD',
                url: sampleVideoUrl,
                width: 1080,
                height: 1920,
                fileSizeBytes: 15462800,
                extension: 'mp4',
              },
              {
                id: '720p',
                label: '720p HD',
                url: sampleVideoUrl,
                width: 720,
                height: 1280,
                fileSizeBytes: 9800000,
                extension: 'mp4',
              },
            ]
          : undefined,
      },
    ];

    return {
      originalUrl: cleanUrl,
      canonicalUrl: cleanUrl,
      platform: 'instagram',
      mediaType: isVideo ? 'video' : 'image',
      title: isVideo
        ? `Instagram Reel by @creative_creator (${mediaId})`
        : `Instagram Photo by @art_hub (${mediaId})`,
      author: {
        username: 'clipdrop_verified',
        displayName: 'ClipDrop Verified Media',
        avatarUrl: sampleThumbUrl,
      },
      durationSeconds: isVideo ? 15 : undefined,
      thumbnailUrl: sampleThumbUrl,
      items,
      retrievedAt: Date.now(),
    };
  }
}
