import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { API_BASE_URL } from './api-config';

export type StoreProduct = {
  id: number;
  code: string;
  title: string;
  category: string;
  software: string;
  priceFrom: number;
  currency?: string;
  delivery: string;
  format: string;
  support: string;
  idealFor: string;
  description: string;
  longDescription: string;
  includes: string[];
  extraDetails: { label: string; value: string }[];
  imageUrl?: string | null;
  accent: string;
  surface?: string;
  glow?: string;
  sortOrder?: number;
  isActive?: boolean;
};

@Injectable({ providedIn: 'root' })
export class PublicStoreService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);

  async getProducts(): Promise<StoreProduct[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    return firstValueFrom(
      this.http.get<StoreProduct[]>(`${API_BASE_URL}/store/products/public`).pipe(
        timeout(10000),
        catchError(() => of([]))
      )
    );
  }
}
