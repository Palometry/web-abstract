import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminBlogDetail, AdminDataService } from '../../services/admin-data';

@Component({
  selector: 'app-admin-blog-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-blog-detail.component.html',
  styleUrls: ['./admin-blog-detail.component.scss']
})
export class AdminBlogDetailComponent implements OnInit, AfterViewInit {
  post: AdminBlogDetail | null = null;
  loading = false;
  saving = false;
  uploading = false;
  error = '';
  successMessage = '';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private loaded = false;
  private readonly isBrowser: boolean;

  draft = {
    title: '',
    slug: '',
    status: 'draft',
    publishedAt: '',
    excerpt: '',
    content: '',
    coverImageUrl: ''
  };

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
    if (!this.isBrowser || this.loaded) {
      return;
    }
    this.loaded = true;
    await this.loadPost();
    this.cdr.detectChanges();
  }

  private async loadPost() {
    const postId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(postId)) {
      this.error = 'Publicación invalida.';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      const post = await this.data.getBlogDetail(postId);
      if (!post) {
        this.error = 'No se encontro la publicación.';
        return;
      }
      this.post = post;
      this.draft = {
        title: post.title ?? '',
        slug: post.slug ?? '',
        status: post.status ?? 'draft',
        publishedAt: this.toDateInput(post.publishedAt),
        excerpt: post.excerpt ?? '',
        content: post.content ?? '',
        coverImageUrl: post.coverImageUrl ?? ''
      };
    } catch {
      this.error = 'No se pudo cargar la publicación.';
    } finally {
      this.loading = false;
    }
  }

  async savePost() {
    if (!this.post) {
      return;
    }
    const title = this.draft.title.trim();
    const slug = this.draft.slug.trim();
    if (!title || !slug) {
      this.error = 'Titulo y slug son obligatorios.';
      return;
    }
    this.saving = true;
    this.error = '';
    const result = await this.data.updateBlogPost(this.post.id, {
      title,
      slug,
      status: this.draft.status,
      publishedAt: this.draft.publishedAt || null,
      excerpt: this.draft.excerpt || null,
      content: this.draft.content || null,
      coverImageUrl: this.draft.coverImageUrl || null
    });
    this.saving = false;
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo guardar la publicación.';
      return;
    }
    await this.loadPost();
    this.showToast('Publicación actualizada.');
  }

  async uploadCover(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.uploading = true;
    const result = await this.data.uploadMedia(file, { title: file.name });
    this.uploading = false;
    if (!result.ok || !result.fileUrl) {
      this.error = result.error ?? 'No se pudo subir el archivo.';
      return;
    }
    this.draft.coverImageUrl = result.fileUrl;
    if (input) {
      input.value = '';
    }
  }

  private toDateInput(value?: string | null): string {
    if (!value) {
      return '';
    }
    const trimmed = value.trim();
    if (trimmed.length >= 10) {
      return trimmed.slice(0, 10);
    }
    return trimmed;
  }

  isVideoUrl(url?: string | null): boolean {
    if (!url) {
      return false;
    }
    const clean = url.split('?')[0].toLowerCase();
    return clean.startsWith('data:video/')
      || clean.endsWith('.mp4')
      || clean.endsWith('.webm')
      || clean.endsWith('.ogg')
      || clean.endsWith('.ogv')
      || clean.endsWith('.mov')
      || clean.endsWith('.m4v')
      || clean.endsWith('.avi');
  }

  private showToast(message: string) {
    this.successMessage = message;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => {
      this.successMessage = '';
      this.toastTimer = null;
      this.cdr.detectChanges();
    }, 3000);
    this.cdr.detectChanges();
  }
}
