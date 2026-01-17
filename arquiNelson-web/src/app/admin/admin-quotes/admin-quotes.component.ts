import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminDataService, AdminQuote } from '../../services/admin-data';

@Component({
  selector: 'app-admin-quotes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-quotes.component.html',
  styleUrls: ['./admin-quotes.component.scss']
})
export class AdminQuotesComponent implements OnInit, AfterViewInit {
  quotes: AdminQuote[] = [];
  loading = false;
  private loaded = false;
  private readonly isBrowser: boolean;

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
    await this.loadQuotes();
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

  private async loadQuotes() {
    this.loading = true;
    try {
      this.quotes = await this.data.getQuotes();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
