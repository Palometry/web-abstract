import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AdminDataService,
  AdminPageDetail,
  AdminPageSection,
  AdminPageBlock
} from '../../services/admin-data';

type BlockField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean';
  placeholder?: string;
};

type BlockPreset = {
  value: string;
  label: string;
  fields: BlockField[];
};

type BlockView = AdminPageBlock & { contentText: string; fieldDraft: Record<string, any> };
type SectionView = Omit<AdminPageSection, 'blocks'> & { blocks: BlockView[] };

@Component({
  selector: 'app-admin-content-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-content-detail.component.html',
  styleUrls: ['./admin-content-detail.component.scss']
})
export class AdminContentDetailComponent implements OnInit, AfterViewInit {
  page: AdminPageDetail | null = null;
  sections: SectionView[] = [];
  loading = false;
  error = '';
  savingPage = false;
  sectionDraftUploading = false;
  sectionUploadStates: Record<number, boolean> = {};
  private loaded = false;
  private readonly isBrowser: boolean;
  readonly blockPresets: BlockPreset[] = [
    {
      value: 'text',
      label: 'Texto simple',
      fields: [
        { key: 'text', label: 'Texto', type: 'textarea', placeholder: 'Escribe el contenido...' }
      ]
    },
    {
      value: 'hero',
      label: 'Hero (titulo y subtitulo)',
      fields: [
        { key: 'title', label: 'Titulo', type: 'text' },
        { key: 'subtitle', label: 'Subtitulo', type: 'textarea' }
      ]
    },
    {
      value: 'about_intro',
      label: 'Sobre nosotros (intro)',
      fields: [
        { key: 'title', label: 'Titulo', type: 'text' },
        { key: 'summary', label: 'Resumen', type: 'textarea' }
      ]
    },
    {
      value: 'about_card',
      label: 'Sobre nosotros (tarjeta)',
      fields: [
        { key: 'title', label: 'Titulo', type: 'text' },
        { key: 'body', label: 'Contenido', type: 'textarea' }
      ]
    },
    {
      value: 'services_intro',
      label: 'Servicios (intro)',
      fields: [
        { key: 'title', label: 'Titulo', type: 'text' },
        { key: 'summary', label: 'Resumen', type: 'textarea' }
      ]
    },
    {
      value: 'services_item',
      label: 'Servicio (item)',
      fields: [
        { key: 'title', label: 'Nombre del servicio', type: 'text' },
        { key: 'description', label: 'Descripcion', type: 'textarea' },
        { key: 'icon', label: 'Icono (emoji o texto corto)', type: 'text', placeholder: 'ej: 🏗️' },
        {
          key: 'url',
          label: 'URL (opcional)',
          type: 'text',
          placeholder: 'ej: /projects o https://...'
        },
        { key: 'openInNewTab', label: 'Abrir en nueva pestaña', type: 'boolean' }
      ]
    },
    {
      value: 'tag_link',
      label: 'Etiqueta con enlace',
      fields: [
        { key: 'label', label: 'Etiqueta', type: 'text' },
        {
          key: 'url',
          label: 'URL',
          type: 'text',
          placeholder: 'ej: /projects o https://...'
        },
        { key: 'openInNewTab', label: 'Abrir en nueva pestaña', type: 'boolean' }
      ]
    }
  ];

  pageDraft = {
    title: '',
    slug: '',
    status: 'draft',
    metaTitle: '',
    metaDescription: ''
  };

  sectionDraft = {
    sectionKey: '',
    title: '',
    description: '',
    imageUrl: '',
    sortOrder: 0,
    isVisible: true
  };

  blockDrafts: Record<
    number,
    { blockType: string; sortOrder: number; isVisible: boolean; contentText: string; fieldDraft: Record<string, any> }
  > = {};

  constructor(
    private route: ActivatedRoute,
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
    if (!this.isBrowser) {
      return;
    }
    if (this.loaded && this.page) {
      return;
    }
    await this.loadPage();
    this.loaded = !!this.page;
    this.cdr.detectChanges();
  }

