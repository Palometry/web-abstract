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

  draft = {
    fullName: '',
    phone: '',
    email: '',
    projectName: '',
    areaM2: 0,
    baseRatePerM2: 0,
    pricingRateId: null as number | null,
    status: 'new',
    notes: ''
  };

  constructor(private data: AdminDataService, private router: Router) {}

  ngOnInit() {
    this.loadOptions();
  }

  private async loadOptions() {
    this.loading = true;
    const options = await this.data.getQuoteOptions();
    this.rates = options.pricingRates.filter((rate) => rate.isActive);
    this.loading = false;
  }

  onRateChange() {
    const selected = this.rates.find((rate) => rate.id === this.draft.pricingRateId);
    if (selected) {
      this.draft.baseRatePerM2 = selected.basePricePerM2;
    }
  }

  async createQuote() {
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
    if (!this.draft.pricingRateId && (!Number.isFinite(baseRatePerM2) || baseRatePerM2 <= 0)) {
      this.error = 'La tarifa por m2 es obligatoria.';
      return;
    }

    this.saving = true;
    this.error = '';
    const result = await this.data.createQuote({
      fullName,
      phone,
      email,
      projectName,
      areaM2,
      baseRatePerM2,
      pricingRateId: this.draft.pricingRateId,
      status: this.draft.status,
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
