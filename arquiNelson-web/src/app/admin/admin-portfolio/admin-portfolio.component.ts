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
    const result = await this.data.updateProjectPortfolio(entry.projectId, {
      titleOverride: entry.draft.titleOverride.trim() || null,
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
    const confirmed = confirm('Quitar este proyecto del portafolio?');
    if (!confirmed) {
      return;
    }
    this.saving = true;
    this.error = '';
    const ok = await this.data.removeProjectPortfolio(entry.projectId);
    this.saving = false;
    if (!ok) {
      this.error = 'No se pudo quitar del portafolio.';
      return;
    }
    await this.loadEntries();
  }
}
