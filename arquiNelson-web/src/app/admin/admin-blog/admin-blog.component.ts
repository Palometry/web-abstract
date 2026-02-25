import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminBlogPost, AdminDataService } from '../../services/admin-data';

@Component({
  selector: 'app-admin-blog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-blog.component.html',
  styleUrls: ['./admin-blog.component.scss']
})
export class AdminBlogComponent implements OnInit, AfterViewInit {
  posts: AdminBlogPost[] = [];
  loading = false;
  error = '';
  creating = false;
  newPost = {
    title: '',
    slug: '',
    status: 'draft',
    publishedAt: ''
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
    await this.loadPosts();
  }

  formatStatus(status: string) {
    return status === 'published' ? 'Publicado' : 'Borrador';
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

  async createPost() {
    this.error = '';
    const title = this.newPost.title.trim();
    const slug = this.newPost.slug.trim();
    if (!title || !slug) {
      this.error = 'Titulo y slug son obligatorios.';
      return;
    }
    this.creating = true;
    const result = await this.data.createBlogPost({
      title,
      slug,
      status: this.newPost.status,
      publishedAt: this.newPost.publishedAt || null
    });
    this.creating = false;
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo crear la publicación.';
      return;
    }
    this.newPost = { title: '', slug: '', status: 'draft', publishedAt: '' };
    await this.loadPosts();
  }

  async deletePost(post: AdminBlogPost) {
    this.error = '';
    const confirmed = confirm(`Eliminar la publicación "${post.title}"?`);
    if (!confirmed) {
      return;
    }
    const ok = await this.data.deleteBlogPost(post.id);
    if (!ok) {
      this.error = 'No se pudo eliminar la publicación.';
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
