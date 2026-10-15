import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory or root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigin: string;
  rapidApiKey?: string;
  rapidApiHost: string;
  rapidApiEndpoint?: string;
  metaAppAccessToken?: string;
  enableTestProvider: boolean;
  requestTimeoutMs: number;
}

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rapidApiKey: process.env.RAPIDAPI_KEY?.trim() || undefined,
  rapidApiHost: process.env.RAPIDAPI_HOST?.trim() || 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com',
  rapidApiEndpoint: process.env.RAPIDAPI_ENDPOINT?.trim() || undefined,
  metaAppAccessToken: process.env.META_APP_ACCESS_TOKEN?.trim() || undefined,
  enableTestProvider: process.env.ENABLE_TEST_PROVIDER !== 'false', // enabled by default for development/verification
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '15000', 10),
};
