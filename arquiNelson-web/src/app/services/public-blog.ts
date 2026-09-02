import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { catchError, timeout } from 'rxjs/operators';
import { API_BASE_URL } from './api-config';

export type PublicBlogPost = {
  id: number;
  title: string;
  slug: string;
  contentType?: 'article' | 'external' | string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  externalUrl?: string | null;
  externalPlatform?: string | null;
  externalAccount?: string | null;
  externalCta?: string | null;
};

export type PublicBlogDetail = PublicBlogPost & {
  content?: string | null;
};

@Injectable({ providedIn: 'root' })
export class PublicBlogService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = `${API_BASE_URL}/blog/public`;

  async getPosts(): Promise<PublicBlogPost[]> {
    if (!this.isBrowser) {
      return [];
    }
    return this.safeGet<PublicBlogPost[]>(this.apiBaseUrl, []);
  }

  async getPost(slug: string): Promise<PublicBlogDetail | null> {
    if (!this.isBrowser) {
      return null;
    }
    if (!slug) {
      return null;
    }
    return this.safeGet<PublicBlogDetail | null>(`${this.apiBaseUrl}/${slug}`, null);
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
