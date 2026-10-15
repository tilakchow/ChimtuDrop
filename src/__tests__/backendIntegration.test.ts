import { validateInstagramUrl } from '../../server/src/validators';
import { InstagramResolver } from '../../server/src/resolver';
import { InstagramAdapter } from '../services/retrieval/adapters/instagramAdapter';

describe('ClipDrop Backend & Instagram Integration', () => {
  describe('Backend URL Validator & SSRF Guard', () => {
    it('accepts valid public Instagram post and reel URLs', () => {
      const reel = validateInstagramUrl('https://www.instagram.com/reel/C_sK9-vviqH/?igsh=MWF5');
      expect(reel.isValid).toBe(true);
      expect(reel.mediaId).toBe('C_sK9-vviqH');
      expect(reel.postType).toBe('reel');
      expect(reel.cleanUrl).toBe('https://www.instagram.com/reel/C_sK9-vviqH/');

      const post = validateInstagramUrl('https://instagram.com/p/DB123xyz/');
      expect(post.isValid).toBe(true);
      expect(post.mediaId).toBe('DB123xyz');
      expect(post.postType).toBe('post');
    });

    it('rejects Instagram stories with AUTHENTICATION_REQUIRED error', () => {
      const story = validateInstagramUrl('https://www.instagram.com/stories/someuser/321654987/');
      expect(story.isValid).toBe(false);
      expect(story.error?.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('blocks malicious SSRF targets and non-Instagram domains', () => {
      const ssrf1 = validateInstagramUrl('http://169.254.169.254/latest/meta-data/');
      expect(ssrf1.isValid).toBe(false);
      expect(ssrf1.error?.code).toBe('UNSUPPORTED_PLATFORM');

      const ssrf2 = validateInstagramUrl('https://evil-site.com/reel/123');
      expect(ssrf2.isValid).toBe(false);
      expect(ssrf2.error?.code).toBe('UNSUPPORTED_PLATFORM');
    });

    it('rejects malformed inputs and invalid protocols', () => {
      const fileUrl = validateInstagramUrl('file:///etc/passwd');
      expect(fileUrl.isValid).toBe(false);
      expect(fileUrl.error?.code).toBe('INVALID_URL');

      const gibberish = validateInstagramUrl('not-a-url');
      expect(gibberish.isValid).toBe(false);
      expect(gibberish.error?.code).toBe('INVALID_URL');
    });
  });

  describe('Instagram Resolver', () => {
    const resolver = new InstagramResolver();

    it('lists configured providers including test_provider', () => {
      const providers = resolver.getConfiguredProviderNames();
      expect(providers).toContain('test_provider');
    });

    it('resolves valid Instagram reel using active test provider', async () => {
      const metadata = await resolver.resolveUrl('https://www.instagram.com/reel/C_sK9-vviqH/');
      expect(metadata).toBeDefined();
      expect(metadata.platform).toBe('instagram');
      expect(metadata.mediaType).toBe('video');
      expect(metadata.items.length).toBeGreaterThan(0);
      expect(metadata.items[0].url).toContain('.mp4');
    });

    it('throws structured error for story URLs', async () => {
      await expect(
        resolver.resolveUrl('https://www.instagram.com/stories/testuser/123456/')
      ).rejects.toMatchObject({
        code: 'AUTHENTICATION_REQUIRED',
      });
    });
  });

  describe('InstagramAdapter Backend Client Handling', () => {
    const adapter = new InstagramAdapter();

    it('successfully maps backend response into MediaMetadata', async () => {
      const mockMetadata = {
        originalUrl: 'https://www.instagram.com/reel/C_test/',
        canonicalUrl: 'https://www.instagram.com/reel/C_test/',
        platform: 'instagram' as const,
        mediaType: 'video' as const,
        title: 'Mock Reel',
        thumbnailUrl: 'https://picsum.photos/400',
        items: [
          {
            id: 'item_1',
            type: 'video' as const,
            url: 'https://example.com/test.mp4',
            selected: true,
          },
        ],
        retrievedAt: Date.now(),
      };

      // Mock global fetch
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadata,
      } as any);

      try {
        const result = await adapter.fetchMetadata('https://www.instagram.com/reel/C_test/', {
          backendEndpoint: 'http://localhost:3000',
        });

        expect(result.success).toBe(true);
        expect(result.data?.title).toBe('Mock Reel');
        expect(result.data?.items[0].url).toBe('https://example.com/test.mp4');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('accurately parses structured errors returned by the backend', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: 'PRIVATE_OR_INACCESSIBLE',
            message: 'This account is private.',
          },
        }),
      } as any);

      try {
        const result = await adapter.fetchMetadata('https://www.instagram.com/reel/C_test/', {
          backendEndpoint: 'http://localhost:3000',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PRIVATE_OR_INACCESSIBLE');
        expect(result.error?.message).toBe('This account is private.');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
