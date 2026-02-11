import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminDataService, AdminPortfolioEntry } from '../../services/admin-data';

type PortfolioEntryView = AdminPortfolioEntry & {
  draft: {
    sortOrder: number;
    titleOverride: string;
    isVisible: boolean;
  };
};

@Component({
  selector: 'app-admin-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-portfolio.component.html',
  styleUrls: ['./admin-portfolio.component.scss']
})
export class AdminPortfolioComponent implements OnInit, AfterViewInit {
  entries: PortfolioEntryView[] = [];
  loading = false;
  saving = false;
  error = '';
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
    await this.loadEntries();
  }

  private async loadEntries() {
    this.loading = true;
    try {
      const entries = await this.data.getPortfolioEntries();
      this.entries = entries.map((entry) => ({
        ...entry,
        draft: {
          sortOrder: entry.order,
          titleOverride: entry.titleOverride ?? '',
          isVisible: entry.visible
        }
      }));
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async saveEntry(entry: PortfolioEntryView) {
    this.saving = true;
    this.error = '';
    const titleOverride = entry.draft.titleOverride.trim() || null;
    if (!entry.projectId && !titleOverride) {
      this.saving = false;
      this.error = 'El titulo es obligatorio para entradas sin proyecto.';
      return;
    }
    const result = await this.data.updatePortfolioEntry(entry.id, {
      titleOverride,
      sortOrder: entry.draft.sortOrder,
      isVisible: entry.draft.isVisible
    });
    this.saving = false;
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo actualizar el portafolio.';
      return;
    }
    await this.loadEntries();
  }

  async removeEntry(entry: PortfolioEntryView) {
    const confirmed = confirm(
      entry.projectId ? 'Quitar este proyecto del portafolio?' : 'Eliminar este portafolio?'
    );
    if (!confirmed) {
      return;
    }
    this.saving = true;
    this.error = '';
    const ok = entry.projectId
      ? await this.data.removeProjectPortfolio(entry.projectId)
      : await this.data.deletePortfolioEntry(entry.id);
    this.saving = false;
    if (!ok) {
      this.error = 'No se pudo quitar del portafolio.';
      return;
    }
    await this.loadEntries();
  }
}
