import { SupportedPlatform } from '../../types/media';

export interface ValidatedUrl {
  isValid: boolean;
  platform?: SupportedPlatform;
  canonicalUrl?: string;
  mediaId?: string;
  error?: string;
}

const INSTAGRAM_REGEX = /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|reels|tv|stories)\/([a-zA-Z0-9_\-\.]+)/i;
const X_TWITTER_REGEX = /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+)/i;
const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
const FACEBOOK_REGEX = /^(https?:\/\/)?(www\.|m\.|web\.)?(facebook\.com\/(?:watch\/?\?v=|reel\/|.*\/videos\/|share\/(?:v|r)\/)|fb\.watch\/)([0-9a-zA-Z_-]+)/i;
const DIRECT_MEDIA_REGEX = /\.(mp4|m4v|mov|webm|jpg|jpeg|png|webp|gif)(\?.*)?$/i;

/**
 * Validates and extracts details from a user-supplied link
 */
export function validateMediaUrl(input: string): ValidatedUrl {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      error: 'Please enter a URL.',
    };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'URL cannot be empty.',
    };
  }

  // Prepend https if protocol is missing
  let fullUrl = trimmed;
  if (!/^https?:\/\//i.test(fullUrl)) {
    fullUrl = `https://${fullUrl}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(fullUrl);
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format.',
    };
  }

  // Check Instagram
  const igMatch = fullUrl.match(INSTAGRAM_REGEX);
  if (igMatch) {
    const postType = igMatch[3].toLowerCase();
    const mediaId = igMatch[4];
    // Strip tracking queries (igsh, utm_*, etc.)
    const canonical = `https://www.instagram.com/${postType === 'reels' ? 'reel' : postType}/${mediaId}/`;
    return {
      isValid: true,
      platform: 'instagram',
      canonicalUrl: canonical,
      mediaId,
    };
  }

  // Check X / Twitter
  const xMatch = fullUrl.match(X_TWITTER_REGEX);
  if (xMatch) {
    const username = xMatch[4];
    const statusId = xMatch[5];
    const canonical = `https://x.com/${username}/status/${statusId}`;
    return {
      isValid: true,
      platform: 'x',
      canonicalUrl: canonical,
      mediaId: statusId,
    };
  }

  // Check YouTube
  const ytMatch = fullUrl.match(YOUTUBE_REGEX);
  if (ytMatch) {
    const videoId = ytMatch[4];
    const isShorts = fullUrl.includes('/shorts/');
    const canonical = isShorts
      ? `https://www.youtube.com/shorts/${videoId}`
      : `https://www.youtube.com/watch?v=${videoId}`;
    return {
      isValid: true,
      platform: 'youtube',
      canonicalUrl: canonical,
      mediaId: videoId,
    };
  }

  // Check Facebook
  const fbMatch = fullUrl.match(FACEBOOK_REGEX);
  if (fbMatch) {
    const mediaId = fbMatch[4];
    const isReel = fullUrl.includes('/reel/');
    const canonical = isReel
      ? `https://www.facebook.com/reel/${mediaId}/`
      : `https://www.facebook.com/watch/?v=${mediaId}`;
    return {
      isValid: true,
      platform: 'facebook',
      canonicalUrl: canonical,
      mediaId,
    };
  }

  // Check Direct Media Link
  if (DIRECT_MEDIA_REGEX.test(parsed.pathname) || DIRECT_MEDIA_REGEX.test(fullUrl)) {
    return {
      isValid: true,
      platform: 'direct',
      canonicalUrl: parsed.toString(),
      mediaId: parsed.pathname.split('/').pop() || 'media',
    };
  }

  return {
    isValid: false,
    error: 'Unsupported link. ChimtuDrop supports Instagram, X (Twitter), YouTube, Facebook, and direct media URLs.',
  };
}

/**
 * Extract clean, human-readable filename from a media URL or title
 */
export function generateSafeFileName(title: string, platform: SupportedPlatform, extension: string): string {
  const cleanedTitle = title.replace(/^(video|post|reel|tweet)\s+by\s+[^:\n_]+/i, '').trim();
  const sanitized = (cleanedTitle || title)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30)
    .replace(/^_+|_+$/g, '');

  const base = sanitized || `${platform}_media`;
  const cleanExt = extension.replace(/^\./, '');
  const timestamp = Date.now().toString().slice(-6);
  return `${base}_${timestamp}.${cleanExt}`;
}
