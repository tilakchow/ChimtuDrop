/**
 * Generate clean, sensible filenames using the media title or timestamp.
 * Preserves original content context without forcing app name prefixes.
 * Examples:
 *   - funny_dog_reel.mp4
 *   - media_20261015_153000.mp4
 *   - vacation_photo.jpg
 */
let lastGeneratedTimestamp = '';
let sequenceCounter = 0;

export function generateCleanFilename(
  title?: string,
  mediaType: 'video' | 'image' | string = 'video',
  extension?: string
): string {
  // Determine appropriate clean extension
  let ext = extension ? extension.replace(/^\./, '').toLowerCase() : '';
  if (!ext || ext === 'unknown') {
    ext = mediaType === 'image' ? 'jpg' : 'mp4';
  }

  // If a descriptive title is available, sanitize and use it
  if (title && title.trim().length > 0) {
    const cleaned = title
      .replace(/^(video|post|reel|tweet)\s+by\s+[^:\n_]+/i, '')
      .replace(/https?:\/\/\S+/gi, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 45);

    if (
      cleaned.length > 2 &&
      cleaned !== 'video' &&
      cleaned !== 'post' &&
      cleaned !== 'reel' &&
      cleaned !== 'tweet' &&
      cleaned !== 'media' &&
      cleaned !== 'media_ready'
    ) {
      return `${cleaned}.${ext}`;
    }
  }

  // Fallback to sensible timestamp format: media_YYYYMMDD_HHMMSS
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const baseTimestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;

  let suffix = '';
  if (baseTimestamp === lastGeneratedTimestamp) {
    sequenceCounter += 1;
    suffix = `_${String(sequenceCounter).padStart(2, '0')}`;
  } else {
    lastGeneratedTimestamp = baseTimestamp;
    sequenceCounter = 0;
  }

  return `media_${baseTimestamp}${suffix}.${ext}`;
}

// Backward-compatible alias
export const generateChimtuFilename = (
  mediaType: 'video' | 'image' | string = 'video',
  extension?: string,
  title?: string
) => generateCleanFilename(title, mediaType, extension);
