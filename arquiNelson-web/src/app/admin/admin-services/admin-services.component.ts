import { AfterViewInit, ChangeDetectorRef, Component, HostListener, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminDataService,
  AdminServiceDetail,
  AdminServiceListItem
} from '../../services/admin-data';

type ServiceView = AdminServiceListItem &
  Partial<Omit<AdminServiceDetail, keyof AdminServiceListItem>> & {
    detailsLoaded: boolean;
  } & {
  draft: {
    name: string;
    description: string;
    icon: string;
    imageUrl: string;
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
  uploadingImage = false;
  showAdd = false;
  error = '';
  editingId: number | null = null;
  pendingDeactivation: ServiceView | null = null;
  deactivatedServiceName = '';
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
    imageUrl: '',
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
      this.services = services.map((service) => {
        const view: ServiceView = {
          ...service,
          icon: null,
          imageUrl: service.imageUrl ?? null,
          displayOrder: 0,
          isAddon: false,
          pricingType: 'flat',
          price: 0,
          currency: 'PEN',
          detailsLoaded: false,
          draft: this.buildDraft(service)
        };
        return view;
      });
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
      imageUrl: this.addDraft.imageUrl.trim() || null,
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

  async startEdit(service: ServiceView) {
    this.error = '';
    if (!service.detailsLoaded) {
      this.saving = true;
      const detail = await this.data.getServiceDetail(service.id);
      this.saving = false;
      if (!detail) {
        this.error = 'No se pudo cargar el detalle del servicio.';
        this.cdr.detectChanges();
        return;
      }
      Object.assign(service, detail, { detailsLoaded: true });
    }
    this.editingId = service.id;
    this.resetDraft(service);
    this.cdr.detectChanges();
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
      imageUrl: service.draft.imageUrl.trim() || null,
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

  requestDeactivation(service: ServiceView) {
    this.error = '';
    this.deactivatedServiceName = '';
    this.pendingDeactivation = service;
  }

  cancelDeactivation() {
    if (this.saving) {
      return;
    }
    this.pendingDeactivation = null;
  }

  async confirmDeactivation() {
    const service = this.pendingDeactivation;
    if (!service || this.saving) {
      return;
    }

    this.saving = true;
    this.error = '';
    const ok = await this.data.deactivateService(service.id);
    this.saving = false;
    if (!ok) {
      this.pendingDeactivation = null;
      this.error = 'No se pudo desactivar el servicio.';
      this.cdr.detectChanges();
      return;
    }

    this.pendingDeactivation = null;
    this.editingId = null;
    await this.loadServices();
    this.deactivatedServiceName = service.name;
    this.cdr.detectChanges();
  }

  closeSuccessNotification() {
    this.deactivatedServiceName = '';
  }

  async uploadServiceImage(event: Event, service?: ServiceView) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.error = 'Selecciona un archivo de imagen.';
      input.value = '';
      return;
    }

    this.uploadingImage = true;
    this.error = '';
    const title = service?.draft.name || this.addDraft.name || file.name;
    const result = await this.data.uploadMedia(file, {
      title,
      altText: title || 'Imagen del servicio'
    });
    this.uploadingImage = false;
    input.value = '';

    if (!result.ok || !result.fileUrl) {
      this.error = result.error ?? 'No se pudo subir la imagen.';
      this.cdr.detectChanges();
      return;
    }

    if (service) {
      service.draft.imageUrl = result.fileUrl;
    } else {
      this.addDraft.imageUrl = result.fileUrl;
    }
    this.cdr.detectChanges();
  }

  removeServiceImage(service?: ServiceView) {
    if (service) {
      service.draft.imageUrl = '';
      return;
    }
    this.addDraft.imageUrl = '';
  }

  @HostListener('document:keydown.escape')
  closeNotificationWithEscape() {
    if (this.saving) {
      return;
    }
    this.pendingDeactivation = null;
    this.deactivatedServiceName = '';
  }

  private resetDraft(service: ServiceView) {
    service.draft = this.buildDraft(service);
  }

  private buildDraft(service: Partial<AdminServiceDetail> & AdminServiceListItem) {
    return {
      name: service.name,
      description: service.description,
      icon: service.icon ?? '',
      imageUrl: service.imageUrl ?? '',
      displayOrder:
        typeof service.displayOrder === 'number' && Number.isFinite(service.displayOrder)
          ? service.displayOrder
          : 0,
      public: service.public,
      isAddon: service.isAddon ?? false,
      pricingType: service.pricingType ?? 'flat',
      price:
        typeof service.price === 'number' && Number.isFinite(service.price) ? service.price : 0,
      currency: service.currency ?? 'PEN',
      isActive: typeof service.isActive === 'boolean' ? service.isActive : true
    };
  }

  private resetAddDraft() {
    this.addDraft = {
      name: '',
      description: '',
      icon: '',
      imageUrl: '',
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
