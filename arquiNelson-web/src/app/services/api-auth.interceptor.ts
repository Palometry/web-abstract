import { HttpInterceptorFn } from '@angular/common/http';
import { API_BASE_URL } from './api-config';
import { ADMIN_AUTH_STORAGE_KEYS } from './admin-auth';

const TRUSTED_FRONTEND_HEADER = 'X-Arqui-Admin-Request';
const TRUSTED_FRONTEND_VALUE = '1';

export const apiAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL)) {
    return next(req);
  }

  const shouldAttachTrustedHeader = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const storedToken = typeof localStorage !== 'undefined'
    ? localStorage.getItem(ADMIN_AUTH_STORAGE_KEYS.token)
    : null;
  const storedExpiresAt = typeof localStorage !== 'undefined'
    ? localStorage.getItem(ADMIN_AUTH_STORAGE_KEYS.expiresAt)
    : null;
  const hasValidStoredSession =
    !!storedToken &&
    !!storedExpiresAt &&
    Number.isFinite(Date.parse(storedExpiresAt)) &&
    Date.parse(storedExpiresAt) > Date.now();

  const setHeaders: Record<string, string> = shouldAttachTrustedHeader
    ? { [TRUSTED_FRONTEND_HEADER]: TRUSTED_FRONTEND_VALUE }
    : {};

  if (hasValidStoredSession && storedToken) {
    setHeaders['Authorization'] = `Bearer ${storedToken}`;
  }

  return next(
    req.clone({
      withCredentials: true,
      setHeaders,
    })
  );
};
