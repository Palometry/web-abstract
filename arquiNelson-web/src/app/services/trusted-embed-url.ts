export type EmbedProvider = 'maps' | 'video' | 'autodesk';

const PROVIDER_HOSTS: Record<EmbedProvider, string[]> = {
  maps: ['google.com'],
  video: ['youtube.com', 'youtube-nocookie.com', 'youtu.be', 'vimeo.com'],
  autodesk: ['a360.co', 'autodesk.com', 'a360.autodesk.com', 'autodesk360.com'],
};

function extractSource(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.toLowerCase().includes('<iframe')) {
    return trimmed;
  }

  return trimmed.match(/src=["']([^"']+)["']/i)?.[1]?.trim() ?? '';
}

function matchesAllowedHost(hostname: string, allowedHost: string): boolean {
  return hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);
}

export function getTrustedEmbedUrl(
  value: string | null | undefined,
  provider: EmbedProvider
): string | null {
  const source = value ? extractSource(value) : '';
  if (!source) {
    return null;
  }

  try {
    const url = new URL(source);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    const isAllowedHost = PROVIDER_HOSTS[provider].some((host) =>
      matchesAllowedHost(hostname, host)
    );

    return url.protocol === 'https:' && isAllowedHost ? url.toString() : null;
  } catch {
    return null;
  }
}
