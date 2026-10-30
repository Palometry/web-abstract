import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

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

function buildCspHeader(nonce: string): string {
  const frontendOrigin = tryGetOrigin(process.env['ARQUI_FRONTEND_ORIGIN'] ?? '');
  const frontendSources = frontendOrigin ? [frontendOrigin] : [];
  const extraConnect = parseEnvList(process.env['ARQUI_CSP_CONNECT_SRC']);
  const extraMedia = parseEnvList(process.env['ARQUI_CSP_MEDIA_SRC']);
  const extraImages = parseEnvList(process.env['ARQUI_CSP_IMG_SRC']);
  const directives = [
    `default-src 'self' ${frontendSources.join(' ')}`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'self'`,
    `form-action 'self'`,
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'unsafe-inline'`,
    `font-src 'self' data:`,
    `worker-src 'self' blob:`,
    [
      'connect-src',
      "'self'",
      ...frontendSources,
      'http://localhost:4200',
      'ws://localhost:4200',
      ...extraConnect,
    ].join(' '),
    [
      'img-src',
      "'self'",
      'data:',
      'blob:',
      ...frontendSources,
      'https://images.unsplash.com',
      ...extraImages,
    ].join(' '),
    [
      'media-src',
      "'self'",
      'data:',
      'blob:',
      ...frontendSources,
      ...extraMedia,
    ].join(' '),
    [
      'frame-src',
      "'self'",
      ...frontendSources,
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

async function addCspNonce(response: Response, nonce: string): Promise<Response> {
  if (!response.headers.get('content-type')?.includes('text/html')) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  const html = (await response.text()).replace(
    /<script(?![^>]*\bnonce=)([^>]*)>/gi,
    `<script nonce="${nonce}"$1>`
  );

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const app = express();
app.disable('x-powered-by');
const angularApp = new AngularNodeAppEngine();
const backendOrigin = tryGetOrigin(
  process.env['ARQUI_BACKEND_ORIGIN'] ?? 'http://127.0.0.1:8000'
);

if (!backendOrigin) {
  throw new Error('ARQUI_BACKEND_ORIGIN must be a valid HTTP or HTTPS URL.');
}

// Security headers for SSR responses.
app.use((req, res, next) => {
  const cspNonce = randomBytes(18).toString('base64');
  res.locals['cspNonce'] = cspNonce;
  res.setHeader('Content-Security-Policy', buildCspHeader(cspNonce));
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  next();
});

app.use(
  createProxyMiddleware({
    pathFilter: ['/api', '/uploads'],
    target: backendOrigin,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: 120_000,
    timeout: 120_000,
    on: {
      proxyRes: (proxyResponse) => {
        delete proxyResponse.headers['host'];
        delete proxyResponse.headers['server'];
        delete proxyResponse.headers['x-powered-by'];
      },
    },
  })
);

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
  '/.well-known',
  express.static(join(browserDistFolder, '.well-known'), {
    maxAge: '1h',
    index: false,
    redirect: false,
    dotfiles: 'allow',
  }),
);

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    dotfiles: 'ignore',
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use(async (req, res, next) => {
  try {
    const response = await angularApp.handle(req);
    if (!response) {
      next();
      return;
    }

    const securedResponse = await addCspNonce(response, res.locals['cspNonce']);
    await writeResponseToNodeResponse(securedResponse, res);
  } catch (error) {
    next(error);
  }
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



