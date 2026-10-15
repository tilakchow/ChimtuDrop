/**
 * Formats byte count to human-readable string (KB, MB, GB)
 */
export function formatBytes(bytes?: number, decimals: number = 1): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) {
    return 'Unknown size';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format timestamp into human-readable download date & time
 * Always prioritizes recent download status ("Just now", "5m ago", "Today", etc.)
 */
export function formatDate(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) {
    return 'Just now';
  }

  // Handle seconds vs milliseconds if passed
  const ts = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // If download was within the last minute or slight clock drift
  if (diffMs <= 60 * 1000) {
    return 'Just now';
  }

  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const mins = Math.max(1, Math.round(diffMs / (1000 * 60)));
    return `${mins}m ago`;
  }

  if (diffHours < 24) {
    return `${Math.round(diffHours)}h ago`;
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Get media file extension from URI or filename
 */
export function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}
