import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminDataService, AdminPortfolioEntry, AdminProject } from '../../services/admin-data';

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
  projects: AdminProject[] = [];
  loading = false;
  saving = false;
  error = '';
  showAdd = false;
  private loaded = false;
  private readonly isBrowser: boolean;

  addDraft = {
    projectId: 0,
    sortOrder: 0,
    titleOverride: '',
    isVisible: true
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
    await this.loadEntries();
  }

  private async loadEntries() {
    this.loading = true;
    try {
      const [entries, projects] = await Promise.all([
        this.data.getPortfolioEntries(),
        this.data.getProjects()
      ]);
      this.projects = projects;
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

  get availableProjects() {
    return this.projects.filter((project) => !project.portfolio);
  }

  toggleAdd() {
    this.showAdd = !this.showAdd;
    if (!this.showAdd) {
      this.resetAddDraft();
    }
  }

  onProjectSelect() {
    const maxOrder = this.entries.reduce((max, entry) => Math.max(max, entry.order), 0);
    if (!this.addDraft.sortOrder) {
      this.addDraft.sortOrder = maxOrder + 1;
    }
  }

  async addEntry() {
    if (!this.addDraft.projectId) {
      this.error = 'Selecciona un proyecto.';
      return;
    }
    this.saving = true;
    this.error = '';
    const result = await this.data.updateProjectPortfolio(this.addDraft.projectId, {
      titleOverride: this.addDraft.titleOverride.trim() || null,
      sortOrder: this.addDraft.sortOrder,
      isVisible: this.addDraft.isVisible
    });
    this.saving = false;
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo agregar al portafolio.';
      return;
    }
    this.showAdd = false;
    this.resetAddDraft();
    await this.loadEntries();
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

  private resetAddDraft() {
    this.addDraft = {
      projectId: 0,
      sortOrder: 0,
      titleOverride: '',
      isVisible: true
    };
  }
}
