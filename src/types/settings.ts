export type ThemeMode = 'system' | 'light' | 'dark';

export interface AppSettings {
  themeMode: ThemeMode;
  autoSaveToGallery: boolean;
  preferredVideoQuality: 'high' | 'medium' | 'low';
  customBackendEndpoint?: string;
  customApiKey?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'system',
  autoSaveToGallery: true,
  preferredVideoQuality: 'high',
  customBackendEndpoint: 'http://192.168.88.6:8000',
};
