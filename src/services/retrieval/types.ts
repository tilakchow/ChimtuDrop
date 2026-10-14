import { SupportedPlatform, RetrievalResult } from '../../types/media';

export interface RetrievalConfig {
  backendEndpoint?: string;
  apiKey?: string;
}

export interface MediaProviderAdapter {
  readonly platform: SupportedPlatform;
  canHandle(url: string): boolean;
  extractId(url: string): string | null;
  fetchMetadata(url: string, config?: RetrievalConfig): Promise<RetrievalResult>;
}
