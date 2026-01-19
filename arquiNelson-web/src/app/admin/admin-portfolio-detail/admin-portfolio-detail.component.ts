import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminDataService, AdminPortfolioDetail } from '../../services/admin-data';

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
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (!this.isBrowser) {
      return;
    }
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isFinite(id)) {
        this.error = 'ID de portafolio invalido.';
        return;
      }
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
    if (!this.entryId) {
      return;
    }
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
