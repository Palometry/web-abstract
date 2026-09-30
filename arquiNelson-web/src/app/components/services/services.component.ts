import { ChangeDetectorRef, Component, Input, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublicService, PublicServicesService } from '../../services/public-services';
import {
  DEFAULT_PROJECT_CATALOG,
  formatProjectLabel,
  formatProjectTypeLabel
} from '../../admin/project-classifications';
import {
  PublicPricingRateOption,
  PublicQuoteServiceOption,
  PublicQuotesService
} from '../../services/public-quotes.service';

interface Service {
  id: number;
  icon?: string | null;
  title: string;
  description: string;
  url?: string;
  openInNewTab?: boolean;
}

type QuoteServiceDraft = {
  serviceId: number;
  name: string;
  pricingType: 'flat' | 'per_m2' | 'percent';
  quantity: number;
  unitPrice: number;
};

type PlanBenefit = {
  label: string;
  included: boolean;
};

type PlanBenefitGroup = {
  title: string;
  timeline: string;
  benefits: PlanBenefit[];
};

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent implements OnInit {
  @Input() title?: string;
  @Input() summary?: string;
  @Input() items?: Service[];
  @Input() standalonePage = false;

  defaultTitle = 'Servicios';
  defaultSummary = 'Ofrecemos soluciones inmobiliarias integrales y profesionales';
  readonly whatsappNumber = '51956639199';
  loadedServices: Service[] = [];
  loadingQuoteOptions = false;
  isSubmittingQuote = false;
  isQuoteExpanded = false;
  quoteSuccess = '';
  quoteError = '';
  rates: PublicPricingRateOption[] = [];
  serviceOptions: PublicQuoteServiceOption[] = [];
  servicesDraft: QuoteServiceDraft[] = [];
  readonly todayLabel = new Date().toLocaleDateString('es-PE');
  readonly defaultExpiresAt = this.buildDefaultExpiresAt();
  readonly advisoryQrSrc = 'img/codigo-qr.webp';
  readonly advisoryPaymentName = 'Paolo Daza Tello';
  readonly visitFee = 'S/ 50';
  readonly advisoryWhatsappLink =
    'https://wa.me/51956639199?text=' +
    encodeURIComponent(
      'Hola, ya realice el pago unico de S/ 50 por Yape y quiero agendar una visita a mi obra. Les comparto mi comprobante y ubicacion para coordinar la fecha y hora.'
    );
  readonly docTypes = [
    { value: 'DNI', label: 'DNI' },
    { value: 'RUC', label: 'RUC' },
    { value: 'CE', label: 'Carnet de extranjeria' },
    { value: 'PASAPORTE', label: 'Pasaporte' }
  ];
  readonly planBenefitCatalog: Record<string, PlanBenefitGroup> = {
    basico: {
      title: 'Plan Basico',
      timeline: '15-30 dias',
      benefits: [
        { label: 'Planos de Arquitectura (distribucion, plantas, cortes y elevaciones)', included: true },
        { label: 'Planos de Estructuras', included: true },
        { label: 'Renders profesionales de fachada 3D y recorrido interior', included: true },
        { label: 'Planos de Instalaciones Sanitarias', included: false },
        { label: 'Planos de Instalaciones Electricas y Comunicaciones', included: false },
        { label: 'Propuesta de Diseno Interior', included: false },
        { label: 'Presupuesto de Obra', included: false }
      ]
    },
    pro: {
      title: 'Plan Pro',
      timeline: '30-45 dias',
      benefits: [
        { label: 'Planos de Arquitectura (distribucion, plantas, cortes y elevaciones)', included: true },
        { label: 'Planos de Estructuras', included: true },
        { label: 'Planos de Instalaciones Sanitarias', included: true },
        { label: 'Planos de Instalaciones Electricas y Comunicaciones', included: true },
        { label: 'Renders profesionales de fachada 3D y recorrido interior', included: true },
        { label: 'Propuesta de Diseno Interior', included: false },
        { label: 'Presupuesto de Obra', included: false }
      ]
    },
    premium: {
      title: 'Plan Premium',
      timeline: '45-60 dias',
      benefits: [
        { label: 'Planos de Arquitectura (distribucion, plantas, cortes y elevaciones)', included: true },
        { label: 'Planos de Estructuras', included: true },
        { label: 'Planos de Instalaciones Sanitarias', included: true },
        { label: 'Planos de Instalaciones Electricas y Comunicaciones', included: true },
        { label: 'Renders profesionales de fachada 3D y recorrido interior', included: true },
        { label: 'Propuesta de Diseno Interior', included: true },
        { label: 'Presupuesto de Obra', included: true }
      ]
    }
  };
  quoteDraft = {
    fullName: '',
    phone: '',
    email: '',
    documentType: 'DNI',
    documentNumber: '',
    projectName: '',
    projectType: '',
    projectClassification: '',
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
    status: 'draft',
    expiresAt: '',
    notes: ''
  };

  serviceDraft = {
    serviceId: 0,
    quantity: 1,
    unitPrice: 0
  };

  services: Service[] = [
    {
      id: 1,
      icon: '',
      title: 'Desarrollo inmobiliario',
      description: 'Vivienda unifamiliar, multifamiliar y casas de campo.',
      url: '/services#cotizacion'
    },
    {
      id: 2,
      icon: '',
      title: 'Saneamiento físico legal y consultoría urbana',
      description: 'Regularización de predios y asesoría técnica para el ordenamiento territorial.'
    },
    {
      id: 3,
      icon: '',
      title: 'Diseño urbano',
      description: 'Proyectos de habilitación urbana y planificación integral de barrios.'
    },
    {
      id: 4,
      icon: '',
      title: 'Supervisión y ejecución de obras',
      description: 'Gestión y control de obras públicas y privadas con altos estándares de calidad.'
    },
    {
      id: 5,
      icon: '',
      title: 'Consultoría técnica',
      description: 'Elaboración de expedientes técnicos y asesoramiento al Estado y al sector privado.'
    },
    {
      id: 6,
      icon: '',
      title: 'Implementación BIM',
      description: 'Especialistas en procesos colaborativos y digitalización para entidades públicas y municipalidades.'
    },
    {
      id: 7,
      icon: '',
      title: 'Materiales sostenibles',
      description: 'Asesoría en el uso de bambú y madera de plantaciones forestales certificadas.'
    },
    {
      id: 8,
      icon: '',
      title: 'Alianzas estratégicas',
      description: 'Colaboraciones con ONGs y actores públicos y privados para proteger agua, bosques y suelo.'
    }
  ];

  constructor(
    private publicServicesService: PublicServicesService,
    private publicQuotesService: PublicQuotesService,
    private route: ActivatedRoute,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.standalonePage = this.standalonePage || !!this.route.snapshot.data['standalonePage'];
    if (this.route.snapshot.fragment === 'cotizacion') {
      this.isQuoteExpanded = true;
    }
    if (!this.quoteDraft.expiresAt) {
      this.quoteDraft.expiresAt = this.defaultExpiresAt;
    }

    if (this.items?.length) {
      return;
    }

    const publicServices = await this.publicServicesService.getServices();
    if (publicServices.length) {
      this.loadedServices = publicServices.map((service: PublicService) => ({
        id: service.id,
        icon: '',
        title: service.title,
        description: service.description,
        url: service.url ?? service.icon ?? undefined,
      }));
    }

    if (this.standalonePage) {
      await this.loadQuoteOptions();
    }
  }

  get displayServices() {
    const services = this.items?.length
      ? this.items
      : this.loadedServices.length
        ? this.loadedServices
        : this.services;

    return this.standalonePage
      ? services.filter((service) => !this.isBuildingService(service))
      : services;
  }

  get featuredProjectService(): Service | undefined {
    const services = this.items?.length
      ? this.items
      : this.loadedServices.length
        ? this.loadedServices
        : this.services;
    return this.standalonePage ? services.find((service) => this.isBuildingService(service)) : undefined;
  }

  get projectTypeOptions(): string[] {
    const buildingTypes = Object.keys(DEFAULT_PROJECT_CATALOG.edificaciones).map(formatProjectTypeLabel);
    const developmentTypes = Object.keys(DEFAULT_PROJECT_CATALOG.habilitaciones).map(formatProjectTypeLabel);
    return this.getUniqueOptions([...buildingTypes, ...developmentTypes]);
  }

  get projectClassificationOptions(): string[] {
    const selectedType = this.toLookupKey(this.quoteDraft.projectType);
    if (!selectedType) {
      return [];
    }

    for (const [type, classifications] of Object.entries(DEFAULT_PROJECT_CATALOG.edificaciones)) {
      if (this.toLookupKey(formatProjectTypeLabel(type)) === selectedType) {
        return this.getUniqueOptions(Object.keys(classifications).map(formatProjectLabel));
      }
    }

    for (const [type, classifications] of Object.entries(DEFAULT_PROJECT_CATALOG.habilitaciones)) {
      if (this.toLookupKey(formatProjectTypeLabel(type)) === selectedType) {
        return this.getUniqueOptions(classifications.map(formatProjectLabel));
      }
    }

    return [];
  }

  private isBuildingService(service: Service): boolean {
    const title = this.toLookupKey(service.title);
    return title.includes('edific') || title.includes('desarrollo inmobiliario');
  }

  private toLookupKey(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private getUniqueOptions(values: string[]): string[] {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, 'es'));
  }

  onProjectTypeChange(): void {
    this.quoteDraft.projectClassification = '';
  }

  formatProjectTypeLabel(label: string): string {
    return formatProjectTypeLabel(label);
  }

  formatProjectLabel(label: string): string {
    return formatProjectLabel(label);
  }

  private buildDefaultExpiresAt() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    const lastDay = new Date(year, month + 2, 0).getDate();
    const targetDay = Math.min(day, lastDay);
    const nextMonth = new Date(year, month + 1, targetDay);
    const yyyy = nextMonth.getFullYear();
    const mm = String(nextMonth.getMonth() + 1).padStart(2, '0');
    const dd = String(nextMonth.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private async loadQuoteOptions() {
    this.loadingQuoteOptions = true;
    this.quoteError = '';
    this.cdr.detectChanges();
    try {
      const options = await this.publicQuotesService.getOptions();
      this.zone.run(() => {
        this.rates = options.pricingRates.filter((rate) => rate.isActive);
        this.serviceOptions = options.services.filter((service) => service.isActive);
        this.onRateChange();
        this.cdr.detectChanges();
      });
    } catch {
      this.zone.run(() => {
        this.quoteError = 'No se pudieron cargar las opciones de cotizacion.';
        this.cdr.detectChanges();
      });
    } finally {
      this.zone.run(() => {
        this.loadingQuoteOptions = false;
        this.cdr.detectChanges();
      });
    }
  }

  toggleQuoteExpanded() {
    this.isQuoteExpanded = !this.isQuoteExpanded;
  }

  onRateChange() {
    const selected = this.rates.find((rate) => rate.id === this.quoteDraft.pricingRateId);
    if (selected) {
      this.quoteDraft.baseRatePerM2 = selected.basePricePerM2;
      this.quoteDraft.currency = selected.currency;
      this.quoteDraft.planName = selected.name;
      this.quoteDraft.planMinDays = selected.minDays ?? null;
      this.quoteDraft.planMaxDays = selected.maxDays ?? null;
      return;
    }
    this.quoteDraft.baseRatePerM2 = 0;
    this.quoteDraft.planName = '';
    this.quoteDraft.planMinDays = null;
    this.quoteDraft.planMaxDays = null;
  }

  onServiceChange() {
    const selected = this.serviceOptions.find((service) => service.id === this.serviceDraft.serviceId);
    if (selected) {
      this.serviceDraft.unitPrice = selected.price;
    }
  }

  updateAreaCovered() {
    const areaTotal = Number(this.quoteDraft.areaM2);
    if (!Number.isFinite(areaTotal) || areaTotal <= 0) {
      this.quoteDraft.areaCoveredM2 = 0;
      return;
    }
    const freePercent = Number(this.quoteDraft.areaUncoveredPercent);
    const safePercent = Number.isFinite(freePercent) ? Math.min(Math.max(freePercent, 0), 100) : 30;
    this.quoteDraft.areaUncoveredPercent = safePercent;
    this.quoteDraft.areaCoveredM2 = Number((areaTotal * (1 - safePercent / 100)).toFixed(2));
  }

  getAreaUncoveredM2() {
    const areaTotal = Number(this.quoteDraft.areaM2);
    if (!Number.isFinite(areaTotal) || areaTotal <= 0) {
      return 0;
    }
    const freePercent = Number(this.quoteDraft.areaUncoveredPercent);
    const safePercent = Number.isFinite(freePercent) ? Math.min(Math.max(freePercent, 0), 100) : 30;
    return Number((areaTotal * (safePercent / 100)).toFixed(2));
  }

  getAreaCoveredTotal() {
    const covered = Number(this.quoteDraft.areaCoveredM2);
    if (!Number.isFinite(covered) || covered <= 0) {
      return 0;
    }
    const floors = Number(this.quoteDraft.floorCount);
    const safeFloors = Number.isFinite(floors) && floors > 0 ? floors : 1;
    return Number((covered * safeFloors).toFixed(2));
  }

  get baseCost() {
    const area = Number(this.quoteDraft.areaCoveredM2);
    const floors = Number(this.quoteDraft.floorCount || 1);
    const rate = Number(this.quoteDraft.baseRatePerM2);
    if (!Number.isFinite(area) || !Number.isFinite(rate) || !Number.isFinite(floors)) {
      return 0;
    }
    return Number((area * floors * rate).toFixed(2));
  }

  computeServiceLineTotal(service: QuoteServiceDraft) {
    const quantity = Number(service.quantity);
    const unitPrice = Number(service.unitPrice);
    const areaM2 = Number(this.quoteDraft.areaM2);
    const baseCost = this.baseCost;
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return 0;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return 0;
    }
    if (service.pricingType === 'per_m2') {
      return Number((unitPrice * areaM2 * quantity).toFixed(2));
    }
    if (service.pricingType === 'percent') {
      return Number((baseCost * (unitPrice / 100) * quantity).toFixed(2));
    }
    return Number((unitPrice * quantity).toFixed(2));
  }

  get extrasCost() {
    if (!this.servicesDraft.length) {
      return 0;
    }
    const total = this.servicesDraft.reduce((sum, service) => sum + this.computeServiceLineTotal(service), 0);
    return Number(total.toFixed(2));
  }

  get totalCost() {
    return Number((this.baseCost + this.extrasCost).toFixed(2));
  }

  addService() {
    if (!this.serviceDraft.serviceId) {
      this.quoteError = 'Selecciona un servicio.';
      return;
    }
    const selected = this.serviceOptions.find((service) => service.id === this.serviceDraft.serviceId);
    if (!selected) {
      this.quoteError = 'Servicio invalido.';
      return;
    }
    const exists = this.servicesDraft.some((service) => service.serviceId === selected.id);
    if (exists) {
      this.quoteError = 'Este servicio ya esta agregado.';
      return;
    }
    const quantity = Number(this.serviceDraft.quantity);
    const unitPrice = Number(this.serviceDraft.unitPrice);
    this.servicesDraft.push({
      serviceId: selected.id,
      name: selected.name,
      pricingType: selected.pricingType,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unitPrice: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : selected.price
    });
    this.serviceDraft = { serviceId: 0, quantity: 1, unitPrice: 0 };
    this.quoteError = '';
  }

  removeService(serviceId: number) {
    this.servicesDraft = this.servicesDraft.filter((service) => service.serviceId !== serviceId);
  }

  formatCurrency(value: number, currency: string) {
    const safeCurrency = currency || 'PEN';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: safeCurrency
    }).format(value);
  }

  pricingTypeLabel(pricingType: QuoteServiceDraft['pricingType']) {
    if (pricingType === 'per_m2') {
      return 'Por m2';
    }
    if (pricingType === 'percent') {
      return 'Por porcentaje';
    }
    return 'Monto fijo';
  }

  get selectedPlanBenefits() {
    const selected = this.rates.find((rate) => rate.id === this.quoteDraft.pricingRateId);
    if (!selected) {
      return null;
    }

    return this.resolvePlanBenefits(selected.name, selected.minDays, selected.maxDays);
  }

  private resolvePlanBenefits(
    planName: string,
    minDays?: number | null,
    maxDays?: number | null
  ): PlanBenefitGroup {
    const normalized = this.normalizePlanName(planName);
    const matchedKey = Object.keys(this.planBenefitCatalog).find((key) => normalized.includes(key));
    const fallbackTimeline =
      minDays !== null && minDays !== undefined && maxDays !== null && maxDays !== undefined
        ? `${minDays}-${maxDays} dias`
        : 'Plazo por definir';

    if (!matchedKey) {
      return {
        title: planName || 'Plan seleccionado',
        timeline: fallbackTimeline,
        benefits: []
      };
    }

    const source = this.planBenefitCatalog[matchedKey];
    return {
      title: planName || source.title,
      timeline:
        minDays !== null && minDays !== undefined && maxDays !== null && maxDays !== undefined
          ? `${minDays}-${maxDays} dias`
          : source.timeline,
      benefits: source.benefits
    };
  }

  private normalizePlanName(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  async submitQuoteLead() {
    const fullName = this.quoteDraft.fullName.trim();
    const phone = this.quoteDraft.phone.trim();
    const email = this.quoteDraft.email.trim();
    const documentType = this.quoteDraft.documentType.trim();
    const documentNumber = this.quoteDraft.documentNumber.trim();
    const projectName = this.quoteDraft.projectName.trim();
    const projectType = this.quoteDraft.projectType.trim();
    const projectClassification = this.quoteDraft.projectClassification.trim();
    const projectAddress = this.quoteDraft.projectAddress.trim();
    const notes = this.quoteDraft.notes.trim();
    const areaM2 = Number(this.quoteDraft.areaM2);
    const areaUncoveredPercent = Number(this.quoteDraft.areaUncoveredPercent);
    const floorCount = Number(this.quoteDraft.floorCount);
    const baseRatePerM2 = Number(this.quoteDraft.baseRatePerM2);

    this.quoteSuccess = '';
    this.quoteError = '';

    if (!fullName || !phone || !email || !projectName || !projectType) {
      this.isQuoteExpanded = true;
      this.quoteError = 'Completa nombre, celular, correo, nombre y tipo del proyecto.';
      return;
    }

    if (!Number.isFinite(areaM2) || areaM2 <= 0) {
      this.isQuoteExpanded = true;
      this.quoteError = 'El area debe ser mayor que 0.';
      return;
    }

    if (!this.quoteDraft.pricingRateId && (!Number.isFinite(baseRatePerM2) || baseRatePerM2 <= 0)) {
      this.isQuoteExpanded = true;
      this.quoteError = 'Selecciona un plan valido.';
      return;
    }

    if (Number.isFinite(areaUncoveredPercent) && (areaUncoveredPercent < 0 || areaUncoveredPercent > 100)) {
      this.isQuoteExpanded = true;
      this.quoteError = 'El porcentaje de area libre debe estar entre 0 y 100.';
      return;
    }

    this.isQuoteExpanded = true;
    this.isSubmittingQuote = true;
    this.cdr.detectChanges();
    try {
      await this.publicQuotesService.sendLead({
        fullName,
        phone,
        email,
        documentType: documentType || null,
        documentNumber: documentNumber || null,
        projectName,
        projectType,
        projectClassification: projectClassification || null,
        projectAddress: projectAddress || null,
        areaM2,
        areaUncoveredPercent: Number.isFinite(areaUncoveredPercent) ? areaUncoveredPercent : null,
        floorCount: Number.isFinite(floorCount) ? floorCount : null,
        baseRatePerM2,
        pricingRateId: this.quoteDraft.pricingRateId,
        currency: this.quoteDraft.currency,
        planName: this.quoteDraft.planName.trim() || null,
        planMinDays: this.quoteDraft.planMinDays,
        planMaxDays: this.quoteDraft.planMaxDays,
        notes: notes || null,
        services: this.servicesDraft.map((service) => ({
          serviceId: service.serviceId,
          quantity: service.quantity,
          unitPrice: service.unitPrice
        })),
        idempotencyKey: `services-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      });
      this.zone.run(() => {
        this.isQuoteExpanded = true;
        this.quoteSuccess = 'Tu cotizacion fue enviada como borrador. El equipo la revisara y te contactara.';
        this.quoteDraft = {
          fullName: '',
          phone: '',
          email: '',
          documentType: 'DNI',
          documentNumber: '',
          projectName: '',
          projectType: '',
          projectClassification: '',
          projectAddress: '',
          areaM2: 0,
          areaCoveredM2: 0,
          areaUncoveredPercent: 30,
          floorCount: 1,
          baseRatePerM2: 0,
          pricingRateId: null,
          currency: 'PEN',
          planName: '',
          planMinDays: null,
          planMaxDays: null,
          status: 'draft',
          expiresAt: this.defaultExpiresAt,
          notes: ''
        };
        this.servicesDraft = [];
        this.serviceDraft = { serviceId: 0, quantity: 1, unitPrice: 0 };
        this.onRateChange();
        this.cdr.detectChanges();
      });
    } catch {
      this.zone.run(() => {
        this.isQuoteExpanded = true;
        this.quoteError = 'No se pudo enviar la cotizacion en este momento.';
        this.cdr.detectChanges();
      });
    } finally {
      this.zone.run(() => {
        this.isSubmittingQuote = false;
        this.cdr.detectChanges();
      });
    }
  }

  isInternal(url: string | undefined) {
    return !!url && url.startsWith('/');
  }

  isQuoteService(service: Service): boolean {
    return this.getInternalFragment(service.url) === 'cotizacion';
  }

  buildServiceWhatsAppHref(service: Service): string {
    const message = encodeURIComponent(
      `Hola, me interesa conocer mas sobre el servicio de ${service.title}. Podrian brindarme informacion?`
    );
    return `https://wa.me/${this.whatsappNumber}?text=${message}`;
  }

  getInternalPath(url: string | undefined) {
    return url?.split('#', 1)[0] || '/services';
  }

  getInternalFragment(url: string | undefined) {
    const fragment = url?.split('#', 2)[1];
    return fragment || undefined;
  }

  openQuoteIfNeeded(url: string | undefined) {
    if (this.getInternalFragment(url) === 'cotizacion') {
      this.isQuoteExpanded = true;
    }
  }

  isExternal(url: string | undefined) {
    return !!url && /^https?:\/\//i.test(url);
  }

  getTarget(service: Service) {
    if (service.openInNewTab) {
      return '_blank';
    }
    return this.isExternal(service.url) ? '_blank' : undefined;
  }
}
