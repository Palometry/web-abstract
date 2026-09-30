import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminDataService,
  AdminStoreProduct,
  AdminStoreProductPayload
} from '../../services/admin-data';

type ProductDraft = Omit<AdminStoreProductPayload, 'includes' | 'extraDetails'> & {
  includesText: string;
  extraDetailsText: string;
};

@Component({
  selector: 'app-admin-store',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-store.component.html',
  styleUrls: ['./admin-store.component.scss']
})
export class AdminStoreComponent implements OnInit {
  products: AdminStoreProduct[] = [];
  draft = this.emptyDraft();
  editingId: number | null = null;
  showEditor = false;
  loading = false;
  saving = false;
  uploading = false;
  error = '';
  success = '';
  private readonly isBrowser: boolean;

  constructor(
    private readonly data: AdminDataService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      void this.loadProducts();
    }
  }

  newProduct(): void {
    this.editingId = null;
    this.draft = this.emptyDraft();
    this.showEditor = true;
    this.error = '';
    this.success = '';
  }

  editProduct(product: AdminStoreProduct): void {
    this.editingId = product.id;
    this.draft = {
      code: product.code,
      title: product.title,
      category: product.category,
      software: product.software,
      priceFrom: product.priceFrom,
      currency: product.currency,
      delivery: product.delivery,
      format: product.format,
      support: product.support,
      idealFor: product.idealFor,
      description: product.description,
      longDescription: product.longDescription,
      includesText: product.includes.join('\n'),
      extraDetailsText: product.extraDetails.map((item) => `${item.label} | ${item.value}`).join('\n'),
      imageUrl: product.imageUrl,
      accent: product.accent,
      sortOrder: product.sortOrder,
      isActive: product.isActive
    };
    this.showEditor = true;
    this.error = '';
    this.success = '';
  }

  cancelEdit(): void {
    this.showEditor = false;
    this.editingId = null;
    this.error = '';
  }

  async saveProduct(): Promise<void> {
    if (!this.draft.code.trim() || !this.draft.title.trim() || !this.draft.category.trim() || !this.draft.description.trim()) {
      this.error = 'Codigo, nombre, categoria y descripcion son obligatorios.';
      return;
    }
    if (!Number.isFinite(Number(this.draft.priceFrom)) || Number(this.draft.priceFrom) < 0) {
      this.error = 'El precio debe ser cero o mayor.';
      return;
    }

    const payload = this.toPayload();
    this.saving = true;
    this.error = '';
    this.success = '';
    const result = this.editingId === null
      ? await this.data.createStoreProduct(payload)
      : await this.data.updateStoreProduct(this.editingId, payload);
    this.saving = false;

    if (!result.ok) {
      this.error = result.error ?? 'No se pudo guardar el producto.';
      return;
    }

    this.success = this.editingId === null ? 'Producto creado.' : 'Producto actualizado.';
    this.showEditor = false;
    this.editingId = null;
    await this.loadProducts();
  }

  async deleteProduct(product: AdminStoreProduct): Promise<void> {
    if (!confirm(`Eliminar "${product.title}" de la tienda?`)) {
      return;
    }
    this.error = '';
    if (!await this.data.deleteStoreProduct(product.id)) {
      this.error = 'No se pudo eliminar el producto.';
      return;
    }
    await this.loadProducts();
  }

  async uploadImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.error = 'Selecciona un archivo de imagen.';
      input.value = '';
      return;
    }

    this.uploading = true;
    this.error = '';
    const result = await this.data.uploadMedia(file, {
      title: this.draft.title || file.name,
      altText: this.draft.title || 'Producto de tienda'
    });
    this.uploading = false;
    input.value = '';
    if (!result.ok || !result.fileUrl) {
      this.error = result.error ?? 'No se pudo subir la imagen.';
      return;
    }
    this.draft.imageUrl = result.fileUrl;
    this.cdr.detectChanges();
  }

  trackProduct(_index: number, product: AdminStoreProduct): number {
    return product.id;
  }

  private async loadProducts(): Promise<void> {
    this.loading = true;
    this.products = await this.data.getStoreProducts();
    this.loading = false;
    this.cdr.detectChanges();
  }

  private toPayload(): AdminStoreProductPayload {
    return {
      code: this.draft.code.trim(),
      title: this.draft.title.trim(),
      category: this.draft.category.trim(),
      software: this.draft.software.trim(),
      priceFrom: Number(this.draft.priceFrom),
      currency: this.draft.currency.trim().toUpperCase() || 'PEN',
      delivery: this.draft.delivery.trim(),
      format: this.draft.format.trim(),
      support: this.draft.support.trim(),
      idealFor: this.draft.idealFor.trim(),
      description: this.draft.description.trim(),
      longDescription: this.draft.longDescription.trim(),
      includes: this.lines(this.draft.includesText),
      extraDetails: this.lines(this.draft.extraDetailsText).map((line) => {
        const [label, ...value] = line.split('|');
        return { label: label.trim(), value: value.join('|').trim() };
      }).filter((item) => item.label && item.value),
      imageUrl: this.draft.imageUrl?.trim() || null,
      accent: this.draft.accent,
      sortOrder: Number(this.draft.sortOrder) || 0,
      isActive: this.draft.isActive
    };
  }

  private lines(value: string): string[] {
    return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }

  private emptyDraft(): ProductDraft {
    return {
      code: '', title: '', category: '', software: '', priceFrom: 0, currency: 'PEN',
      delivery: '', format: '', support: '', idealFor: '', description: '', longDescription: '',
      includesText: '', extraDetailsText: '', imageUrl: null, accent: '#9f3232', sortOrder: 0,
      isActive: true
    };
  }
}
