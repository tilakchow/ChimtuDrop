import { MediaMetadata } from '../types';

export interface InstagramProvider {
  readonly name: string;
  isConfigured(): boolean;
  resolve(cleanUrl: string, mediaId: string, postType: string): Promise<MediaMetadata>;
}
