import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { catchError, timeout } from 'rxjs/operators';
import { API_BASE_URL } from './api-config';

export type PublicProject = {
  id: number;
  slug?: string | null;
  title: string;
  shortDesc: string;
  image: string;
  thumbImage: string;
  createdAt?: string | null;
  classification?: string;
  category?: string;
  scope?: string;
  brochurePdfUrl?: string | null;
  brochureCoverUrl?: string | null;
  masterplanImage?: string | null;
  heroVideoUrl?: string | null;
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
  units: number | null;
  amenities: string[];
  startYear: number;
  deliveryYear: number;
  description: string;
  bannerImages?: string[];
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
  private readonly requestTimeoutMs = 20000;
  private projectsCache: PublicProject[] | null = null;
  private projectsRequest: Promise<PublicProject[]> | null = null;

  async getProjects(): Promise<PublicProject[]> {
    if (!this.isBrowser) {
      return [];
    }

    if (this.projectsCache?.length) {
      return this.projectsCache;
    }

    if (this.projectsRequest) {
      return this.projectsRequest;
    }

    // Header, hero, home and /projects can request the same list at once.
    this.projectsRequest = this.safeGet<PublicProject[]>(`${this.apiBaseUrl}/projects/public`, [])
      .then((projects) => {
        if (projects.length) {
          this.projectsCache = projects;
        }

        return projects;
      })
      .finally(() => {
        this.projectsRequest = null;
      });

    return this.projectsRequest;
  }

  async getProjectById(id: number | string): Promise<PublicProject | null> {
    if (!this.isBrowser) {
      return null;
    }
    return this.safeGet<PublicProject | null>(`${this.apiBaseUrl}/projects/public/${id}`, null);
  }

  private async safeGet<T>(url: string, fallback: T): Promise<T> {
    try {
      return await firstValueFrom(
        this.http.get<T>(url).pipe(
          timeout(this.requestTimeoutMs),
          catchError(() => of(fallback))
        )
      );
    } catch {
      return fallback;
    }
  }
}
