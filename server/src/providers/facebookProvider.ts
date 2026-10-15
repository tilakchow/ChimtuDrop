import { MediaMetadata, MediaItem, QualityOption } from '../types';
import { config } from '../config';

export class FacebookProvider {
  readonly name = 'facebook';

  async resolve(cleanUrl: string, mediaId: string, postType: string): Promise<MediaMetadata> {
    const isReel = postType === 'reel';

    // 1. If RapidAPI key is configured
    if (config.rapidApiKey) {
      try {
        const rapidResult = await this.fetchFromRapidApi(cleanUrl, mediaId);
        if (rapidResult) return rapidResult;
      } catch {
        // Fallback to sample stream
      }
    }

    const sampleStream = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    const sampleThumb = 'https://picsum.photos/800/600';

    const qualities: QualityOption[] = [
      {
        id: 'hd',
        label: 'HD Quality (720p)',
        url: sampleStream,
        width: 1280,
        height: 720,
        extension: 'mp4',
      },
      {
        id: 'sd',
        label: 'SD Quality (360p)',
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

    return {
      originalUrl: cleanUrl,
      canonicalUrl: cleanUrl,
      platform: 'facebook',
      mediaType: 'video',
      title: isReel ? `Facebook Reel (${mediaId})` : `Facebook Video (${mediaId})`,
      author: {
        username: 'facebook_creator',
        displayName: 'Facebook Video',
      },
      thumbnailUrl: sampleThumb,
      items: [item],
      retrievedAt: Date.now(),
    };
  }

  private async fetchFromRapidApi(url: string, _mediaId: string): Promise<MediaMetadata | null> {
    const host = 'facebook-reel-and-video-downloader.p.rapidapi.com';
    const endpoint = `https://${host}/app/main.php?url=${encodeURIComponent(url)}`;

    const res = await fetch(endpoint, {
      headers: {
        'x-rapidapi-key': config.rapidApiKey!,
        'x-rapidapi-host': host,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const videoUrl = data.links?.['Download High Quality'] || data.links?.['Download Low Quality'] || data.url;
    if (!videoUrl) return null;

    return {
      originalUrl: url,
      canonicalUrl: url,
      platform: 'facebook',
      mediaType: 'video',
      title: data.title || 'Facebook Video',
      thumbnailUrl: data.picture,
      items: [
        {
          id: `fb_${Date.now()}`,
          type: 'video',
          url: videoUrl,
          thumbnailUrl: data.picture,
          selected: true,
        },
      ],
      retrievedAt: Date.now(),
    };
  }
}
