import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AdminDataService,
  AdminQuoteDetail,
  AdminQuoteService,
  AdminQuoteServiceOption,
  AdminPricingRateOption
} from '../../services/admin-data';

type QuoteServiceView = AdminQuoteService & {
  draft: {
    quantity: number;
    unitPrice: number;
  };
};

@Component({
  selector: 'app-admin-quote-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-quote-detail.component.html',
  styleUrls: ['./admin-quote-detail.component.scss']
})
export class AdminQuoteDetailComponent implements OnInit, AfterViewInit {
  quote: AdminQuoteDetail | null = null;
  services: QuoteServiceView[] = [];
  serviceOptions: AdminQuoteServiceOption[] = [];
  rates: AdminPricingRateOption[] = [];
  readonly docTypes = [
    { value: 'DNI', label: 'DNI' },
    { value: 'RUC', label: 'RUC' },
    { value: 'CE', label: 'Carnet de extranjeria' },
    { value: 'PASAPORTE', label: 'Pasaporte' }
  ];
  loading = false;
  saving = false;
  error = '';
  private loaded = false;
  private readonly isBrowser: boolean;

  draft = {
    fullName: '',
    phone: '',
    email: '',
    documentType: 'DNI',
    documentNumber: '',
    projectName: '',
    projectAddress: '',
    areaM2: 0,
    areaCoveredM2: 0,
    areaUncoveredPercent: 30,
    floorCount: 1,
    baseRatePerM2: 0,
    pricingRateId: null as number | null,
    currency: 'PEN',
    planName: '',
    planMinDays: null as number | null,
    planMaxDays: null as number | null,
    status: 'new',
    expiresAt: '',
    notes: ''
  };

  serviceDraft = {
    serviceId: 0,
    quantity: 1,
    unitPrice: 0
  };

  constructor(
    private route: ActivatedRoute,
    private data: AdminDataService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.tryLoad();
  }

  ngAfterViewInit() {
    this.tryLoad();
  }

  private async tryLoad() {
    if (!this.isBrowser || this.loaded) {
      return;
    }
    this.loaded = true;
    await this.loadData();
  }

  private async loadData() {
    const quoteId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(quoteId)) {
      this.error = 'Cotizacion invalida.';
      return;
    }
    this.loading = true;
    this.error = '';

