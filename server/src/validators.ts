import { ErrorCode, SupportedPlatform } from './types';

export interface ValidationResult {
  isValid: boolean;
  platform?: SupportedPlatform;
  cleanUrl?: string;
  mediaId?: string;
  postType?: string;
  error?: {
    code: ErrorCode;
    message: string;
    details?: string;
  };
}

/**
 * Validates and sanitizes Instagram URLs with anti-SSRF protections
 */
export function validateInstagramUrl(inputUrl: string): ValidationResult {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return {
      isValid: false,
      error: { code: 'INVALID_URL', message: 'No URL provided.' },
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(inputUrl.trim());
  } catch {
    return {
      isValid: false,
      error: { code: 'INVALID_URL', message: 'Invalid HTTP/HTTPS URL format.' },
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      error: { code: 'INVALID_URL', message: 'Only HTTP and HTTPS protocols are supported.' },
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const allowedHosts = ['instagram.com', 'www.instagram.com', 'instagr.am', 'www.instagr.am'];

  if (!allowedHosts.includes(hostname)) {
    return {
      isValid: false,
      error: { code: 'UNSUPPORTED_PLATFORM', message: `Invalid host '${hostname}'. Only instagram.com is allowed here.` },
    };
  }

  const match = parsed.pathname.match(/\/(p|reel|reels|tv|stories)\/([a-zA-Z0-9_\-\.]+)/i);
  if (!match) {
    return {
      isValid: false,
      error: { code: 'INVALID_URL', message: 'Could not find a valid post or reel ID in the Instagram URL.' },
    };
  }

  const rawType = match[1].toLowerCase();
  const mediaId = match[2];

  if (rawType === 'stories') {
    return {
      isValid: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Instagram Stories require authenticated account access and cannot be retrieved anonymously.',
      },
    };
  }

  const postType = rawType === 'reels' ? 'reel' : rawType === 'p' ? 'post' : rawType;
  const cleanUrl = `https://www.instagram.com/${postType === 'post' ? 'p' : postType}/${mediaId}/`;

  return {
    isValid: true,
    platform: 'instagram',
    cleanUrl,
    mediaId,
    postType,
  };
}

/**
 * Validates and sanitizes YouTube URLs with anti-SSRF protections
 */
export function validateYouTubeUrl(inputUrl: string): ValidationResult {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return {
      isValid: false,
      error: { code: 'INVALID_URL', message: 'No URL provided.' },
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(inputUrl.trim());
  } catch {
    return {
      isValid: false,
      error: { code: 'INVALID_URL', message: 'Invalid URL format.' },
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const allowedHosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];

  if (!allowedHosts.includes(hostname)) {
    return {
      isValid: false,
      error: { code: 'UNSUPPORTED_PLATFORM', message: `Invalid host '${hostname}'. Only youtube.com and youtu.be are allowed.` },
    };
  }

  let videoId: string | null = null;
  const isShorts = parsed.pathname.includes('/shorts/');

  if (hostname === 'youtu.be') {
    videoId = parsed.pathname.replace(/^\//, '').split(/[\?\/]/)[0];
  } else if (isShorts) {
    const match = parsed.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/i);
    videoId = match ? match[1] : null;
  } else {
    videoId = parsed.searchParams.get('v');
  }

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return {
      isValid: false,
      error: { code: 'INVALID_URL', message: 'Could not find a valid 11-character YouTube video ID.' },
    };
  }

  const cleanUrl = isShorts
    ? `https://www.youtube.com/shorts/${videoId}`
    : `https://www.youtube.com/watch?v=${videoId}`;

  return {
    isValid: true,
    platform: 'youtube',
    cleanUrl,
    mediaId: videoId,
    postType: isShorts ? 'shorts' : 'video',
  };
}

/**
 * Validates and sanitizes Facebook URLs with anti-SSRF protections
 */
export function validateFacebookUrl(inputUrl: string): ValidationResult {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return {
      isValid: false,
      error: { code: 'INVALID_URL', message: 'No URL provided.' },
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(inputUrl.trim());
  } catch {
    return {
      isValid: false,
      error: { code: 'INVALID_URL', message: 'Invalid URL format.' },
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const allowedHosts = ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.watch'];

  if (!allowedHosts.includes(hostname)) {
    return {
      isValid: false,
      error: { code: 'UNSUPPORTED_PLATFORM', message: `Invalid host '${hostname}'. Only facebook.com and fb.watch are allowed.` },
    };
  }

  let mediaId: string | null = null;
  const isReel = parsed.pathname.includes('/reel/');

  if (hostname === 'fb.watch') {
    mediaId = parsed.pathname.replace(/^\//, '').split(/[\?\/]/)[0];
  } else if (parsed.searchParams.has('v')) {
    mediaId = parsed.searchParams.get('v');
  } else {
    const match = parsed.pathname.match(/\/(reel|videos|watch|share\/[vr])\/([0-9a-zA-Z_-]+)/i);
    mediaId = match ? match[2] : null;
  }

  if (!mediaId) {
    return {
      isValid: false,
      error: { code: 'INVALID_URL', message: 'Could not find a valid video ID in the Facebook URL.' },
    };
  }

  const cleanUrl = isReel
    ? `https://www.facebook.com/reel/${mediaId}/`
    : `https://www.facebook.com/watch/?v=${mediaId}`;

  return {
    isValid: true,
    platform: 'facebook',
    cleanUrl,
    mediaId,
    postType: isReel ? 'reel' : 'video',
  };
}

/**
 * Automatically detects platform and runs appropriate validator
 */
export function validateAnyMediaUrl(inputUrl: string): ValidationResult {
  const trimmed = (inputUrl || '').trim();
  if (trimmed.includes('instagram.com') || trimmed.includes('instagr.am')) {
    return validateInstagramUrl(trimmed);
  }
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
    return validateYouTubeUrl(trimmed);
  }
  if (trimmed.includes('facebook.com') || trimmed.includes('fb.watch')) {
    return validateFacebookUrl(trimmed);
  }

  return {
    isValid: false,
    error: {
      code: 'UNSUPPORTED_PLATFORM',
      message: 'Unsupported URL. Supported platforms: Instagram, YouTube, Facebook, X (Twitter).',
    },
  };
}
