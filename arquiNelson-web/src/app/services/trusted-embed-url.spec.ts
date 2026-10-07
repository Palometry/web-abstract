import { describe, expect, it } from 'vitest';
import { getTrustedEmbedUrl } from './trusted-embed-url';

describe('getTrustedEmbedUrl', () => {
  it('accepts HTTPS URLs from the expected provider', () => {
    expect(getTrustedEmbedUrl('https://www.google.com/maps/embed?pb=test', 'maps')).toContain(
      'https://www.google.com/maps/embed'
    );
    expect(getTrustedEmbedUrl('https://www.youtube-nocookie.com/embed/video-id', 'video')).toBe(
      'https://www.youtube-nocookie.com/embed/video-id'
    );
    expect(getTrustedEmbedUrl('https://myhub.autodesk.com/viewer', 'autodesk')).toBe(
      'https://myhub.autodesk.com/viewer'
    );
  });

  it('extracts and validates an iframe source', () => {
    expect(
      getTrustedEmbedUrl(
        '<iframe src="https://player.vimeo.com/video/123" allowfullscreen></iframe>',
        'video'
      )
    ).toBe('https://player.vimeo.com/video/123');
  });

  it('rejects unsafe protocols and deceptive hosts', () => {
    expect(getTrustedEmbedUrl('javascript:alert(1)', 'video')).toBeNull();
    expect(getTrustedEmbedUrl('http://www.youtube.com/embed/video-id', 'video')).toBeNull();
    expect(getTrustedEmbedUrl('https://youtube.com.example.org/embed/video-id', 'video')).toBeNull();
    expect(getTrustedEmbedUrl('https://evilgoogle.com/maps/embed', 'maps')).toBeNull();
  });

  it('does not accept a trusted host for the wrong provider', () => {
    expect(getTrustedEmbedUrl('https://www.youtube.com/embed/video-id', 'maps')).toBeNull();
  });
});