    try {
      const [quote, options] = await Promise.all([
        this.data.getQuoteDetail(quoteId),
        this.data.getQuoteOptions()
      ]);

      if (!quote) {
        this.error = 'No se encontro la cotizacion.';
        return;
      }

      this.quote = quote;
      this.draft = {
        fullName: quote.fullName,
        phone: quote.phone,
        email: quote.email,
        documentType: quote.documentType ?? 'DNI',
        documentNumber: quote.documentNumber ?? '',
        projectName: quote.projectName,
        projectAddress: quote.projectAddress ?? '',
        areaM2: quote.areaM2,
        areaCoveredM2: quote.areaCoveredM2 ?? 0,
        areaUncoveredPercent: quote.areaUncoveredPercent ?? 30,
        floorCount: quote.floorCount ?? 1,
        baseRatePerM2: quote.baseRatePerM2,
        pricingRateId: quote.pricingRateId ?? null,
        currency: quote.currency,
        planName: quote.planName ?? '',
        planMinDays: quote.planMinDays ?? null,
        planMaxDays: quote.planMaxDays ?? null,
        status: quote.status,
        expiresAt: quote.expiresAt ?? '',
        notes: quote.notes ?? ''
      };
      this.services = quote.services.map((service) => ({
        ...service,
        draft: {
          quantity: service.quantity,
          unitPrice: service.unitPrice
        }
      }));
      this.rates = options.pricingRates.filter((rate) => rate.isActive);
      this.serviceOptions = options.services.filter((service) => service.isActive);
      this.updateAreaCovered();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  formatCurrency(value: number, currency: string) {
    const safeCurrency = currency || 'PEN';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: safeCurrency
    }).format(value);
  }

  formatStatus(status: string) {
    switch (status) {
      case 'new':
        return 'Nueva';
      case 'reviewed':
        return 'Revisada';
      case 'sent':
        return 'Enviada';
      case 'accepted':
        return 'Aceptada';
      case 'rejected':
        return 'Rechazada';
      default:
        return status;
    }
  }

  onServiceChange() {
    const selected = this.serviceOptions.find((service) => service.id === this.serviceDraft.serviceId);
    if (selected) {
      this.serviceDraft.unitPrice = selected.price;
    }
  }

  onRateChange() {
    const selected = this.rates.find((rate) => rate.id === this.draft.pricingRateId);
    if (selected) {
      this.draft.baseRatePerM2 = selected.basePricePerM2;
      this.draft.currency = selected.currency;
      this.draft.planName = selected.name;
      this.draft.planMinDays = selected.minDays ?? null;
      this.draft.planMaxDays = selected.maxDays ?? null;
    }
  }

  updateAreaCovered() {
    const areaTotal = Number(this.draft.areaM2);
    if (!Number.isFinite(areaTotal) || areaTotal <= 0) {
      this.draft.areaCoveredM2 = 0;
      return;
    }
    const freePercent = Number(this.draft.areaUncoveredPercent);
    const safePercent = Number.isFinite(freePercent) ? Math.min(Math.max(freePercent, 0), 100) : 30;
    this.draft.areaUncoveredPercent = safePercent;
    this.draft.areaCoveredM2 = Number((areaTotal * (1 - safePercent / 100)).toFixed(2));
  }

  getAreaUncoveredM2() {
    const areaTotal = Number(this.draft.areaM2);
    if (!Number.isFinite(areaTotal) || areaTotal <= 0) {
      return 0;
    }
    const freePercent = Number(this.draft.areaUncoveredPercent);
    const safePercent = Number.isFinite(freePercent) ? Math.min(Math.max(freePercent, 0), 100) : 30;
    return Number((areaTotal * (safePercent / 100)).toFixed(2));
  }

  async saveQuote() {
    if (!this.quote) {
      return;
    }
    const fullName = this.draft.fullName.trim();
    const phone = this.draft.phone.trim();
    const email = this.draft.email.trim();
    const documentType = this.draft.documentType.trim();
    const documentNumber = this.draft.documentNumber.trim();
    const projectName = this.draft.projectName.trim();
    const projectAddress = this.draft.projectAddress.trim();
    const areaM2 = Number(this.draft.areaM2);
    const areaCoveredM2 = Number(this.draft.areaCoveredM2);
    const areaUncoveredPercent = Number(this.draft.areaUncoveredPercent);
    const floorCount = Number(this.draft.floorCount);
    const baseRatePerM2 = Number(this.draft.baseRatePerM2);

    if (!fullName || !phone || !email || !projectName) {
      this.error = 'Nombre, telefono, correo y proyecto son obligatorios.';
      return;
    }
    if (!Number.isFinite(areaM2) || areaM2 <= 0) {
      this.error = 'El area debe ser mayor que 0.';
      return;
    }
    if (!Number.isFinite(baseRatePerM2) || baseRatePerM2 <= 0) {
      this.error = 'La tarifa por m2 es obligatoria.';
      return;
    }

    if (Number.isFinite(areaUncoveredPercent) && (areaUncoveredPercent < 0 || areaUncoveredPercent > 100)) {
      this.error = 'El porcentaje de area libre debe estar entre 0 y 100.';
      return;
    }

    this.saving = true;
    this.error = '';
    const result = await this.data.updateQuote(this.quote.id, {
      fullName,
      phone,
      email,
      documentType: documentType || null,
      documentNumber: documentNumber || null,
      projectName,
      projectAddress: projectAddress || null,
      areaM2,
      areaCoveredM2: Number.isFinite(areaCoveredM2) ? areaCoveredM2 : null,
      areaUncoveredPercent: Number.isFinite(areaUncoveredPercent) ? areaUncoveredPercent : null,
      floorCount: Number.isFinite(floorCount) ? floorCount : null,
      baseRatePerM2,
      pricingRateId: this.draft.pricingRateId,
      currency: this.draft.currency,
      planName: this.draft.planName.trim() || null,
      planMinDays: this.draft.planMinDays,
      planMaxDays: this.draft.planMaxDays,
      status: this.draft.status,
      expiresAt: this.draft.expiresAt || null,
      notes: this.draft.notes.trim() || null
    });
    this.saving = false;
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo guardar la cotizacion.';
      return;
    }
    await this.loadData();
  }

  async addService() {
    if (!this.quote) {
      return;
    }
    if (!this.serviceDraft.serviceId) {
      this.error = 'Selecciona un servicio.';
      return;
    }
    this.error = '';
    const result = await this.data.addQuoteService(this.quote.id, {
      serviceId: this.serviceDraft.serviceId,
      quantity: this.serviceDraft.quantity,
      unitPrice: this.serviceDraft.unitPrice
    });
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo agregar el servicio.';
      return;
    }
    this.serviceDraft = { serviceId: 0, quantity: 1, unitPrice: 0 };
    await this.loadData();
  }

  async saveService(service: QuoteServiceView) {
    if (!this.quote) {
      return;
    }
    const result = await this.data.updateQuoteService(this.quote.id, service.id, {
      quantity: service.draft.quantity,
      unitPrice: service.draft.unitPrice
    });
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo actualizar el servicio.';
      return;
    }
    await this.loadData();
  }

  async deleteService(service: QuoteServiceView) {
    if (!this.quote) {
      return;
    }
    const confirmed = confirm('Eliminar este servicio?');
    if (!confirmed) {
      return;
    }
    const ok = await this.data.deleteQuoteService(this.quote.id, service.id);
    if (!ok) {
      this.error = 'No se pudo eliminar el servicio.';
      return;
    }
    await this.loadData();
  }
}
