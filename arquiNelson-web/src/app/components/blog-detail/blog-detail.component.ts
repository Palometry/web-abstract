import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicBlogDetail, PublicBlogService } from '../../services/public-blog';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.scss']
})
export class BlogDetailComponent implements OnInit, AfterViewInit {
  post: PublicBlogDetail | null = null;
  loading = false;
  error = '';
  private loaded = false;
  private readonly isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private blogService: PublicBlogService,
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
    this.loading = true;
    this.error = '';
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    try {
      this.post = await this.blogService.getPost(slug);
      if (!this.post) {
        this.error = 'Publicacion no encontrada.';
      }
    } catch {
      this.error = 'No se pudo cargar la publicacion.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
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
      month: 'long',
      year: 'numeric'
    });
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

  isExternalPost(post: PublicBlogDetail): boolean {
    return post.contentType === 'external' && !!post.externalUrl;
  }

  formatPlatform(platform?: string | null): string {
    switch ((platform || '').toLowerCase()) {
      case 'instagram':
        return 'Instagram';
      case 'facebook':
        return 'Facebook';
      case 'linkedin':
        return 'LinkedIn';
      case 'tiktok':
        return 'TikTok';
      case 'youtube':
        return 'YouTube';
      default:
        return 'Red social';
    }
  }

  getContentHtml(content?: string | null): string {
    const value = (content || '').trim();
    if (!value) {
      return '<p>Sin contenido.</p>';
    }
    if (/<[a-z][\s\S]*>/i.test(value)) {
      return value;
    }
    return value
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${this.escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
