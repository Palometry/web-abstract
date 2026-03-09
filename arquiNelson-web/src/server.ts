import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Global CSP header for all responses (allow localhost and active tunnel domains)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; connect-src 'self' http://localhost:4200 ws://localhost:4200 http://localhost:8000 http://127.0.0.1:8000 https://soundtrack-investor-transmitted-declaration.trycloudflare.com https://manhattan-home-camera-orange.trycloudflare.com https://*.brs.devtunnels.ms https://*.trycloudflare.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: http://localhost:8000 http://127.0.0.1:8000 https://manhattan-home-camera-orange.trycloudflare.com https://images.unsplash.com https://*.brs.devtunnels.ms https://*.trycloudflare.com; media-src 'self' data: http://localhost:8000 http://127.0.0.1:8000 http://localhost:4001 http://127.0.0.1:4001 https://manhattan-home-camera-orange.trycloudflare.com https://*.brs.devtunnels.ms https://*.trycloudflare.com; frame-src 'self' https://a360.co https://*.autodesk.com https://*.a360.autodesk.com https://*.autodesk360.com https://myhub.autodesk360.com https://www.google.com https://maps.google.com https://www.youtube.com https://youtube.com https://youtu.be https://www.youtube-nocookie.com https://player.vimeo.com https://vimeo.com;"
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



