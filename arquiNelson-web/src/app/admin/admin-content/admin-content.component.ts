import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminDataService, AdminPage } from '../../services/admin-data';

@Component({
  selector: 'app-admin-content',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-content.component.html',
  styleUrls: ['./admin-content.component.scss']
})
export class AdminContentComponent implements OnInit, AfterViewInit {
  pages: AdminPage[] = [];
  loading = false;
  error = '';
  creating = false;
  newPage = {
    title: '',
    slug: '',
    status: 'draft'
  };
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
    await this.loadPages();
  }

  formatStatus(status: string) {
    return status === 'draft' ? 'Borrador' : 'Publicado';
  }

  async createPage() {
    this.error = '';
    const title = this.newPage.title.trim();
    const slug = this.newPage.slug.trim();
    if (!title || !slug) {
      this.error = 'Titulo y slug son obligatorios.';
      return;
    }
    this.creating = true;
    const result = await this.data.createPage({
      title,
      slug,
      status: this.newPage.status
    });
    this.creating = false;
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo crear la pagina.';
      return;
    }
    this.newPage = { title: '', slug: '', status: 'draft' };
    await this.loadPages();
  }

  async deletePage(page: AdminPage) {
    this.error = '';
    const confirmed = confirm(`Eliminar la pagina "${page.title}"?`);
    if (!confirmed) {
      return;
    }
    const ok = await this.data.deletePage(page.id);
    if (!ok) {
      this.error = 'No se pudo eliminar la pagina.';
      return;
    }
    await this.loadPages();
  }

  private async loadPages() {
    this.loading = true;
    try {
      this.pages = await this.data.getPages();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
