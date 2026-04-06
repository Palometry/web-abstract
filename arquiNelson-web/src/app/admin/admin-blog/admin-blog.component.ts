import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminBlogPost, AdminDataService } from '../../services/admin-data';

@Component({
  selector: 'app-admin-blog',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-blog.component.html',
  styleUrls: ['./admin-blog.component.scss']
})
export class AdminBlogComponent implements OnInit, AfterViewInit {
  posts: AdminBlogPost[] = [];
  loading = false;
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
    await this.loadPosts();
  }

  formatStatus(status: string) {
    return status === 'published' ? 'Publicado' : 'Borrador';
  }

  formatType(type?: string | null) {
    return type === 'external' ? 'Red social' : 'Articulo';
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  async deletePost(post: AdminBlogPost) {
    this.error = '';
    const confirmed = confirm(`Eliminar la publicacion "${post.title}"?`);
    if (!confirmed) {
      return;
    }
    const ok = await this.data.deleteBlogPost(post.id);
    if (!ok) {
      this.error = 'No se pudo eliminar la publicacion.';
      return;
    }
    await this.loadPosts();
  }

  private async loadPosts() {
    this.loading = true;
    try {
      this.posts = await this.data.getBlogPosts();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
