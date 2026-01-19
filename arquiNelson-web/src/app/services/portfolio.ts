import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { catchError, timeout } from 'rxjs/operators';

export type PortfolioSpec = {
  label: string;
  value: string;
};

export type PortfolioBlock = {
  type: 'text' | 'image';
  text?: string | null;
  src?: string | null;
  caption?: string | null;
  layout?: 'wide' | 'inline';
};

export type PortfolioListItem = {
  id: number;
  title: string;
  category: string | null;
  description: string | null;
  coverImage: string | null;
};

export type PortfolioItem = PortfolioListItem & {
  heroImages: string[];
  specs: PortfolioSpec[];
  tags: string[];
  blocks: PortfolioBlock[];
  gallery: string[];
  autocadUrl?: string | null;
};

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = 'http://localhost:4001/api/portfolio/public';

  async getItems(): Promise<PortfolioListItem[]> {
    if (!this.isBrowser) {
      return [];
    }
    return this.safeGet<PortfolioListItem[]>(this.apiBaseUrl, []);
  }

  async getById(id: number | string): Promise<PortfolioItem | null> {
    if (!this.isBrowser) {
      return null;
    }
    const numericId = typeof id === 'number' ? id : Number(id);
    if (!Number.isFinite(numericId)) {
      return null;
    }
    return this.safeGet<PortfolioItem | null>(`${this.apiBaseUrl}/${numericId}`, null);
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
