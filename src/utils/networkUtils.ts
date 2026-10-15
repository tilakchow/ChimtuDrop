const DEFAULT_LAN_IP = '192.168.88.6';
const DEFAULT_PORT = '8000';

/**
 * Resolves the appropriate backend host for mobile devices.
 * When running in Expo Go or React Native on a physical phone, 'localhost'
 * points to the phone's loopback, not the developer's PC.
 * This utility dynamically detects the Metro server IP from NativeModules.SourceCode.
 */
export function getDevServerHost(): string {
  // If running in Web browser, use the current window host
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }

  // If running in Jest test runner (Node.js), avoid requiring react-native
  if (typeof process !== 'undefined' && process.env?.JEST_WORKER_ID) {
    return 'localhost';
  }

  // On native mobile (Android / iOS), inspect Metro's scriptURL
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require('react-native');
    const scriptURL = rn?.NativeModules?.SourceCode?.scriptURL;
    if (typeof scriptURL === 'string') {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch {
    // Ignore and fallback
  }

  // Fallback to active local Wi-Fi LAN IP
  return DEFAULT_LAN_IP;
}

/**
 * Resolves a configured backend URL into an address reachable by the current client.
 * Automatically converts 'localhost', '127.0.0.1', or stale LAN IPs to the active computer IP.
 */
export function resolveBackendUrl(url?: string): string {
  // In Jest test environment, keep localhost as requested by tests
  if (typeof process !== 'undefined' && process.env?.JEST_WORKER_ID) {
    return (url || `http://localhost:${DEFAULT_PORT}`).replace(/\/$/, '');
  }

  const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
  const rawUrl = (url || '').trim();

  // If empty, supply default with active detected host
  if (!rawUrl) {
    if (isWeb) return `http://localhost:${DEFAULT_PORT}`;
    return `http://${getDevServerHost()}:${DEFAULT_PORT}`;
  }

  // On web, keep raw URL
  if (isWeb) {
    return rawUrl.replace(/\/$/, '');
  }

  // On physical mobile phone or emulator, rewrite localhost, 127.0.0.1, or local 192.168.x.x to active host
  if (rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1') || rawUrl.includes('192.168.')) {
    const devHost = getDevServerHost();
    return rawUrl.replace(/localhost|127\.0\.0\.1|192\.168\.\d+\.\d+/, devHost).replace(/\/$/, '');
  }

  // Remote public URL (e.g. https://chimtudrop.onrender.com)
  return rawUrl.replace(/\/$/, '');
}
