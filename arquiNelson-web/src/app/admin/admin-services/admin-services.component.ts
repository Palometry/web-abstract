import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminDataService, AdminService } from '../../services/admin-data';

type ServiceView = AdminService & {
  draft: {
    name: string;
    description: string;
    icon: string;
    displayOrder: number;
    public: boolean;
    isAddon: boolean;
    pricingType: 'flat' | 'per_m2' | 'percent';
    price: number;
    currency: string;
    isActive: boolean;
  };
};

@Component({
  selector: 'app-admin-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-services.component.html',
  styleUrls: ['./admin-services.component.scss']
})
export class AdminServicesComponent implements OnInit, AfterViewInit {
  services: ServiceView[] = [];
  loading = false;
  saving = false;
  showAdd = false;
  error = '';
  editingId: number | null = null;
  private loaded = false;
  private readonly isBrowser: boolean;

  pricingTypes: Array<{ value: 'flat' | 'per_m2' | 'percent'; label: string }> = [
    { value: 'flat', label: 'Monto fijo' },
    { value: 'per_m2', label: 'Por m2' },
    { value: 'percent', label: 'Porcentaje' }
  ];

  addDraft = {
    name: '',
    description: '',
    icon: '',
    displayOrder: 0,
    public: true,
    isAddon: false,
    pricingType: 'flat' as 'flat' | 'per_m2' | 'percent',
    price: 0,
    currency: 'PEN',
    isActive: true
  };

  constructor(
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
    await this.loadServices();
  }

  private async loadServices() {
    this.loading = true;
    try {
      const services = await this.data.getServices();
      this.services = services.map((service) => ({
        ...service,
        draft: {
          name: service.name,
          description: service.description,
          icon: service.icon ?? '',
          displayOrder: service.displayOrder,
          public: service.public,
          isAddon: service.isAddon,
          pricingType: service.pricingType,
          price: service.price,
          currency: service.currency,
          isActive: service.isActive
        }
      }));
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  toggleAdd() {
    this.showAdd = !this.showAdd;
    if (!this.showAdd) {
      this.resetAddDraft();
    }
  }

  async addService() {
    const name = this.addDraft.name.trim();
    const description = this.addDraft.description.trim();
    if (!name || !description) {
      this.error = 'Nombre y descripcion son obligatorios.';
      return;
    }
    const price = Number(this.addDraft.price);
    if (!Number.isFinite(price) || price < 0) {
      this.error = 'El precio debe ser 0 o mayor.';
      return;
    }
    const displayOrder = Number(this.addDraft.displayOrder);
    if (!Number.isFinite(displayOrder)) {
      this.error = 'El orden debe ser un numero.';
      return;
    }
    this.saving = true;
    this.error = '';
    const result = await this.data.createService({
      name,
      description,
      icon: this.addDraft.icon.trim() || null,
      displayOrder,
      isPublic: this.addDraft.public,
      isAddon: this.addDraft.isAddon,
      pricingType: this.addDraft.pricingType,
      price,
      currency: this.addDraft.currency.trim() || 'PEN',
      isActive: this.addDraft.isActive
    });
    this.saving = false;
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo crear el servicio.';
      return;
    }
    this.showAdd = false;
    this.resetAddDraft();
    await this.loadServices();
  }

  startEdit(service: ServiceView) {
    this.editingId = service.id;
    this.resetDraft(service);
  }

  cancelEdit(service: ServiceView) {
    this.resetDraft(service);
    this.editingId = null;
  }

  isEditing(service: ServiceView) {
    return this.editingId === service.id;
  }

  async saveService(service: ServiceView) {
    const name = service.draft.name.trim();
    const description = service.draft.description.trim();
    if (!name || !description) {
      this.error = 'Nombre y descripcion son obligatorios.';
      return;
    }
    const price = Number(service.draft.price);
    if (!Number.isFinite(price) || price < 0) {
      this.error = 'El precio debe ser 0 o mayor.';
      return;
    }
    const displayOrder = Number(service.draft.displayOrder);
    if (!Number.isFinite(displayOrder)) {
      this.error = 'El orden debe ser un numero.';
      return;
    }
    this.saving = true;
    this.error = '';
    const result = await this.data.updateService(service.id, {
      name,
      description,
      icon: service.draft.icon.trim() || null,
      displayOrder,
      isPublic: service.draft.public,
      isAddon: service.draft.isAddon,
      pricingType: service.draft.pricingType,
      price,
      currency: service.draft.currency.trim() || 'PEN',
      isActive: service.draft.isActive
    });
    this.saving = false;
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo actualizar el servicio.';
      return;
    }
    this.editingId = null;
    await this.loadServices();
  }

  async deactivateService(service: ServiceView) {
    const confirmed = confirm('Desactivar este servicio?');
    if (!confirmed) {
      return;
    }
    this.saving = true;
    this.error = '';
    const ok = await this.data.deactivateService(service.id);
    this.saving = false;
    if (!ok) {
      this.error = 'No se pudo desactivar el servicio.';
      return;
    }
    await this.loadServices();
  }

  private resetDraft(service: ServiceView) {
    service.draft = {
      name: service.name,
      description: service.description,
      icon: service.icon ?? '',
      displayOrder: service.displayOrder,
      public: service.public,
      isAddon: service.isAddon,
      pricingType: service.pricingType,
      price: service.price,
      currency: service.currency,
      isActive: service.isActive
    };
  }

  private resetAddDraft() {
    this.addDraft = {
      name: '',
      description: '',
      icon: '',
      displayOrder: 0,
      public: true,
      isAddon: false,
      pricingType: 'flat',
      price: 0,
      currency: 'PEN',
      isActive: true
    };
  }
}
