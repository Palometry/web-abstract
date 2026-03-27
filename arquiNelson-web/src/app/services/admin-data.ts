import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { isPlatformBrowser } from '@angular/common';
import { catchError, timeout } from 'rxjs/operators';

export type AdminPage = {
  id: number;
  title: string;
  slug: string;
  status: 'draft' | 'published' | string;
  isHome?: boolean;
  sections: number;
};

export type AdminPageDetail = {
  id: number;
  title: string;
  slug: string;
  status: 'draft' | 'published' | string;
  isHome?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  sections: AdminPageSection[];
};

export type AdminPageSection = {
  id: number;
  sectionKey: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
  blocks: AdminPageBlock[];
};

export type AdminPageBlock = {
  id: number;
  blockType: string;
  content: unknown;
  sortOrder: number;
  isVisible: boolean;
};

export type AdminProject = {
  id: number;
  name: string;
  clientName: string;
  address: string;
  status: string;
  portfolio: boolean;
};

export type AdminProjectDetails = {
  shortDesc?: string | null;
  bannerImages?: string[];
  heroVideoUrl?: string | null;
  promoter?: string | null;
  publicScope?: string | null;
  publicStatus?: string | null;
  publicType?: string | null;
  publicClassification?: string | null;
  publicCategory?: string | null;
  location?: string | null;
  landArea?: string | null;
  units?: number | null;
  amenities?: string[];
  startYear?: number | null;
  deliveryYear?: number | null;
  autocadUrl?: string | null;
  brochurePdfUrl?: string | null;
  mapUrl?: string | null;
  mapEmbedUrl?: string | null;
  masterplanImage?: string | null;
  gallery?: string[];
  enjoyAreas?: string[];
  houseModels?: {
    name: string;
    description?: string | null;
    rooms?: number | null;
    features?: string[];
    images?: string[];
    image?: string | null;
  }[];
  housePlans?: {
    name: string;
    ambientes: number;
    totalArea: string;
    coveredArea: string;
    image: string;
  }[];
  lots?: { id: string; area: string; status: 'Disponible' | 'Reservado' | 'Vendido' }[];
};

export type AdminProjectCatalog = {
  scopes: string[];
  edificaciones: Record<string, Record<string, string[]>>;
  habilitaciones: Record<string, string[]>;
};

export type AdminProjectDetail = AdminProject & {
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  slug?: string | null;
  details?: AdminProjectDetails | null;
  images: AdminProjectImage[];
  videos: AdminProjectVideo[];
  portfolioEntry: AdminPortfolioEntryDetail | null;
};

export type AdminProjectImage = {
  id: number;
  fileUrl: string;
  title: string | null;
  altText: string | null;
  isCover: boolean;
  sortOrder: number;
};

export type AdminProjectVideo = {
  id: number;
  fileUrl: string;
  title: string | null;
  description: string | null;
  mimeType?: string | null;
  sortOrder: number;
};

export type AdminPortfolioEntryDetail = {
  id: number;
  titleOverride: string | null;
  sortOrder: number;
  isVisible: boolean;
};

export type AdminPortfolioEntry = {
  id: number;
  projectId: number | null;
  order: number;
  project: string;
  visible: boolean;
  titleOverride: string | null;
};

export type AdminPortfolioImage = {
  id: number;
  mediaId: number;
  fileUrl: string;
  imageType: 'cover' | 'hero' | 'gallery';
  sortOrder: number;
  title?: string | null;
  altText?: string | null;
};

export type AdminPortfolioSpec = {
  id: number;
  label: string;
  value: string;
  sortOrder: number;
};

export type AdminPortfolioBlock = {
  id: number;
  blockType: 'text' | 'image' | 'video';
  textContent?: string | null;
  mediaId?: number | null;
  fileUrl?: string | null;
  caption?: string | null;
  layout?: 'wide' | 'inline';
  sortOrder: number;
  isVisible: boolean;
};

