import { validateMediaUrl, generateSafeFileName } from '../services/retrieval/urlValidator';

describe('URL Validator and Platform Detection', () => {
  describe('Input validation', () => {
    it('rejects empty and whitespace strings', () => {
      const res1 = validateMediaUrl('');
      expect(res1.isValid).toBe(false);
      expect(res1.error).toContain('Please enter a URL');

      const res2 = validateMediaUrl('   ');
      expect(res2.isValid).toBe(false);
      expect(res2.error).toContain('URL cannot be empty');
    });

    it('rejects completely invalid URL formats', () => {
      const res = validateMediaUrl('htt p://invalid url');
      expect(res.isValid).toBe(false);
    });

    it('rejects unsupported domains honestly', () => {
      const res = validateMediaUrl('https://example.com/some-page');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Unsupported link');
    });
  });

  describe('Instagram link detection and canonicalization', () => {
    it('detects Instagram reel links and canonicalizes', () => {
      const url = 'https://www.instagram.com/reel/C34xyz123/?igsh=MWQ1ZGUxMzBkMA==';
      const result = validateMediaUrl(url);
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('instagram');
      expect(result.mediaId).toBe('C34xyz123');
      expect(result.canonicalUrl).toBe('https://www.instagram.com/reel/C34xyz123/');
    });

    it('detects Instagram post links', () => {
      const url = 'https://instagram.com/p/ABC987xyz/';
      const result = validateMediaUrl(url);
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('instagram');
      expect(result.mediaId).toBe('ABC987xyz');
      expect(result.canonicalUrl).toBe('https://www.instagram.com/p/ABC987xyz/');
    });

    it('detects Instagram story links', () => {
      const url = 'https://www.instagram.com/stories/username123/9876543210/';
      const result = validateMediaUrl(url);
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('instagram');
      expect(result.canonicalUrl).toBe('https://www.instagram.com/stories/username123/');
    });
  });

  describe('X (Twitter) link detection and canonicalization', () => {
    it('detects x.com status links', () => {
      const url = 'https://x.com/jack/status/20?s=20';
      const result = validateMediaUrl(url);
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('x');
      expect(result.mediaId).toBe('20');
      expect(result.canonicalUrl).toBe('https://x.com/jack/status/20');
    });

    it('detects twitter.com status links', () => {
      const url = 'https://twitter.com/elonmusk/status/1600000000000000000';
      const result = validateMediaUrl(url);
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('x');
      expect(result.mediaId).toBe('1600000000000000000');
    });
  });

  describe('Direct media link detection', () => {
    it('detects direct MP4 video URLs', () => {
      const url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      const result = validateMediaUrl(url);
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('direct');
      expect(result.canonicalUrl).toBe(url);
    });

    it('detects direct JPEG image URLs', () => {
      const url = 'https://images.example.com/photos/nature_scenery.jpg?quality=80';
      const result = validateMediaUrl(url);
      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('direct');
    });
  });

  describe('Filename validation and sanitization', () => {
    it('creates safe filenames removing illegal filesystem characters', () => {
      const safeName = generateSafeFileName('Amazing Reel! #viral / test <wow>', 'instagram', 'mp4');
      expect(safeName).toMatch(/^clipdrop_amazing_reel_viral_test_wow_[0-9]+\.mp4$/);
      expect(safeName).not.toContain('!');
      expect(safeName).not.toContain('#');
      expect(safeName).not.toContain('/');
      expect(safeName).not.toContain('<');
    });

    it('falls back to platform defaults when title contains only invalid characters', () => {
      const safeName = generateSafeFileName('!!!@@@###$$$', 'x', 'mp4');
      expect(safeName).toMatch(/^clipdrop_x_media_[0-9]+\.mp4$/);
    });
  });
});
