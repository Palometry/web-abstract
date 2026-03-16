import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicBlogPost, PublicBlogService } from '../../services/public-blog';
import { AboutComponent } from '../about/about.component';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, RouterLink, AboutComponent],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.scss']
})
export class BlogComponent implements OnInit, AfterViewInit {
  posts: PublicBlogPost[] = [];
  loading = false;
  error = '';
  private loaded = false;
  private readonly isBrowser: boolean;

  constructor(
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
    try {
      this.posts = await this.blogService.getPosts();
    } catch {
      this.error = 'No se pudo cargar el blog.';
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
}
