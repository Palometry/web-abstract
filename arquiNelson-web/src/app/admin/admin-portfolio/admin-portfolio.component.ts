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

type ImageDraft = {
  mediaId: number;
  fileUrl: string;
};

type SpecDraft = {
  label: string;
  value: string;
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
    isVisible: true,
    category: '',
    summary: '',
    autocadUrl: '',
    coverImage: null as ImageDraft | null,
    heroImages: [] as ImageDraft[],
    galleryImages: [] as ImageDraft[],
    specs: [] as SpecDraft[],
    tags: [] as string[]
  };

  newTag = '';

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
    if (!result.ok) {
      this.saving = false;
      this.error = result.error ?? 'No se pudo agregar al portafolio.';
      return;
    }

    const detailPayload = this.buildAddDetailPayload();
    if (result.id && detailPayload) {
      const detailResult = await this.data.updatePortfolioEntry(result.id, detailPayload);
      if (!detailResult.ok) {
        this.error = detailResult.error ?? 'Se creo el portafolio, pero no se guardaron los detalles.';
      }
    }

    this.saving = false;
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
      isVisible: true,
      category: '',
      summary: '',
      autocadUrl: '',
      coverImage: null,
      heroImages: [],
      galleryImages: [],
      specs: [],
      tags: []
    };
    this.newTag = '';
  }

  async uploadAddCover(event: Event) {
    const file = this.extractFile(event);
    if (!file) {
      return;
    }
    const result = await this.data.uploadMedia(file);
    if (result.ok && result.id && result.fileUrl) {
      this.addDraft.coverImage = { mediaId: result.id, fileUrl: result.fileUrl };
    } else {
      this.error = result.error ?? 'No se pudo subir la imagen.';
    }
    this.clearFileInput(event);
  }

  async uploadAddHero(event: Event) {
    const file = this.extractFile(event);
    if (!file) {
      return;
    }
    const result = await this.data.uploadMedia(file);
    if (result.ok && result.id && result.fileUrl) {
      this.addDraft.heroImages.push({ mediaId: result.id, fileUrl: result.fileUrl });
    } else {
      this.error = result.error ?? 'No se pudo subir la imagen.';
    }
    this.clearFileInput(event);
  }

  async uploadAddGallery(event: Event) {
    const file = this.extractFile(event);
    if (!file) {
      return;
    }
    const result = await this.data.uploadMedia(file);
    if (result.ok && result.id && result.fileUrl) {
      this.addDraft.galleryImages.push({ mediaId: result.id, fileUrl: result.fileUrl });
    } else {
      this.error = result.error ?? 'No se pudo subir la imagen.';
    }
    this.clearFileInput(event);
  }

  removeAddCover() {
    this.addDraft.coverImage = null;
  }

  removeAddHero(index: number) {
    this.addDraft.heroImages.splice(index, 1);
  }

  removeAddGallery(index: number) {
    this.addDraft.galleryImages.splice(index, 1);
  }

  addAddSpec() {
    this.addDraft.specs.push({ label: '', value: '' });
  }

  removeAddSpec(index: number) {
    this.addDraft.specs.splice(index, 1);
  }

  addAddTag() {
    const tag = this.newTag.trim();
    if (!tag) {
      return;
    }
    this.addDraft.tags.push(tag);
    this.newTag = '';
  }

  removeAddTag(index: number) {
    this.addDraft.tags.splice(index, 1);
  }

  private buildAddDetailPayload() {
    const hasImages =
      !!this.addDraft.coverImage ||
      this.addDraft.heroImages.length > 0 ||
      this.addDraft.galleryImages.length > 0;
    const hasContent =
      !!this.addDraft.category.trim() ||
      !!this.addDraft.summary.trim() ||
      !!this.addDraft.autocadUrl.trim() ||
      this.addDraft.specs.length > 0 ||
      this.addDraft.tags.length > 0;

    if (!hasImages && !hasContent) {
      return null;
    }

    return {
      titleOverride: this.addDraft.titleOverride.trim() || null,
      category: this.addDraft.category.trim() || null,
      summary: this.addDraft.summary.trim() || null,
      autocadUrl: this.addDraft.autocadUrl.trim() || null,
      coverMediaId: this.addDraft.coverImage?.mediaId ?? null,
      heroMediaIds: this.addDraft.heroImages.map((img) => img.mediaId),
      galleryMediaIds: this.addDraft.galleryImages.map((img) => img.mediaId),
      specs: this.addDraft.specs
        .map((spec) => ({
          label: spec.label.trim(),
          value: spec.value.trim()
        }))
        .filter((spec) => spec.label && spec.value),
      tags: this.addDraft.tags.map((tag) => tag.trim()).filter(Boolean)
    };
  }

  private extractFile(event: Event): File | null {
    const input = event.target as HTMLInputElement;
    return input?.files?.[0] ?? null;
  }

  private clearFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }
}
