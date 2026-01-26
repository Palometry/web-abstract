import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminDataService, AdminPricingRateOption } from '../../services/admin-data';

@Component({
  selector: 'app-admin-quote-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-quote-create.component.html',
  styleUrls: ['./admin-quote-create.component.scss']
})
export class AdminQuoteCreateComponent implements OnInit {
  saving = false;
  loading = false;
  error = '';
  rates: AdminPricingRateOption[] = [];
  readonly todayLabel = new Date().toLocaleDateString('es-PE');
  readonly docTypes = [
    { value: 'DNI', label: 'DNI' },
    { value: 'RUC', label: 'RUC' },
    { value: 'CE', label: 'Carnet de extranjeria' },
    { value: 'PASAPORTE', label: 'Pasaporte' }
  ];

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

  constructor(private data: AdminDataService, private router: Router) {}

  ngOnInit() {
    this.loadOptions();
  }

  private async loadOptions() {
    this.loading = true;
    this.error = '';
    try {
      const options = await this.data.getQuoteOptions();
      this.rates = options.pricingRates.filter((rate) => rate.isActive);
      if (this.rates.length && !this.draft.pricingRateId) {
        this.draft.pricingRateId = this.rates[0].id;
        this.onRateChange();
      }
    } catch {
      this.error = 'No se pudieron cargar las opciones. Verifica el backend.';
    } finally {
      this.loading = false;
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

  get baseCost() {
    const area = Number(this.draft.areaCoveredM2);
    const floors = Number(this.draft.floorCount || 1);
    const rate = Number(this.draft.baseRatePerM2);
    if (!Number.isFinite(area) || !Number.isFinite(rate) || !Number.isFinite(floors)) {
      return 0;
    }
    return Number((area * floors * rate).toFixed(2));
  }

  formatCurrency(value: number, currency: string) {
    const safeCurrency = currency || 'PEN';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: safeCurrency
    }).format(value);
  }

  async createQuote() {
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
    if (!this.draft.pricingRateId && (!Number.isFinite(baseRatePerM2) || baseRatePerM2 <= 0)) {
      this.error = 'La tarifa por m2 es obligatoria.';
      return;
    }

    if (Number.isFinite(areaUncoveredPercent) && (areaUncoveredPercent < 0 || areaUncoveredPercent > 100)) {
      this.error = 'El porcentaje de area libre debe estar entre 0 y 100.';
      return;
    }

    this.saving = true;
    this.error = '';
    const result = await this.data.createQuote({
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
    if (!result.ok || !result.id) {
      this.error = result.error ?? 'No se pudo crear la cotizacion.';
      return;
    }
    this.router.navigate(['/admin/quotes', result.id]);
  }
}
