import { InstagramAdapter } from '../services/retrieval/adapters/instagramAdapter';
import { XAdapter } from '../services/retrieval/adapters/xAdapter';
import { YouTubeAdapter } from '../services/retrieval/adapters/youtubeAdapter';
import { FacebookAdapter } from '../services/retrieval/adapters/facebookAdapter';
import { DirectMediaAdapter } from '../services/retrieval/adapters/directMediaAdapter';
import { MediaService } from '../services/retrieval/mediaService';

describe('Media Retrieval Adapters', () => {
  describe('Instagram Adapter', () => {
    const adapter = new InstagramAdapter();

    it('identifies Instagram links correctly', () => {
      expect(adapter.canHandle('https://www.instagram.com/reel/C34xyz123/')).toBe(true);
      expect(adapter.canHandle('https://x.com/status/123')).toBe(false);
    });

    it('extracts media ID from reel, post, and story links', () => {
      expect(adapter.extractId('https://www.instagram.com/reel/C_abc123/')).toBe('C_abc123');
      expect(adapter.extractId('https://www.instagram.com/p/D_efg456/')).toBe('D_efg456');
    });

    it('honestly returns API_KEY_REQUIRED when unauthenticated rather than returning fake data', async () => {
      const res = await adapter.fetchMetadata('https://www.instagram.com/reel/C_abc123/');
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('API_KEY_REQUIRED');
      expect(res.error?.requiresConfiguration).toBe(true);
    });
  });

  describe('X / Twitter Adapter', () => {
    const adapter = new XAdapter();

    it('identifies X / Twitter links correctly', () => {
      expect(adapter.canHandle('https://x.com/testuser/status/1234567890')).toBe(true);
      expect(adapter.canHandle('https://twitter.com/testuser/status/1234567890')).toBe(true);
      expect(adapter.canHandle('https://instagram.com/p/123')).toBe(false);
    });

    it('extracts status ID accurately', () => {
      expect(adapter.extractId('https://x.com/user/status/987654321012345678')).toBe('987654321012345678');
    });
  });

  describe('Direct Media Adapter', () => {
    const adapter = new DirectMediaAdapter();

    it('identifies direct audio/video/image links', () => {
      expect(adapter.canHandle('https://example.com/test.mp4')).toBe(true);
      expect(adapter.canHandle('https://example.com/test.webm')).toBe(true);
      expect(adapter.canHandle('https://example.com/image.jpg?w=500')).toBe(true);
      expect(adapter.canHandle('https://example.com/page.html')).toBe(false);
    });
  });

  describe('YouTube Adapter', () => {
    const adapter = new YouTubeAdapter();

    it('identifies YouTube watch and shorts links', () => {
      expect(adapter.canHandle('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(adapter.canHandle('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
      expect(adapter.canHandle('https://www.youtube.com/shorts/5kM-i30jVls')).toBe(true);
      expect(adapter.canHandle('https://facebook.com/reel/123')).toBe(false);
    });

    it('extracts YouTube video IDs correctly', () => {
      expect(adapter.extractId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(adapter.extractId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });
  });

  describe('Facebook Adapter', () => {
    const adapter = new FacebookAdapter();

    it('identifies Facebook reel and watch links', () => {
      expect(adapter.canHandle('https://www.facebook.com/reel/101587654321/')).toBe(true);
      expect(adapter.canHandle('https://fb.watch/abcd1234ef/')).toBe(true);
      expect(adapter.canHandle('https://youtube.com/watch?v=123')).toBe(false);
    });

    it('extracts Facebook media IDs correctly', () => {
      expect(adapter.extractId('https://www.facebook.com/reel/101587654321/')).toBe('101587654321');
    });
  });

  describe('MediaService Orchestration', () => {
    const service = new MediaService();

    it('rejects unsupported domain URLs with clear error', async () => {
      const res = await service.fetchMedia('https://unsupported-site.com/video/123');
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('INVALID_URL');
      expect(res.error?.message).toContain('supports Instagram, X (Twitter), YouTube, Facebook');
    });
  });
});
