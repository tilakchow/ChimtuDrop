import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { mediaResolver } from './resolver';
import { HealthResponse } from './types';

export const app = express();

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// In-memory basic rate limiter (prevents rapid-fire denial-of-service)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;

app.use((req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now > entry.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please slow down and try again later.',
      },
    });
  }

  entry.count += 1;
  next();
});

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Error response formatter
function sendError(res: Response, err: any) {
  const code = err.code || 'UNKNOWN';
  const message = err.message || 'An unexpected error occurred while resolving media.';
  const details = err.details;
  const requiresConfiguration = err.requiresConfiguration;

  let statusCode = 500;
  if (code === 'INVALID_URL' || code === 'UNSUPPORTED_PLATFORM') {
    statusCode = 400;
  } else if (code === 'EXPIRED_OR_DELETED') {
    statusCode = 404;
  } else if (code === 'PRIVATE_OR_INACCESSIBLE' || code === 'AUTHENTICATION_REQUIRED') {
    statusCode = 403;
  } else if (code === 'RATE_LIMITED') {
    statusCode = 429;
  } else if (code === 'PROVIDER_UNAVAILABLE' || code === 'API_KEY_REQUIRED') {
    statusCode = 503;
  }

  return res.status(statusCode).json({
    error: {
      code,
      message,
      details,
      requiresConfiguration,
    },
  });
}

// Health check endpoint
const handleHealth = (_req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'ok',
    service: 'ClipDrop Multi-Platform Media Retrieval Backend',
    version: '2.0.0',
    timestamp: Date.now(),
    configuredProviders: mediaResolver.getConfiguredProviderNames(),
  };
  res.status(200).json(response);
};

app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

// Universal resolve endpoint
const handleResolve = async (req: Request, res: Response) => {
  const rawUrl = (req.query.url as string) || (req.query.link as string);
  if (!rawUrl) {
    return res.status(400).json({
      error: { code: 'INVALID_URL', message: "Missing 'url' query parameter." },
    });
  }
  try {
    const metadata = await mediaResolver.resolveAny(rawUrl);
    return res.status(200).json(metadata);
  } catch (err: any) {
    return sendError(res, err);
  }
};

app.get('/resolve', handleResolve);
app.get('/api/resolve', handleResolve);

// Instagram endpoint
const handleInstagram = async (req: Request, res: Response) => {
  const rawUrl = (req.query.url as string) || (req.query.link as string);
  const mediaId = req.query.id as string;
  let targetUrl = rawUrl;
  if (!targetUrl && mediaId) {
    targetUrl = `https://www.instagram.com/reel/${mediaId}/`;
  }
  if (!targetUrl) {
    return res.status(400).json({
      error: { code: 'INVALID_URL', message: "Missing 'url' or 'id' query parameter." },
    });
  }
  try {
    const metadata = await mediaResolver.resolveInstagram(targetUrl);
    return res.status(200).json(metadata);
  } catch (err: any) {
    return sendError(res, err);
  }
};

app.get('/instagram', handleInstagram);
app.get('/api/instagram', handleInstagram);

// YouTube endpoint
const handleYouTube = async (req: Request, res: Response) => {
  const rawUrl = (req.query.url as string) || (req.query.link as string);
  const videoId = req.query.id as string;
  let targetUrl = rawUrl;
  if (!targetUrl && videoId) {
    targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
  }
  if (!targetUrl) {
    return res.status(400).json({
      error: { code: 'INVALID_URL', message: "Missing 'url' or 'id' query parameter." },
    });
  }
  try {
    const metadata = await mediaResolver.resolveYouTube(targetUrl);
    return res.status(200).json(metadata);
  } catch (err: any) {
    return sendError(res, err);
  }
};

app.get('/youtube', handleYouTube);
app.get('/api/youtube', handleYouTube);

// Facebook endpoint
const handleFacebook = async (req: Request, res: Response) => {
  const rawUrl = (req.query.url as string) || (req.query.link as string);
  const mediaId = req.query.id as string;
  let targetUrl = rawUrl;
  if (!targetUrl && mediaId) {
    targetUrl = `https://www.facebook.com/watch/?v=${mediaId}`;
  }
  if (!targetUrl) {
    return res.status(400).json({
      error: { code: 'INVALID_URL', message: "Missing 'url' or 'id' query parameter." },
    });
  }
  try {
    const metadata = await mediaResolver.resolveFacebook(targetUrl);
    return res.status(200).json(metadata);
  } catch (err: any) {
    return sendError(res, err);
  }
};

app.get('/facebook', handleFacebook);
app.get('/api/facebook', handleFacebook);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'INVALID_URL',
      message: `Endpoint ${req.method} ${req.path} not found on ClipDrop server.`,
    },
  });
});

if (require.main === module) {
  app.listen(config.port, config.host, () => {
    console.log(`=========================================`);
    console.log(`🚀 ClipDrop Multi-Platform Server running`);
    console.log(`   Host: http://${config.host}:${config.port}`);
    console.log(`   Local: http://localhost:${config.port}`);
    console.log(`   Configured Providers: [${mediaResolver.getConfiguredProviderNames().join(', ')}]`);
    console.log(`   Supported: Instagram, YouTube, Facebook, X (Twitter)`);
    console.log(`=========================================`);
  });
}
