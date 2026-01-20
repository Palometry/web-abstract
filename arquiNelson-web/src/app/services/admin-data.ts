import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { catchError, timeout } from 'rxjs/operators';

export type AdminPage = {
  id: number;
  title: string;
  slug: string;
  status: 'draft' | 'published' | string;
  sections: number;
};

export type AdminPageDetail = {
  id: number;
  title: string;
  slug: string;
  status: 'draft' | 'published' | string;
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

export type AdminProjectDetail = AdminProject & {
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  images: AdminProjectImage[];
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

export type AdminPortfolioEntryDetail = {
  id: number;
  titleOverride: string | null;
  sortOrder: number;
  isVisible: boolean;
};

export type AdminPortfolioEntry = {
  id: number;
  projectId: number;
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
  blockType: 'text' | 'image';
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
  projectId: number;
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
  projectName: string;
  areaM2: number;
  baseRatePerM2: number;
  baseCost: number;
  extrasCost: number;
  totalCost: number;
  currency: string;
  status: string;
  notes: string | null;
  createdAt?: string;
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

export type AdminDashboardData = {
  stats: AdminDashboardStats;
  activity: AdminDashboardActivity[];
};

@Injectable({ providedIn: 'root' })
export class AdminDataService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = 'http://localhost:4001/api';
  private readonly tokenKey = 'arqui_admin_token';

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
  }): Promise<{ ok: boolean; id?: number; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      const response = await firstValueFrom(
        this.http.post<{ id: number }>(`${this.apiBaseUrl}/projects`, payload, {
          headers: this.authHeaders()
        })
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
    }>
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
    }
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiBaseUrl}/projects/${projectId}`, payload, {
          headers: this.authHeaders()
        })
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
        blockType: 'text' | 'image';
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

  async uploadMedia(
    file: File,
    options?: { title?: string; altText?: string }
  ): Promise<{ ok: boolean; id?: number; fileUrl?: string; error?: string }> {
    if (!this.isBrowser) {
      return { ok: false, error: 'Storage no disponible.' };
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
    } catch {
      return { ok: false, error: 'No se pudo subir la imagen.' };
    }
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
    projectName: string;
    areaM2: number;
    baseRatePerM2: number;
    pricingRateId?: number | null;
    status?: string;
    notes?: string | null;
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
      projectName: string;
      areaM2: number;
      baseRatePerM2: number;
      status: string;
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

  async getServices(): Promise<AdminService[]> {
    if (!this.isBrowser) {
      return [];
    }
    return this.safeGet<AdminService[]>(`${this.apiBaseUrl}/services`, []);
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
    if (!this.isBrowser) {
      return new HttpHeaders();
    }
    const token = localStorage.getItem(this.tokenKey);
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });
  }
}
