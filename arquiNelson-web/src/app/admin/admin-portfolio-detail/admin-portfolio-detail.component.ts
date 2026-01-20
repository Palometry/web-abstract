import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminDataService, AdminPortfolioDetail, AdminProject } from '../../services/admin-data';

type ImageDraft = {
  mediaId: number;
  fileUrl: string;
};

type SpecDraft = {
  label: string;
  value: string;
};

type BlockDraft = {
  blockType: 'text' | 'image';
  textContent: string;
  mediaId: number | null;
  fileUrl: string | null;
  caption: string;
  layout: 'wide' | 'inline';
  isVisible: boolean;
};

@Component({
  selector: 'app-admin-portfolio-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-portfolio-detail.component.html',
  styleUrls: ['./admin-portfolio-detail.component.scss']
})
export class AdminPortfolioDetailComponent implements OnInit {
  loading = false;
  saving = false;
  error = '';
  entryId = 0;
  isCreate = false;
  selectedProjectId = 0;
  availableProjects: AdminProject[] = [];
  entry?: AdminPortfolioDetail | null;
  private readonly isBrowser: boolean;

  form = {
    titleOverride: '',
    category: '',
    summary: '',
    autocadUrl: '',
    sortOrder: 0,
    isVisible: true,
    coverImage: null as ImageDraft | null,
    heroImages: [] as ImageDraft[],
    galleryImages: [] as ImageDraft[],
    specs: [] as SpecDraft[],
    tags: [] as string[],
    blocks: [] as BlockDraft[]
  };

  newTag = '';

  constructor(
    private route: ActivatedRoute,
    private data: AdminDataService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (!this.isBrowser) {
      return;
    }
    this.route.paramMap.subscribe((params) => {
      const rawId = params.get('id');
      if (rawId === 'new') {
        this.isCreate = true;
        this.entryId = 0;
        this.loadCreateData();
        return;
      }
      const id = Number(rawId);
      if (!Number.isFinite(id)) {
        this.error = 'ID de portafolio invalido.';
        return;
      }
      this.isCreate = false;
      this.entryId = id;
      this.loadEntry();
    });
  }

  private async loadEntry() {
    this.loading = true;
    this.error = '';
    this.entry = await this.data.getPortfolioEntryDetail(this.entryId);
    this.loading = false;
    if (!this.entry) {
      this.error = 'No se pudo cargar el portafolio.';
      this.cdr.detectChanges();
      return;
    }
    this.form = {
      titleOverride: this.entry.titleOverride ?? '',
      category: this.entry.category ?? '',
      summary: this.entry.summary ?? '',
      autocadUrl: this.entry.autocadUrl ?? '',
      sortOrder: this.entry.sortOrder ?? 0,
      isVisible: this.entry.isVisible,
      coverImage: this.entry.images.cover
        ? { mediaId: this.entry.images.cover.mediaId, fileUrl: this.entry.images.cover.fileUrl }
        : null,
      heroImages: this.entry.images.hero.map((img) => ({
        mediaId: img.mediaId,
        fileUrl: img.fileUrl
      })),
      galleryImages: this.entry.images.gallery.map((img) => ({
        mediaId: img.mediaId,
        fileUrl: img.fileUrl
      })),
      specs: this.entry.specs.map((spec) => ({
        label: spec.label,
        value: spec.value
      })),
      tags: this.entry.tags.map((tag) => tag.tag),
      blocks: this.entry.blocks.map((block) => ({
        blockType: block.blockType,
        textContent: block.textContent ?? '',
        mediaId: block.mediaId ?? null,
        fileUrl: block.fileUrl ?? null,
        caption: block.caption ?? '',
        layout: block.layout ?? 'inline',
        isVisible: block.isVisible
      }))
    };
    this.cdr.detectChanges();
  }

  private async loadCreateData() {
    this.loading = true;
    this.error = '';
    const [projects, entries] = await Promise.all([
      this.data.getProjects(),
      this.data.getPortfolioEntries()
    ]);
    this.availableProjects = projects.filter((project) => !project.portfolio);
    const maxOrder = entries.reduce((max, entry) => Math.max(max, entry.order), 0);
    this.form = {
      titleOverride: '',
      category: '',
      summary: '',
      autocadUrl: '',
      sortOrder: maxOrder + 1,
      isVisible: true,
      coverImage: null,
      heroImages: [],
      galleryImages: [],
      specs: [],
      tags: [],
      blocks: []
    };
    this.selectedProjectId = this.availableProjects[0]?.id ?? 0;
    this.loading = false;
    if (!this.availableProjects.length) {
      this.error = 'No hay proyectos disponibles para agregar.';
    }
    this.cdr.detectChanges();
  }

  async uploadCover(event: Event) {
    const file = this.extractFile(event);
    if (!file) {
      return;
    }
    const result = await this.data.uploadMedia(file);
    if (result.ok && result.id && result.fileUrl) {
      this.form.coverImage = { mediaId: result.id, fileUrl: result.fileUrl };
    } else {
      this.error = result.error ?? 'No se pudo subir la imagen.';
    }
    this.clearFileInput(event);
  }

  async uploadHero(event: Event) {
    const file = this.extractFile(event);
    if (!file) {
      return;
    }
    const result = await this.data.uploadMedia(file);
    if (result.ok && result.id && result.fileUrl) {
      this.form.heroImages.push({ mediaId: result.id, fileUrl: result.fileUrl });
    } else {
      this.error = result.error ?? 'No se pudo subir la imagen.';
    }
    this.clearFileInput(event);
  }