  async loadPage() {
    this.loading = true;
    this.error = '';
    try {
      const pageId = Number(this.route.snapshot.paramMap.get('id'));
      if (!Number.isFinite(pageId)) {
        this.error = 'Pagina invalida.';
        return;
      }
      const page = await this.data.getPageDetail(pageId);
      if (!page) {
        this.error = 'No se encontro la pagina.';
        return;
      }
      this.page = page;
      this.pageDraft = {
        title: page.title,
        slug: page.slug,
        status: page.status,
        metaTitle: page.metaTitle ?? '',
        metaDescription: page.metaDescription ?? ''
      };
      const sections = Array.isArray(page.sections) ? page.sections : [];
      this.sections = sections.map((section) => ({
        ...section,
        blocks: section.blocks.map((block) => {
          const preset = this.getPreset(block.blockType);
          return {
            ...block,
            contentText:
              typeof block.content === 'string'
                ? block.content
                : JSON.stringify(block.content ?? {}, null, 2),
            fieldDraft: preset ? this.buildFieldDraft(preset, block.content) : {}
          };
        })
      }));
      this.blockDrafts = {};
      this.sectionUploadStates = {};
      this.sections.forEach((section) => {
        const defaultPreset = this.blockPresets[0];
        this.blockDrafts[section.id] = {
          blockType: defaultPreset.value,
          sortOrder: 0,
          isVisible: true,
          contentText: '',
          fieldDraft: this.buildEmptyFieldDraft(defaultPreset)
        };
        this.sectionUploadStates[section.id] = false;
      });
    } catch {
      this.error = 'No se pudo cargar la pagina.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async savePage() {
    if (!this.page) {
      return;
    }
    this.savingPage = true;
    this.error = '';
    const result = await this.data.updatePage(this.page.id, {
      title: this.pageDraft.title.trim(),
      slug: this.pageDraft.slug.trim(),
      status: this.pageDraft.status,
      metaTitle: this.pageDraft.metaTitle || null,
      metaDescription: this.pageDraft.metaDescription || null
    });
    this.savingPage = false;
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo guardar la pagina.';
      return;
    }
    await this.loadPage();
  }

