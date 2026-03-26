import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-config';

export interface PublicPricingRateOption {
  id: number;
  name: string;
  basePricePerM2: number;
  currency: string;
  minDays?: number | null;
  maxDays?: number | null;
  isActive: boolean;
}

export interface PublicQuoteServiceOption {
  id: number;
  name: string;
  pricingType: 'flat' | 'per_m2' | 'percent';
  price: number;
  currency: string;
  isAddon: boolean;
  isActive: boolean;
}

export interface PublicQuoteLeadPayload {
  fullName: string;
  phone: string;
  email: string;
  documentType?: string | null;
  documentNumber?: string | null;
  projectName: string;
  projectAddress?: string | null;
  areaM2?: number | null;
  areaUncoveredPercent?: number | null;
  floorCount?: number | null;
  baseRatePerM2?: number | null;
  pricingRateId?: number | null;
  currency?: string | null;
  planName?: string | null;
  planMinDays?: number | null;
  planMaxDays?: number | null;
  notes?: string | null;
  services?: {
    serviceId: number;
    quantity?: number;
    unitPrice?: number;
  }[];
  idempotencyKey?: string;
}

export interface PublicQuoteLeadResponse {
  id: number;
}

@Injectable({ providedIn: 'root' })
export class PublicQuotesService {
  private readonly http = inject(HttpClient);

  getOptions(): Promise<{ pricingRates: PublicPricingRateOption[]; services: PublicQuoteServiceOption[] }> {
    return firstValueFrom(
      this.http.get<{ pricingRates: PublicPricingRateOption[]; services: PublicQuoteServiceOption[] }>(
        `${API_BASE_URL}/quotes/public/options`
      )
    );
  }

  sendLead(payload: PublicQuoteLeadPayload): Promise<PublicQuoteLeadResponse> {
    return firstValueFrom(
      this.http.post<PublicQuoteLeadResponse>(`${API_BASE_URL}/quotes/lead`, payload)
    );
  }
}
