export const API_BASE_URL =
  (typeof window !== 'undefined' && (window as any).__ARQUI_API_BASE__) ||
  'https://sectors-potatoes-sparc-steven.trycloudflare.com/api';

export const API_PUBLIC_PORTFOLIO_BASE = `${API_BASE_URL}/portfolio/public`;