  async createSection() {
    if (!this.page) {
      return;
    }
    this.error = '';
    const sectionKey = this.sectionDraft.sectionKey.trim();
    if (!sectionKey) {
      this.error = 'sectionKey es obligatorio.';
      return;
    }
    const result = await this.data.createSection(this.page.id, {
      sectionKey,
      title: this.sectionDraft.title || null,
      description: this.sectionDraft.description || null,
      imageUrl: this.sectionDraft.imageUrl || null,
      sortOrder: this.sectionDraft.sortOrder,
      isVisible: this.sectionDraft.isVisible
    });
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo crear la seccion.';
      return;
    }
    this.sectionDraft = {
      sectionKey: '',
      title: '',
      description: '',
      imageUrl: '',
      sortOrder: 0,
      isVisible: true
    };
    await this.loadPage();
  }

  async saveSection(section: SectionView) {
    this.error = '';
    const result = await this.data.updateSection(section.id, {
      sectionKey: section.sectionKey.trim(),
      title: section.title ?? null,
      description: section.description ?? null,
      imageUrl: section.imageUrl ?? null,
      sortOrder: section.sortOrder,
      isVisible: section.isVisible
    });
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo actualizar la seccion.';
      return;
    }
    await this.loadPage();
  }

  async deleteSection(section: SectionView) {
    const confirmed = confirm(`Eliminar la seccion "${section.sectionKey}"?`);
    if (!confirmed) {
      return;
    }
    const ok = await this.data.deleteSection(section.id);
    if (!ok) {
      this.error = 'No se pudo eliminar la seccion.';
      return;
    }
    await this.loadPage();
  }

  async createBlock(section: SectionView) {
    const draft = this.blockDrafts[section.id];
    if (!draft.blockType.trim()) {
      this.error = 'blockType es obligatorio.';
      return;
    }
    const preset = this.getPreset(draft.blockType);
    const content = preset ? this.buildContentFromFields(preset, draft.fieldDraft) : this.parseContent(draft.contentText);
    const result = await this.data.createBlock(section.id, {
      blockType: draft.blockType.trim(),
      content,
      sortOrder: draft.sortOrder,
      isVisible: draft.isVisible
    });
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo crear el bloque.';
      return;
    }
    const defaultPreset = this.blockPresets[0];
    this.blockDrafts[section.id] = {
      blockType: defaultPreset.value,
      sortOrder: 0,
      isVisible: true,
      contentText: '',
      fieldDraft: this.buildEmptyFieldDraft(defaultPreset)
    };
    await this.loadPage();
  }

  async saveBlock(section: SectionView, block: BlockView) {
    const preset = this.getPreset(block.blockType);
    const content = preset ? this.buildContentFromFields(preset, block.fieldDraft) : this.parseContent(block.contentText);
    const result = await this.data.updateBlock(block.id, {
      blockType: block.blockType.trim(),
      content,
      sortOrder: block.sortOrder,
      isVisible: block.isVisible
    });
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo actualizar el bloque.';
      return;
    }
    await this.loadPage();
  }

  async deleteBlock(block: BlockView) {
    const confirmed = confirm('Eliminar este bloque?');
    if (!confirmed) {
      return;
    }
    const ok = await this.data.deleteBlock(block.id);
    if (!ok) {
      this.error = 'No se pudo eliminar el bloque.';
      return;
    }
    await this.loadPage();
  }

  onBlockTypeChange(block: BlockView) {
    const preset = this.getPreset(block.blockType);
    block.fieldDraft = preset ? this.buildEmptyFieldDraft(preset) : {};
  }

  onDraftBlockTypeChange(sectionId: number) {
    const draft = this.blockDrafts[sectionId];
    const preset = this.getPreset(draft.blockType);
    draft.fieldDraft = preset ? this.buildEmptyFieldDraft(preset) : {};
  }

  hasPreset(blockType: string) {
    return !!this.getPreset(blockType);
  }

  getPreset(blockType: string) {
    return this.blockPresets.find((preset) => preset.value === blockType);
  }

  private buildEmptyFieldDraft(preset: BlockPreset) {
    const draft: Record<string, any> = {};
    preset.fields.forEach((field) => {
      draft[field.key] = field.type === 'number' ? 0 : field.type === 'boolean' ? false : '';
    });
    return draft;
  }

  private buildFieldDraft(preset: BlockPreset, content: unknown) {
    const base = this.buildEmptyFieldDraft(preset);
    if (!content || typeof content !== 'object') {
      return base;
    }
    const asRecord = content as Record<string, any>;
    preset.fields.forEach((field) => {
      if (asRecord[field.key] !== undefined && asRecord[field.key] !== null) {
        base[field.key] = asRecord[field.key];
      }
    });
    return base;
  }

  private buildContentFromFields(preset: BlockPreset, fields: Record<string, any>) {
    const content: Record<string, any> = {};
    preset.fields.forEach((field) => {
      content[field.key] = fields[field.key];
    });
    return content;
  }

  async uploadSectionDraftImage(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.sectionDraftUploading = true;
    this.error = '';
    const result = await this.data.uploadMedia(file, {
      title: this.sectionDraft.title || undefined
    });
    this.sectionDraftUploading = false;
    if (!result.ok || !result.fileUrl) {
      this.error = result.error ?? 'No se pudo subir la imagen.';
      return;
    }
    this.sectionDraft.imageUrl = result.fileUrl;
    if (input) {
      input.value = '';
    }
  }

  async uploadSectionImage(section: SectionView, event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.sectionUploadStates[section.id] = true;
    this.error = '';
    const result = await this.data.uploadMedia(file, {
      title: section.title ?? undefined
    });
    this.sectionUploadStates[section.id] = false;
    if (!result.ok || !result.fileUrl) {
      this.error = result.error ?? 'No se pudo subir la imagen.';
      return;
    }
    section.imageUrl = result.fileUrl;
    if (input) {
      input.value = '';
    }
  }

  private parseContent(value: string): unknown {
    const trimmed = value.trim();
    if (!trimmed) {
      return {};
    }
    try {
      return JSON.parse(trimmed);
    } catch {
      return { text: trimmed };
    }
  }
}
