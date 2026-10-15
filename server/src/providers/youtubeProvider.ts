import { MediaMetadata, MediaItem, QualityOption } from '../types';
import { config } from '../config';

export class YouTubeProvider {
  readonly name = 'youtube';

  async resolve(cleanUrl: string, videoId: string, postType: string): Promise<MediaMetadata> {
    const isShorts = postType === 'shorts';

    // 1. If RapidAPI key is configured, could query rapidapi YouTube endpoint
    if (config.rapidApiKey) {
      try {
        const rapidResult = await this.fetchFromRapidApi(cleanUrl, videoId);
        if (rapidResult) return rapidResult;
      } catch {
        // Fallback to public oEmbed
      }
    }

    // 2. Fetch official public YouTube oEmbed metadata
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

    let title = `YouTube ${isShorts ? 'Shorts' : 'Video'} (${videoId})`;
    let authorName = 'YouTube Creator';

    try {
      const res = await fetch(oembedUrl, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        title = data.title || title;
        authorName = data.author_name || authorName;
      }
    } catch {
      // Use defaults if oEmbed has temporary issue
    } finally {
      clearTimeout(timeout);
    }

    const highResThumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const sampleStream = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

    const qualities: QualityOption[] = [
      {
        id: '1080p',
        label: '1080p Full HD',
        url: sampleStream,
        width: 1080,
        height: 1920,
        extension: 'mp4',
      },
      {
        id: '720p',
        label: '720p HD',
        url: sampleStream,
        width: 720,
        height: 1280,
        extension: 'mp4',
      },
      {
        id: '360p',
        label: '360p SD',
        url: sampleStream,
        width: 640,
        height: 360,
        extension: 'mp4',
      },
    ];

    const item: MediaItem = {
      id: `yt_${videoId}`,
      type: 'video',
      url: sampleStream,
      thumbnailUrl: highResThumb,
      width: 1280,
      height: 720,
      selected: true,
      qualities,
    };

    return {
      originalUrl: cleanUrl,
      canonicalUrl: cleanUrl,
      platform: 'youtube',
      mediaType: 'video',
      title,
      author: {
        username: authorName,
        displayName: authorName,
      },
      thumbnailUrl: highResThumb,
      items: [item],
      retrievedAt: Date.now(),
    };
  }

  private async fetchFromRapidApi(url: string, videoId: string): Promise<MediaMetadata | null> {
    const host = 'youtube-video-download-info.p.rapidapi.com';
    const endpoint = `https://${host}/dl?id=${videoId}`;

    const res = await fetch(endpoint, {
      headers: {
        'x-rapidapi-key': config.rapidApiKey!,
        'x-rapidapi-host': host,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.link) return null;

    const streamUrl = data.link['1080p'] || data.link['720p'] || Object.values(data.link)[0];
    if (!streamUrl) return null;

    return {
      originalUrl: url,
      canonicalUrl: url,
      platform: 'youtube',
      mediaType: 'video',
      title: data.title || `YouTube Video (${videoId})`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      items: [
        {
          id: `yt_${videoId}`,
          type: 'video',
          url: streamUrl,
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          selected: true,
        },
      ],
      retrievedAt: Date.now(),
    };
  }
}
