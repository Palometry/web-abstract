import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { catchError, timeout } from 'rxjs/operators';
import { API_BASE_URL } from './api-config';

export type PublicService = {
  id: number;
  title: string;
  description: string;
  icon?: string | null;
  displayOrder?: number;
};

@Injectable({ providedIn: 'root' })
export class PublicServicesService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = API_BASE_URL;

  async getServices(): Promise<PublicService[]> {
    if (!this.isBrowser) {
      return [];
    }
    return this.safeGet<PublicService[]>(`${this.apiBaseUrl}/services/public`, []);
  }

  private async safeGet<T>(url: string, fallback: T): Promise<T> {
    try {
      return await firstValueFrom(
        this.http.get<T>(url).pipe(
          timeout(8000),
          catchError(() => of(fallback))
        )
      );
    } catch {
      return fallback;
    }
  }
}