  async uploadGallery(event: Event) {
    const file = this.extractFile(event);
    if (!file) {
      return;
    }
    const result = await this.data.uploadMedia(file);
    if (result.ok && result.id && result.fileUrl) {
      this.form.galleryImages.push({ mediaId: result.id, fileUrl: result.fileUrl });
    } else {
      this.error = result.error ?? 'No se pudo subir la imagen.';
    }
    this.clearFileInput(event);
  }

  async uploadBlockImage(block: BlockDraft, event: Event) {
    const file = this.extractFile(event);
    if (!file) {
      return;
    }
    const result = await this.data.uploadMedia(file);
    if (result.ok && result.id && result.fileUrl) {
      block.mediaId = result.id;
      block.fileUrl = result.fileUrl;
    } else {
      this.error = result.error ?? 'No se pudo subir la imagen.';
    }
    this.clearFileInput(event);
  }

  removeCover() {
    this.form.coverImage = null;
  }

  removeHero(index: number) {
    this.form.heroImages.splice(index, 1);
  }

  moveHero(index: number, direction: number) {
    const target = index + direction;
    if (target < 0 || target >= this.form.heroImages.length) {
      return;
    }
    const item = this.form.heroImages.splice(index, 1)[0];
    this.form.heroImages.splice(target, 0, item);
  }

  removeGallery(index: number) {
    this.form.galleryImages.splice(index, 1);
  }

  moveGallery(index: number, direction: number) {
    const target = index + direction;
    if (target < 0 || target >= this.form.galleryImages.length) {
      return;
    }
    const item = this.form.galleryImages.splice(index, 1)[0];
    this.form.galleryImages.splice(target, 0, item);
  }

  addSpec() {
    this.form.specs.push({ label: '', value: '' });
  }

  removeSpec(index: number) {
    this.form.specs.splice(index, 1);
  }

  addTag() {
    const tag = this.newTag.trim();
    if (!tag) {
      return;
    }
    this.form.tags.push(tag);
    this.newTag = '';
  }

  removeTag(index: number) {
    this.form.tags.splice(index, 1);
  }

  addTextBlock() {
    this.form.blocks.push({
      blockType: 'text',
      textContent: '',
      mediaId: null,
      fileUrl: null,
      caption: '',
      layout: 'inline',
      isVisible: true
    });
  }

  addImageBlock() {
    this.form.blocks.push({
      blockType: 'image',
      textContent: '',
      mediaId: null,
      fileUrl: null,
      caption: '',
      layout: 'inline',
      isVisible: true
    });
  }

  removeBlock(index: number) {
    this.form.blocks.splice(index, 1);
  }

  moveBlock(index: number, direction: number) {
    const target = index + direction;
    if (target < 0 || target >= this.form.blocks.length) {
      return;
    }
    const item = this.form.blocks.splice(index, 1)[0];
    this.form.blocks.splice(target, 0, item);
  }

  async save() {
    this.saving = true;
    this.error = '';
    const payload = {
      titleOverride: this.form.titleOverride.trim() || null,
      category: this.form.category.trim() || null,
      summary: this.form.summary.trim() || null,
      autocadUrl: this.form.autocadUrl.trim() || null,
      sortOrder: this.form.sortOrder,
      isVisible: this.form.isVisible,
      coverMediaId: this.form.coverImage?.mediaId ?? null,
      heroMediaIds: this.form.heroImages.map((img) => img.mediaId),
      galleryMediaIds: this.form.galleryImages.map((img) => img.mediaId),
      specs: this.form.specs
        .map((spec) => ({
          label: spec.label.trim(),
          value: spec.value.trim()
        }))
        .filter((spec) => spec.label && spec.value),
      tags: this.form.tags.map((tag) => tag.trim()).filter(Boolean),
      blocks: this.form.blocks.map((block) => ({
        blockType: block.blockType,
        textContent: block.blockType === 'text' ? block.textContent.trim() : null,
        mediaId: block.blockType === 'image' ? block.mediaId : null,
        caption: block.caption.trim() || null,
        layout: block.layout,
        isVisible: block.isVisible
      }))
    };

    if (this.isCreate) {
      if (!this.selectedProjectId) {
        this.saving = false;
        this.error = 'Selecciona un proyecto.';
        return;
      }
      const createResult = await this.data.updateProjectPortfolio(this.selectedProjectId, {
        titleOverride: payload.titleOverride,
        category: payload.category,
        summary: payload.summary,
        autocadUrl: payload.autocadUrl,
        sortOrder: payload.sortOrder,
        isVisible: payload.isVisible
      });
      if (!createResult.ok || !createResult.id) {
        this.saving = false;
        this.error = createResult.error ?? 'No se pudo crear el portafolio.';
        return;
      }
      const detailResult = await this.data.updatePortfolioEntry(createResult.id, payload);
      this.saving = false;
      if (!detailResult.ok) {
        this.error = detailResult.error ?? 'Se creo el portafolio, pero no se guardaron los detalles.';
        return;
      }
      await this.router.navigate(['/admin/portfolio', createResult.id]);
      return;
    }

    if (!this.entryId) {
      this.saving = false;
      this.error = 'Portafolio invalido.';
      return;
    }

    const result = await this.data.updatePortfolioEntry(this.entryId, payload);
    this.saving = false;
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo guardar.';
      return;
    }
    await this.loadEntry();
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
