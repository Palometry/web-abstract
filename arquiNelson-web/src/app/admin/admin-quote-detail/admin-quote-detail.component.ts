import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AdminDataService,
  AdminQuoteDetail,
  AdminQuoteService,
  AdminQuoteServiceOption
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
  loading = false;
  saving = false;
  error = '';
  private loaded = false;
  private readonly isBrowser: boolean;

  draft = {
    fullName: '',
    phone: '',
    email: '',
    projectName: '',
    areaM2: 0,
    baseRatePerM2: 0,
    status: 'new',
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
        projectName: quote.projectName,
        areaM2: quote.areaM2,
        baseRatePerM2: quote.baseRatePerM2,
        status: quote.status,
        notes: quote.notes ?? ''
      };
      this.services = quote.services.map((service) => ({
        ...service,
        draft: {
          quantity: service.quantity,
          unitPrice: service.unitPrice
        }
      }));
      this.serviceOptions = options.services.filter((service) => service.isActive);
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

  async saveQuote() {
    if (!this.quote) {
      return;
    }
    const fullName = this.draft.fullName.trim();
    const phone = this.draft.phone.trim();
    const email = this.draft.email.trim();
    const projectName = this.draft.projectName.trim();
    const areaM2 = Number(this.draft.areaM2);
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

    this.saving = true;
    this.error = '';
    const result = await this.data.updateQuote(this.quote.id, {
      fullName,
      phone,
      email,
      projectName,
      areaM2,
      baseRatePerM2,
      status: this.draft.status,
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
