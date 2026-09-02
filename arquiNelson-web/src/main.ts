import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

if (typeof window !== 'undefined') {
  window.dFlipLocation = '/dflip/';
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