export type AdminPortfolioDetail = {
  id: number;
  projectId: number | null;
  projectName: string | null;
  titleOverride: string | null;
  category: string | null;
  summary: string | null;
  autocadUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
  images: {
    cover: AdminPortfolioImage | null;
    hero: AdminPortfolioImage[];
    gallery: AdminPortfolioImage[];
  };
  specs: AdminPortfolioSpec[];
  tags: { id: number; tag: string; sortOrder: number }[];
  blocks: AdminPortfolioBlock[];
};

type UploadMediaOptions = {
  title?: string;
  altText?: string;
  onProgress?: (progress: number) => void;
};

export type AdminBlogPost = {
  id: number;
  title: string;
  slug: string;
  status: 'draft' | 'published' | string;
  publishedAt?: string | null;
  createdAt?: string | null;
};

export type AdminBlogDetail = {
  id: number;
  title: string;
  slug: string;
  status: 'draft' | 'published' | string;
  publishedAt?: string | null;
  excerpt?: string | null;
  content?: string | null;
  coverImageUrl?: string | null;
};

export type AdminQuote = {
  id: number;
  fullName: string;
  projectName: string;
  areaM2: number;
  totalCost: number;
  status: string;
  currency: string;
  createdAt?: string;
};

export type AdminQuoteService = {
  id: number;
  serviceId: number;
  name: string;
  pricingType: 'flat' | 'per_m2' | 'percent';
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type AdminQuoteDetail = {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  documentType?: string | null;
  documentNumber?: string | null;
  projectName: string;
  projectAddress?: string | null;
  areaM2: number;
  areaCoveredM2?: number | null;
  areaUncoveredPercent?: number | null;
  floorCount?: number | null;
  baseRatePerM2: number;
  baseCost: number;
  extrasCost: number;
  totalCost: number;
  currency: string;
  status: string;
  notes: string | null;
  createdAt?: string;
  expiresAt?: string | null;
  planName?: string | null;
  planMinDays?: number | null;
  planMaxDays?: number | null;
  pricingRateId?: number | null;
  pricingRateName?: string | null;
  services: AdminQuoteService[];
};

export type AdminQuoteServiceOption = {
  id: number;
  name: string;
  pricingType: 'flat' | 'per_m2' | 'percent';
  price: number;
  currency: string;
  isAddon: boolean;
  isActive: boolean;
};

export type AdminPricingRateOption = {
  id: number;
  name: string;
  basePricePerM2: number;
  currency: string;
  minDays?: number | null;
  maxDays?: number | null;
  isActive: boolean;
};

export type AdminService = {
  id: number;
  name: string;
  description: string;
  icon: string | null;
  displayOrder: number;
  public: boolean;
  isAddon: boolean;
  pricingType: 'flat' | 'per_m2' | 'percent';
  price: number;
  currency: string;
  isActive: boolean;
};

export type AdminServiceListItem = {
  id: number;
  name: string;
  description: string;
  public: boolean;
  isActive: boolean;
};

export type AdminServiceDetail = AdminService;

export type AdminDashboardActivity = {
  type: string;
  message: string;
  happenedAt: string;
};

export type AdminDashboardStats = {
  activeProjects: number;
  newQuotes: number;
  sentQuotes: number;
  publishedPages: number;
};

export type AdminPublicDashboardStats = {
  activeProjects: number;
  newQuotes: number;
};

export type AdminDashboardData = {
  stats: AdminDashboardStats;
  activity: AdminDashboardActivity[];
};

@Injectable({ providedIn: 'root' })
export class AdminDataService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = API_BASE_URL;

  async getPages(): Promise<AdminPage[]> {
    if (!this.isBrowser) {
      return [];
    }
    return this.safeGet<AdminPage[]>(`${this.apiBaseUrl}/pages`, []);
  }

  async getPageDetail(pageId: number): Promise<AdminPageDetail | null> {
    if (!this.isBrowser) {
      return null;
    }
    return this.safeGet<AdminPageDetail | null>(`${this.apiBaseUrl}/pages/${pageId}`, null);
  }

  async createPage(payload: {
    title: string;
    slug: string;
    status: string;
    isHome?: boolean;
    metaTitle?: string;
    metaDescription?: string;
  }): Promise<{ ok: boolean; id?: number; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      const response = await firstValueFrom(
        this.http.post<{ id: number }>(`${this.apiBaseUrl}/pages`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true, id: response.id };
    } catch (error: any) {
      if (error?.status === 409) {
        return { ok: false, error: 'El slug ya existe.' };
      }
      return { ok: false, error: 'No se pudo crear la pagina.' };
    }
  }

  async updatePage(
    pageId: number,
    payload: Partial<{
      title: string;
      slug: string;
      status: string;
      isHome: boolean;
      metaTitle: string | null;
      metaDescription: string | null;
    }>
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiBaseUrl}/pages/${pageId}`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true };
    } catch (error: any) {
      if (error?.status === 409) {
        return { ok: false, error: 'El slug ya existe.' };
      }
      return { ok: false, error: 'No se pudo actualizar la pagina.' };
    }
  }

  async deletePage(pageId: number): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/pages/${pageId}`, {
          headers: this.authHeaders()
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async createSection(
    pageId: number,
    payload: {
      sectionKey: string;
      title?: string | null;
      description?: string | null;
      imageUrl?: string | null;
      sortOrder?: number;
      isVisible?: boolean;
    }
  ): Promise<{ ok: boolean; id?: number; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      const response = await firstValueFrom(
        this.http.post<{ id: number }>(`${this.apiBaseUrl}/pages/${pageId}/sections`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true, id: response.id };
    } catch (error: any) {
      if (error?.status === 409) {
        return { ok: false, error: 'La seccion ya existe en esta pagina.' };
      }
      return { ok: false, error: 'No se pudo crear la seccion.' };
    }
  }

  async updateSection(
    sectionId: number,
    payload: Partial<{
      sectionKey: string;
      title: string | null;
      description: string | null;
      imageUrl: string | null;
      sortOrder: number;
      isVisible: boolean;
    }>
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiBaseUrl}/pages/sections/${sectionId}`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true };
    } catch (error: any) {
      if (error?.status === 409) {
        return { ok: false, error: 'La seccion ya existe en esta pagina.' };
      }
      return { ok: false, error: 'No se pudo actualizar la seccion.' };
    }
  }

  async deleteSection(sectionId: number): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/pages/sections/${sectionId}`, {
          headers: this.authHeaders()
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async createBlock(
    sectionId: number,
    payload: {
      blockType: string;
      content: unknown;
      sortOrder?: number;
      isVisible?: boolean;
    }
  ): Promise<{ ok: boolean; id?: number; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      const response = await firstValueFrom(
        this.http.post<{ id: number }>(
          `${this.apiBaseUrl}/pages/sections/${sectionId}/blocks`,
          payload,
          { headers: this.authHeaders() }
        )
      );
      return { ok: true, id: response.id };
    } catch {
      return { ok: false, error: 'No se pudo crear el bloque.' };
    }
  }

  async updateBlock(
    blockId: number,
    payload: Partial<{
      blockType: string;
      content: unknown;
      sortOrder: number;
      isVisible: boolean;
    }>
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiBaseUrl}/pages/blocks/${blockId}`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo actualizar el bloque.' };
    }
  }

  async deleteBlock(blockId: number): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/pages/blocks/${blockId}`, {
          headers: this.authHeaders()
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async getProjects(): Promise<AdminProject[]> {
    if (!this.isBrowser) {
      return [];
    }
    return this.safeGet<AdminProject[]>(`${this.apiBaseUrl}/projects`, []);
  }

  async getProjectCatalog(): Promise<AdminProjectCatalog | null> {
    if (!this.isBrowser) {
      return null;
    }
    return this.safeGet<AdminProjectCatalog | null>(`${this.apiBaseUrl}/projects/catalog`, null);
  }

  async getProjectDetail(projectId: number): Promise<AdminProjectDetail | null> {
    if (!this.isBrowser) {
      return null;
    }
    return this.safeGet<AdminProjectDetail | null>(
      `${this.apiBaseUrl}/projects/${projectId}`,
      null
    );
  }

  async createProject(payload: {
    name: string;
    clientName: string;
    address: string;
    description?: string | null;
    status?: string;
    startDate?: string | null;
    endDate?: string | null;
    slug?: string | null;
    details?: AdminProjectDetails | null;
  }): Promise<{ ok: boolean; id?: number; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      const response = await firstValueFrom(
        this.http
          .post<{ id: number }>(`${this.apiBaseUrl}/projects`, payload, {
            headers: this.authHeaders()
          })
          .pipe(
            timeout(8000),
            catchError(() => {
              throw new Error('timeout');
            })
          )
      );
      return { ok: true, id: response.id };
    } catch {
      return { ok: false, error: 'No se pudo crear el proyecto.' };
    }
  }

  async updateProject(
    projectId: number,
    payload: Partial<{
      name: string;
      clientName: string;
      address: string;
      description: string | null;
      status: string;
      startDate: string | null;
      endDate: string | null;
      slug: string | null;
      details: AdminProjectDetails | null;
    }>
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      await firstValueFrom(
        this.http
          .patch(`${this.apiBaseUrl}/projects/${projectId}`, payload, {
            headers: this.authHeaders()
          })
          .pipe(
            timeout(8000),
            catchError(() => {
              throw new Error('timeout');
            })
          )
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo actualizar el proyecto.' };
    }
  }

  async deleteProject(projectId: number): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/projects/${projectId}`, {
          headers: this.authHeaders()
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async createProjectImage(
    projectId: number,
    payload: {
      fileUrl: string;
      title?: string | null;
      altText?: string | null;
      isCover?: boolean;
      sortOrder?: number;
    }
  ): Promise<{ ok: boolean; id?: number; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      const response = await firstValueFrom(
        this.http.post<{ id: number }>(`${this.apiBaseUrl}/projects/${projectId}/images`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true, id: response.id };
    } catch {
      return { ok: false, error: 'No se pudo agregar la imagen.' };
    }
  }

  async updateProjectImage(
    projectId: number,
    imageId: number,
    payload: Partial<{
      fileUrl: string | null;
      title: string | null;
      altText: string | null;
      isCover: boolean;
      sortOrder: number;
    }>
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiBaseUrl}/projects/${projectId}/images/${imageId}`,
          payload,
          { headers: this.authHeaders() }
        )
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo actualizar la imagen.' };
    }
  }

  async deleteProjectImage(projectId: number, imageId: number): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/projects/${projectId}/images/${imageId}`, {
          headers: this.authHeaders()
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async createProjectVideo(
    projectId: number,
    payload: {
      fileUrl: string;
      title?: string | null;
      description?: string | null;
      sortOrder?: number;
    }
  ): Promise<{ ok: boolean; id?: number; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      const response = await firstValueFrom(
        this.http.post<{ id: number }>(`${this.apiBaseUrl}/projects/${projectId}/videos`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true, id: response.id };
    } catch {
      return { ok: false, error: 'No se pudo agregar el video.' };
    }
  }

  async updateProjectVideo(
    projectId: number,
    videoId: number,
    payload: Partial<{
      fileUrl: string | null;
      title: string | null;
      description: string | null;
      sortOrder: number;
    }>
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiBaseUrl}/projects/${projectId}/videos/${videoId}`,
          payload,
          { headers: this.authHeaders() }
        )
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo actualizar el video.' };
    }
  }

  async deleteProjectVideo(projectId: number, videoId: number): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/projects/${projectId}/videos/${videoId}`, {
          headers: this.authHeaders()
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async updateProjectPortfolio(
    projectId: number,
    payload: {
      titleOverride?: string | null;
      category?: string | null;
      summary?: string | null;
      autocadUrl?: string | null;
      sortOrder?: number;
      isVisible?: boolean;
    }
  ): Promise<{ ok: boolean; id?: number; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      const response = await firstValueFrom(
        this.http.put<{ id?: number }>(`${this.apiBaseUrl}/projects/${projectId}/portfolio`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true, id: response?.id };
    } catch {
      return { ok: false, error: 'No se pudo actualizar el portafolio.' };
    }
  }

  async removeProjectPortfolio(projectId: number): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/projects/${projectId}/portfolio`, {
          headers: this.authHeaders()
        })
      );
      return true;
    } catch (error: any) {
      if (error?.status === 404) {
        return true;
      }
      return false;
    }
  }

  async getPortfolioEntries(): Promise<AdminPortfolioEntry[]> {
    if (!this.isBrowser) {
      return [];
    }
    return this.safeGet<AdminPortfolioEntry[]>(`${this.apiBaseUrl}/portfolio`, []);
  }

  async getPortfolioEntryDetail(entryId: number): Promise<AdminPortfolioDetail | null> {
    if (!this.isBrowser) {
      return null;
    }
    return this.safeGet<AdminPortfolioDetail | null>(
      `${this.apiBaseUrl}/portfolio/${entryId}`,
      null
    );
  }

  async getBlogPosts(): Promise<AdminBlogPost[]> {
    if (!this.isBrowser) {
      return [];
    }
    return this.safeGet<AdminBlogPost[]>(`${this.apiBaseUrl}/blog`, []);
  }

  async getBlogDetail(postId: number): Promise<AdminBlogDetail | null> {
    if (!this.isBrowser) {
      return null;
    }
    return this.safeGet<AdminBlogDetail | null>(`${this.apiBaseUrl}/blog/${postId}`, null);
  }

  async createBlogPost(payload: {
    title: string;
    slug: string;
    status?: string;
    publishedAt?: string | null;
    excerpt?: string | null;
    content?: string | null;
    coverImageUrl?: string | null;
  }): Promise<{ ok: boolean; id?: number; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      const response = await firstValueFrom(
        this.http
          .post<{ id: number }>(`${this.apiBaseUrl}/blog`, payload, {
            headers: this.authHeaders()
          })
          .pipe(
            timeout(8000),
            catchError((error) => {
              throw error;
            })
          )
      );
      return { ok: true, id: response.id };
    } catch (error: any) {
      if (error?.status === 409) {
        return { ok: false, error: 'El slug ya existe.' };
      }
      return { ok: false, error: 'No se pudo crear la publicacion.' };
    }
  }

  async updateBlogPost(
    postId: number,
    payload: Partial<{
      title: string;
      slug: string;
      status: string;
      publishedAt: string | null;
      excerpt: string | null;
      content: string | null;
      coverImageUrl: string | null;
    }>
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiBaseUrl}/blog/${postId}`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true };
    } catch (error: any) {
      if (error?.status === 409) {
        return { ok: false, error: 'El slug ya existe.' };
      }
      return { ok: false, error: 'No se pudo actualizar la publicacion.' };
    }
  }

  async deleteBlogPost(postId: number): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/blog/${postId}`, {
          headers: this.authHeaders()
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async createPortfolioEntry(payload: {
    projectId?: number | null;
    titleOverride: string;
    category?: string | null;
    summary?: string | null;
    sortOrder?: number;
    isVisible?: boolean;
  }): Promise<{ ok: boolean; id?: number; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      const response = await firstValueFrom(
        this.http.post<{ id: number }>(`${this.apiBaseUrl}/portfolio`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true, id: response.id };
    } catch (error: any) {
      if (error?.status === 422) {
        return { ok: false, error: 'El titulo es obligatorio.' };
      }
      if (error?.status === 404) {
        return { ok: false, error: 'Proyecto no encontrado.' };
      }
      return { ok: false, error: 'No se pudo crear el portafolio.' };
    }
  }

  async updatePortfolioEntry(
    entryId: number,
    payload: {
      titleOverride?: string | null;
      category?: string | null;
      summary?: string | null;
      autocadUrl?: string | null;
      sortOrder?: number;
      isVisible?: boolean;
      coverMediaId?: number | null;
      heroMediaIds?: number[];
      galleryMediaIds?: number[];
      specs?: { label: string; value: string }[];
      tags?: string[];
      blocks?: {
        blockType: 'text' | 'image' | 'video';
        textContent?: string | null;
        mediaId?: number | null;
        caption?: string | null;
        layout?: 'wide' | 'inline';
        isVisible?: boolean;
      }[];
    }
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      await firstValueFrom(
        this.http.put(`${this.apiBaseUrl}/portfolio/${entryId}`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo actualizar el portafolio.' };
    }
  }

  async deletePortfolioEntry(entryId: number): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/portfolio/${entryId}`, {
          headers: this.authHeaders()
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async uploadMedia(
    file: File,
    options?: UploadMediaOptions
  ): Promise<{ ok: boolean; id?: number; fileUrl?: string; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    const prefersChunked = file.type.startsWith('video/') || file.size > 8 * 1024 * 1024;
    const prefersMultipart = file.type.startsWith('video/') || file.size > 5 * 1024 * 1024;

    if (prefersChunked) {
      const chunked = await this.tryChunkedUpload(file, options);
      if (chunked.ok || chunked.error?.includes('NO_FALLBACK') === false) {
        return chunked;
      }
    }

    if (prefersMultipart) {
      const multipart = await this.tryMultipartUpload(file, options);
      if (multipart.ok || multipart.error?.includes('NO_FALLBACK') === false) {
        return multipart;
      }
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.readAsDataURL(file);
      });

      const response = await firstValueFrom(
        this.http.post<{ id: number; fileUrl: string }>(
          `${this.apiBaseUrl}/media`,
          {
            filename: file.name,
            data: dataUrl,
            mimeType: file.type,
            title: options?.title ?? null,
            altText: options?.altText ?? null
          },
          { headers: this.authHeaders() }
        )
      );
      return { ok: true, id: response.id, fileUrl: response.fileUrl };
    } catch (error: any) {
      return { ok: false, error: this.resolveUploadError(error) };
    }
  }

  private async tryMultipartUpload(
    file: File,
    options?: UploadMediaOptions
  ): Promise<{ ok: boolean; id?: number; fileUrl?: string; error?: string }> {
    try {
      const form = new FormData();
      form.append('file', file, file.name);
      if (options?.title) {
        form.append('title', options.title);
      }
      if (options?.altText) {
        form.append('altText', options.altText);
      }

      const response = await firstValueFrom(
        this.http.post<{ id: number; fileUrl: string }>(
          `${this.apiBaseUrl}/media/file`,
          form,
          { headers: this.authHeaders() }
        )
      );
      return { ok: true, id: response.id, fileUrl: response.fileUrl };
    } catch (error: any) {
      const status = error?.status;
      if (status === 404 || status === 405) {
        return { ok: false, error: 'NO_FALLBACK' };
      }
      if (status === 413) {
        return { ok: false, error: 'El archivo supera el tamaño permitido en el servidor.' };
      }
      return { ok: false, error: this.resolveUploadError(error) };
    }
  }

  private async tryChunkedUpload(
    file: File,
    options?: UploadMediaOptions
  ): Promise<{ ok: boolean; id?: number; fileUrl?: string; error?: string }> {
    try {
      const initResponse = await firstValueFrom(
        this.http.post<{ uploadId: string }>(
          `${this.apiBaseUrl}/media/chunks/init`,
          {
            filename: file.name,
            mimeType: file.type,
            fileSize: file.size,
            title: options?.title ?? null,
            altText: options?.altText ?? null,
          },
          { headers: this.authHeaders() }
        )
      );

      const chunkSize = 1024 * 1024;
      const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

      for (let index = 0; index < totalChunks; index += 1) {
        const start = index * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const chunk = file.slice(start, end);
        const form = new FormData();
        form.append('chunk', chunk, `${file.name}.part${index}`);
        form.append('index', String(index));

        await firstValueFrom(
          this.http.post(
            `${this.apiBaseUrl}/media/chunks/${encodeURIComponent(initResponse.uploadId)}`,
            form,
            { headers: this.authHeaders() }
          )
        );

        if (options?.onProgress) {
          options.onProgress(Math.round(((index + 1) / totalChunks) * 100));
        }
      }

      const completeResponse = await firstValueFrom(
        this.http.post<{ id: number; fileUrl: string }>(
          `${this.apiBaseUrl}/media/chunks/${encodeURIComponent(initResponse.uploadId)}/complete`,
          { totalChunks },
          { headers: this.authHeaders() }
        )
      );

      options?.onProgress?.(100);
      return { ok: true, id: completeResponse.id, fileUrl: completeResponse.fileUrl };
    } catch (error: any) {
      const status = error?.status;
      if (status === 404 || status === 405) {
        return { ok: false, error: 'NO_FALLBACK' };
      }
      return { ok: false, error: this.resolveUploadError(error) };
    }
  }

  private resolveUploadError(error: any): string {
    const status = error?.status;
    const validationErrors = error?.error?.errors;
    const backendError =
      validationErrors?.file?.[0] ||
      validationErrors?.chunk?.[0] ||
      validationErrors?.mimeType?.[0] ||
      validationErrors?.fileSize?.[0] ||
      error?.error?.error ||
      error?.error?.message;

    if (status === 422 && typeof backendError === 'string' && backendError.trim() !== '') {
      return backendError;
    }

    if (status === 413) {
      return 'El archivo supera el tamano permitido en el servidor.';
    }

    if (status === 524 || status === 504 || status === 0) {
      return 'La subida tardo demasiado o el tunel se interrumpio. Intenta de nuevo o usa un archivo mas liviano.';
    }

    if (typeof backendError === 'string' && backendError.trim() !== '') {
      return backendError;
    }

    return this.mapUploadError(error);
  }

  private mapUploadError(error: any): string {
    const status = error?.status;

    if (status === 413) {
      return 'El archivo supera el tamaño permitido en el servidor.';
    }

    if (status === 524 || status === 504 || status === 0) {
      return 'La subida tardó demasiado o el túnel se interrumpió. Intenta de nuevo o usa un archivo más liviano.';
    }

    return 'No se pudo subir el archivo.';
  }

  async getQuotes(): Promise<AdminQuote[]> {
    if (!this.isBrowser) {
      return [];
    }
    return this.safeGet<AdminQuote[]>(`${this.apiBaseUrl}/quotes`, []);
  }

  async getQuoteDetail(quoteId: number): Promise<AdminQuoteDetail | null> {
    if (!this.isBrowser) {
      return null;
    }
    return this.safeGet<AdminQuoteDetail | null>(`${this.apiBaseUrl}/quotes/${quoteId}`, null);
  }

  async getQuoteOptions(): Promise<{
    pricingRates: AdminPricingRateOption[];
    services: AdminQuoteServiceOption[];
  }> {
    if (!this.isBrowser) {
      return { pricingRates: [], services: [] };
    }
    return this.safeGet(`${this.apiBaseUrl}/quotes/options`, {
      pricingRates: [],
      services: []
    });
  }

  async createQuote(payload: {
    fullName: string;
    phone: string;
    email: string;
    documentType?: string | null;
    documentNumber?: string | null;
    projectName: string;
    projectAddress?: string | null;
    areaM2: number;
    areaCoveredM2?: number | null;
    areaUncoveredPercent?: number | null;
    floorCount?: number | null;
    baseRatePerM2: number;
    pricingRateId?: number | null;
    currency?: string;
    planName?: string | null;
    planMinDays?: number | null;
    planMaxDays?: number | null;
    status?: string;
    expiresAt?: string | null;
    notes?: string | null;
    services?: {
      serviceId: number;
      quantity?: number;
      unitPrice?: number;
    }[];
  }): Promise<{ ok: boolean; id?: number; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      const response = await firstValueFrom(
        this.http.post<{ id: number }>(`${this.apiBaseUrl}/quotes`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true, id: response.id };
    } catch {
      return { ok: false, error: 'No se pudo crear la cotizacion.' };
    }
  }

  async updateQuote(
    quoteId: number,
    payload: Partial<{
      fullName: string;
      phone: string;
      email: string;
      documentType: string | null;
      documentNumber: string | null;
      projectName: string;
      projectAddress: string | null;
      areaM2: number;
      areaCoveredM2: number | null;
      areaUncoveredPercent: number | null;
      floorCount: number | null;
      baseRatePerM2: number;
      pricingRateId: number | null;
      currency: string;
      planName: string | null;
      planMinDays: number | null;
      planMaxDays: number | null;
      status: string;
      expiresAt: string | null;
      notes: string | null;
    }>
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiBaseUrl}/quotes/${quoteId}`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo actualizar la cotizacion.' };
    }
  }

  async sendQuote(quoteId: number): Promise<{ ok: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      await firstValueFrom(
        this.http.post(`${this.apiBaseUrl}/quotes/${quoteId}/send`, {}, {
          headers: this.authHeaders()
        })
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo enviar la cotizacion.' };
    }
  }

  async addQuoteService(
    quoteId: number,
    payload: {
      serviceId: number;
      quantity?: number;
      unitPrice?: number;
    }
  ): Promise<{ ok: boolean; id?: number; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      const response = await firstValueFrom(
        this.http.post<{ id: number }>(`${this.apiBaseUrl}/quotes/${quoteId}/services`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true, id: response.id };
    } catch {
      return { ok: false, error: 'No se pudo agregar el servicio.' };
    }
  }

  async updateQuoteService(
    quoteId: number,
    quoteServiceId: number,
    payload: Partial<{
      quantity: number;
      unitPrice: number;
    }>
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiBaseUrl}/quotes/${quoteId}/services/${quoteServiceId}`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo actualizar el servicio.' };
    }
  }

  async deleteQuoteService(quoteId: number, quoteServiceId: number): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/quotes/${quoteId}/services/${quoteServiceId}`, {
          headers: this.authHeaders()
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async getServices(): Promise<AdminServiceListItem[]> {
    if (!this.isBrowser) {
      return [];
    }
    return this.safeGet<AdminServiceListItem[]>(`${this.apiBaseUrl}/services`, []);
  }

  async getServiceDetail(serviceId: number): Promise<AdminServiceDetail | null> {
    if (!this.isBrowser) {
      return null;
    }
    return this.safeGet<AdminServiceDetail | null>(`${this.apiBaseUrl}/services/${serviceId}`, null);
  }

  async getDashboard(): Promise<AdminDashboardData> {
    if (!this.isBrowser) {
      return {
        stats: {
          activeProjects: 0,
          newQuotes: 0,
          sentQuotes: 0,
          publishedPages: 0
        },
        activity: []
      };
    }
    return this.safeGet(`${this.apiBaseUrl}/dashboard`, {
      stats: {
        activeProjects: 0,
        newQuotes: 0,
        sentQuotes: 0,
        publishedPages: 0
      },
      activity: []
    });
  }

  async getPublicDashboardStats(): Promise<AdminPublicDashboardStats> {
    if (!this.isBrowser) {
      return { activeProjects: 0, newQuotes: 0 };
    }
    try {
      const response = await firstValueFrom(
        this.http.get<AdminPublicDashboardStats>(`${this.apiBaseUrl}/dashboard/public`)
      );
      return response;
    } catch {
      return { activeProjects: 0, newQuotes: 0 };
    }
  }

  async createService(payload: {
    name: string;
    description: string;
    icon?: string | null;
    displayOrder?: number;
    isPublic?: boolean;
    isAddon?: boolean;
    pricingType?: 'flat' | 'per_m2' | 'percent';
    price?: number;
    currency?: string;
    isActive?: boolean;
  }): Promise<{ ok: boolean; id?: number; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      const response = await firstValueFrom(
        this.http.post<{ id: number }>(`${this.apiBaseUrl}/services`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true, id: response.id };
    } catch {
      return { ok: false, error: 'No se pudo crear el servicio.' };
    }
  }

  async updateService(
    serviceId: number,
    payload: Partial<{
      name: string;
      description: string;
      icon: string | null;
      displayOrder: number;
      isPublic: boolean;
      isAddon: boolean;
      pricingType: 'flat' | 'per_m2' | 'percent';
      price: number;
      currency: string;
      isActive: boolean;
    }>
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiBaseUrl}/services/${serviceId}`, payload, {
          headers: this.authHeaders()
        })
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo actualizar el servicio.' };
    }
  }

  async deactivateService(serviceId: number): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/services/${serviceId}`, {
          headers: this.authHeaders()
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  private async safeGet<T>(url: string, fallback: T): Promise<T> {
    try {
      return await firstValueFrom(
        this.http.get<T>(url, {
          headers: this.authHeaders()
        }).pipe(
          timeout(8000),
          catchError((error) => {
            console.warn(`[AdminData] GET ${url} failed`, error);
            return of(fallback);
          })
        )
      );
    } catch {
      return fallback;
    }
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders();
  }
}
