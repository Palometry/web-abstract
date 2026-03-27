import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const defaultApiOrigin = 'https://biotechnology-limit-especially-multiple.trycloudflare.com';
const defaultFrontendOrigin = 'https://boxes-brooks-coupons-regard.trycloudflare.com';

function parseEnvList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function tryGetOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function buildCspHeader(): string {
  const apiOrigin = tryGetOrigin(process.env['ARQUI_API_BASE_URL'] ?? '') ?? defaultApiOrigin;
  const frontendOrigin =
    tryGetOrigin(process.env['ARQUI_FRONTEND_ORIGIN'] ?? '') ?? defaultFrontendOrigin;
  const extraConnect = parseEnvList(process.env['ARQUI_CSP_CONNECT_SRC']);
  const extraMedia = parseEnvList(process.env['ARQUI_CSP_MEDIA_SRC']);
  const extraImages = parseEnvList(process.env['ARQUI_CSP_IMG_SRC']);
  const directives = [
    `default-src 'self' ${frontendOrigin}`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'self'`,
    `form-action 'self'`,
    `script-src 'self' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
    `font-src 'self' data:`,
    `worker-src 'self' blob:`,
    [
      'connect-src',
      "'self'",
      frontendOrigin,
      'http://localhost:4200',
      'ws://localhost:4200',
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      apiOrigin,
      ...extraConnect,
    ].join(' '),
    [
      'img-src',
      "'self'",
      'data:',
      'blob:',
      frontendOrigin,
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      apiOrigin,
      'https://images.unsplash.com',
      ...extraImages,
    ].join(' '),
    [
      'media-src',
      "'self'",
      'data:',
      'blob:',
      frontendOrigin,
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      'http://localhost:4001',
      'http://127.0.0.1:4001',
      apiOrigin,
      ...extraMedia,
    ].join(' '),
    [
      'frame-src',
      "'self'",
      frontendOrigin,
      'https://a360.co',
      'https://*.autodesk.com',
      'https://*.a360.autodesk.com',
      'https://*.autodesk360.com',
      'https://myhub.autodesk360.com',
      'https://www.google.com',
      'https://maps.google.com',
      'https://www.youtube.com',
      'https://youtube.com',
      'https://youtu.be',
      'https://www.youtube-nocookie.com',
      'https://player.vimeo.com',
      'https://vimeo.com',
    ].join(' '),
  ];

  return directives.join('; ');
}

const app = express();
const angularApp = new AngularNodeAppEngine();

// Security headers for SSR responses.
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', buildCspHeader());
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  next();
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    dotfiles: 'allow',
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});
/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);



