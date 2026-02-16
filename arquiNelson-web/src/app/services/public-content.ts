import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-config';

export type PublicPageBlock = {
  id: number;
  blockType: string;
  content: any;
  sortOrder: number;
  isVisible: boolean;
};

export type PublicPageSection = {
  id: number;
  sectionKey: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
  blocks: PublicPageBlock[];
};

export type PublicPageDetail = {
  id: number;
  title: string;
  slug: string;
  status: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  sections: PublicPageSection[];
};

@Injectable({ providedIn: 'root' })
export class PublicContentService {
  private readonly apiBaseUrl = API_BASE_URL;

  constructor(private http: HttpClient) {}

  async getHomePage(): Promise<PublicPageDetail | null> {
    try {
      return await firstValueFrom(
        this.http.get<PublicPageDetail>(`${this.apiBaseUrl}/pages/public/home`)
      );
    } catch {
      return null;
    }
  }

  async getPageBySlug(slug: string): Promise<PublicPageDetail | null> {
    try {
      return await firstValueFrom(
        this.http.get<PublicPageDetail>(`${this.apiBaseUrl}/pages/public/${slug}`)
      );
    } catch {
      return null;
    }
  }
}
