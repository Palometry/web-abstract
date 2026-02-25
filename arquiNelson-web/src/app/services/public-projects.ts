import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { catchError, timeout } from 'rxjs/operators';
import { API_BASE_URL } from './api-config';

export type PublicProject = {
  id: number;
  title: string;
  shortDesc: string;
  image: string;
  thumbImage: string;
  masterplanImage?: string | null;
  houseModels?: {
    name: string;
    description?: string | null;
    rooms?: number | null;
    features?: string[];
    images?: string[];
    image?: string | null;
  }[];
  housePlans?: { name: string; ambientes: number; totalArea: string; coveredArea: string; image: string }[];
  autocad360Url?: string | null;
  mapUrl?: string | null;
  mapEmbedUrl?: string | null;
  enjoyAreas?: string[];
  location: string;
  promoter: string;
  status: string;
  type: string;
  landArea: string;
  units: number;
  amenities: string[];
  startYear: number;
  deliveryYear: number;
  description: string;
  gallery: string[];
  lots?: { id: string; area: string; status: 'Disponible' | 'Reservado' | 'Vendido' }[];
  videos?: {
    id: number;
    fileUrl: string;
    title?: string | null;
    description?: string | null;
    mimeType?: string | null;
    sortOrder?: number;
  }[];
};

@Injectable({ providedIn: 'root' })
export class PublicProjectsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = API_BASE_URL;

  async getProjects(): Promise<PublicProject[]> {
    if (!this.isBrowser) {
      return [];
    }
    return this.safeGet<PublicProject[]>(`${this.apiBaseUrl}/projects/public`, []);
  }

  async getProjectById(id: number): Promise<PublicProject | null> {
    if (!this.isBrowser) {
      return null;
    }
    return this.safeGet<PublicProject | null>(`${this.apiBaseUrl}/projects/public/${id}`, null);
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
