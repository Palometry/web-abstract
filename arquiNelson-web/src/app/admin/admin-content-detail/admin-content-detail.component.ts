import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AdminDataService,
  AdminPageDetail,
  AdminPageSection,
  AdminPageBlock
} from '../../services/admin-data';

type BlockView = AdminPageBlock & { contentText: string };
type SectionView = Omit<AdminPageSection, 'blocks'> & { blocks: BlockView[] };

@Component({
  selector: 'app-admin-content-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-content-detail.component.html',
  styleUrls: ['./admin-content-detail.component.scss']
})
export class AdminContentDetailComponent implements OnInit {
  page: AdminPageDetail | null = null;
  sections: SectionView[] = [];
  loading = false;
  error = '';
  savingPage = false;

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

  blockDrafts: Record<number, { blockType: string; sortOrder: number; isVisible: boolean; contentText: string }> = {};

  constructor(private route: ActivatedRoute, private data: AdminDataService) {}

  ngOnInit() {
    this.loadPage();
  }

  async loadPage() {
    const pageId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(pageId)) {
      this.error = 'Pagina invalida.';
      return;
    }
    this.loading = true;
    this.error = '';
    const page = await this.data.getPageDetail(pageId);
    if (!page) {
      this.error = 'No se encontro la pagina.';
      this.loading = false;
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
    this.sections = page.sections.map((section) => ({
      ...section,
      blocks: section.blocks.map((block) => ({
        ...block,
        contentText:
          typeof block.content === 'string'
            ? block.content
            : JSON.stringify(block.content ?? {}, null, 2)
      }))
    }));
    this.blockDrafts = {};
    this.sections.forEach((section) => {
      this.blockDrafts[section.id] = {
        blockType: '',
        sortOrder: 0,
        isVisible: true,
        contentText: '{}'
      };
    });
    this.loading = false;
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
    const content = this.parseContent(draft.contentText);
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
    this.blockDrafts[section.id] = { blockType: '', sortOrder: 0, isVisible: true, contentText: '{}' };
    await this.loadPage();
  }

  async saveBlock(section: SectionView, block: BlockView) {
    const content = this.parseContent(block.contentText);
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
