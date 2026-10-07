import { HttpInterceptorFn } from '@angular/common/http';
import { API_BASE_URL } from './api-config';

const TRUSTED_FRONTEND_HEADER = 'X-Arqui-Admin-Request';
const TRUSTED_FRONTEND_VALUE = '1';

export const apiAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL)) {
    return next(req);
  }

  const shouldAttachTrustedHeader = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const setHeaders: Record<string, string> = shouldAttachTrustedHeader
    ? { [TRUSTED_FRONTEND_HEADER]: TRUSTED_FRONTEND_VALUE }
    : {};

  return next(
    req.clone({
      withCredentials: true,
      setHeaders,
    })
  );
};
