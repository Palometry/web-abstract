const DEFAULT_API_BASE_URL =
  'https://biotechnology-limit-especially-multiple.trycloudflare.com/api';

function readApiBaseUrl(): string {
  if (typeof document !== 'undefined') {
    const fromMeta = document
      .querySelector<HTMLMetaElement>('meta[name="arqui-api-base"]')
      ?.content?.trim();
    if (fromMeta) {
      return fromMeta;
    }
  }

  if (typeof window !== 'undefined' && (window as any).__ARQUI_API_BASE__) {
    return String((window as any).__ARQUI_API_BASE__).trim();
  }

  return DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = readApiBaseUrl();

export const API_PUBLIC_PORTFOLIO_BASE = `${API_BASE_URL}/portfolio/public`;

