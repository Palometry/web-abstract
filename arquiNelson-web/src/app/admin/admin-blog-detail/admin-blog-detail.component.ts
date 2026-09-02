import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminBlogDetail, AdminDataService } from '../../services/admin-data';

type BlogDraft = {
  title: string;
  slug: string;
  status: 'draft' | 'published' | string;
  contentType: 'article' | 'external';
  publishedAt: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  externalUrl: string;
  externalPlatform: string;
  externalAccount: string;
  externalCta: string;
};

@Component({
  selector: 'app-admin-blog-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-blog-detail.component.html',
  styleUrls: ['./admin-blog-detail.component.scss']
})
export class AdminBlogDetailComponent implements OnInit, AfterViewInit {
  @ViewChild('articleEditor')
  set articleEditorRef(value: ElementRef<HTMLDivElement> | undefined) {
    this.articleEditor = value;
    this.syncEditorFromDraft();
  }

  post: AdminBlogDetail | null = null;
  postId: number | null = null;
  isCreateMode = false;
  loading = false;
  saving = false;
  uploading = false;
  error = '';
  successMessage = '';
  draft: BlogDraft = this.createEmptyDraft();
  readonly contentTypeOptions = [
    { value: 'article', label: 'Articulo con editor' },
    { value: 'external', label: 'Publicacion externa' },
  ];
  readonly platformOptions = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'other', label: 'Otra red' },
  ];
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private loaded = false;
  private articleEditor?: ElementRef<HTMLDivElement>;
  private readonly isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
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

  private createEmptyDraft(): BlogDraft {
    return {
      title: '',
      slug: '',
      status: 'draft',
      contentType: 'article',
      publishedAt: '',
      excerpt: '',
      content: '',
      coverImageUrl: '',
      externalUrl: '',
      externalPlatform: 'instagram',
      externalAccount: '',
      externalCta: 'Ver publicacion',
    };
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
    const routePath = this.route.snapshot.routeConfig?.path;
    this.error = '';

    if (routePath === 'blog/new') {
      this.isCreateMode = true;
      this.post = null;
      this.postId = null;
      this.draft = this.createEmptyDraft();
      this.queueEditorSync();
      return;
    }

    const postId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(postId)) {
      this.error = 'Publicacion invalida.';
      return;
    }

    this.isCreateMode = false;
    this.postId = postId;
    this.loading = true;

    try {
      const post = await this.data.getBlogDetail(postId);
      if (!post) {
        this.error = 'No se encontro la publicacion.';
        return;
      }
      this.post = post;
      this.draft = {
        title: post.title ?? '',
        slug: post.slug ?? '',
        status: post.status ?? 'draft',
        contentType: post.contentType === 'external' ? 'external' : 'article',
        publishedAt: this.toDateInput(post.publishedAt),
        excerpt: post.excerpt ?? '',
        content: post.content ?? '',
        coverImageUrl: post.coverImageUrl ?? '',
        externalUrl: post.externalUrl ?? '',
        externalPlatform: post.externalPlatform ?? 'instagram',
        externalAccount: post.externalAccount ?? '',
        externalCta: post.externalCta ?? 'Ver publicacion'
      };
      this.queueEditorSync();
    } catch {
      this.error = 'No se pudo cargar la publicacion.';
    } finally {
      this.loading = false;
    }
  }

  handleTitleChange(value: string) {
    this.draft.title = value;
  }

  handleContentTypeChange(value: string) {
    this.draft.contentType = value === 'external' ? 'external' : 'article';
    if (this.draft.contentType === 'external' && !this.draft.externalCta.trim()) {
      this.draft.externalCta = 'Ver publicacion';
    }
    this.queueEditorSync();
  }

  async savePost() {
    const title = this.draft.title.trim();
    if (!title) {
      this.error = 'El titulo es obligatorio.';
      return;
    }

    this.captureEditorContent();
    if (this.draft.contentType === 'external' && !this.draft.externalUrl.trim()) {
      this.error = 'La URL externa es obligatoria para este tipo de contenido.';
      return;
    }

    this.saving = true;
    this.error = '';

    const payload = {
      title,
      status: this.draft.status,
      contentType: this.draft.contentType,
      publishedAt: this.draft.publishedAt || null,
      excerpt: this.draft.excerpt.trim() || null,
      content: this.draft.contentType === 'article' ? (this.draft.content.trim() || null) : null,
      coverImageUrl: this.draft.coverImageUrl.trim() || null,
      externalUrl: this.draft.contentType === 'external' ? (this.draft.externalUrl.trim() || null) : null,
      externalPlatform: this.draft.contentType === 'external' ? (this.draft.externalPlatform.trim() || null) : null,
      externalAccount: this.draft.contentType === 'external' ? (this.draft.externalAccount.trim() || null) : null,
      externalCta: this.draft.contentType === 'external' ? (this.draft.externalCta.trim() || 'Ver publicacion') : null,
    };

    if (this.isCreateMode) {
      const result = await this.data.createBlogPost(payload);
      this.saving = false;
      if (!result.ok || !result.id) {
        this.error = result.error ?? 'No se pudo crear la publicacion.';
        return;
      }
      await this.router.navigate(['/admin/blog', result.id]);
      return;
    }

    if (!this.postId) {
      this.saving = false;
      this.error = 'No se encontro la publicacion a editar.';
      return;
    }

    const result = await this.data.updateBlogPost(this.postId, payload);
    this.saving = false;
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo guardar la publicacion.';
      return;
    }

    await this.loadPost();
    this.showToast('Publicacion actualizada.');
  }

  async uploadCover(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.uploading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      const result = await this.data.uploadMedia(file, { title: file.name });
      if (!result.ok || !result.fileUrl) {
        this.error = result.error ?? 'No se pudo subir el archivo.';
        return;
      }

      this.draft.coverImageUrl = result.fileUrl;
      if (input) {
        input.value = '';
      }
    } finally {
      this.uploading = false;
      this.cdr.detectChanges();
    }
  }

  clearCover() {
    this.draft.coverImageUrl = '';
  }

  applyInlineCommand(command: string) {
    if (!this.isBrowser || !this.articleEditor) {
      return;
    }
    this.focusEditor();
    document.execCommand(command, false);
    this.captureEditorContent();
  }

  applyBlock(format: 'p' | 'h2' | 'h3' | 'blockquote') {
    if (!this.isBrowser || !this.articleEditor) {
      return;
    }
    this.focusEditor();
    document.execCommand('formatBlock', false, format);
    this.captureEditorContent();
  }

  applyList(command: 'insertUnorderedList' | 'insertOrderedList') {
    if (!this.isBrowser || !this.articleEditor) {
      return;
    }
    this.focusEditor();
    document.execCommand(command, false);
    this.captureEditorContent();
  }

  applyAlignment(command: 'justifyLeft' | 'justifyCenter' | 'justifyRight' | 'justifyFull') {
    if (!this.isBrowser || !this.articleEditor) {
      return;
    }
    this.focusEditor();
    document.execCommand(command, false);
    this.captureEditorContent();
  }

  insertLink() {
    if (!this.isBrowser || !this.articleEditor) {
      return;
    }
    const url = prompt('Pega la URL del enlace');
    if (!url) {
      return;
    }
    this.focusEditor();
    document.execCommand('createLink', false, url.trim());
    this.captureEditorContent();
  }

  clearFormatting() {
    if (!this.isBrowser || !this.articleEditor) {
      return;
    }
    this.focusEditor();
    document.execCommand('removeFormat', false);
    document.execCommand('unlink', false);
    this.captureEditorContent();
  }

  onEditorInput() {
    this.captureEditorContent();
  }

  onEditorKeydown(event: KeyboardEvent) {
    if (!this.isBrowser || !this.articleEditor || event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    if (anchorNode instanceof Element && anchorNode.closest('li')) {
      return;
    }
    if (anchorNode?.parentElement?.closest('li')) {
      return;
    }

    event.preventDefault();
    this.focusEditor();
    document.execCommand('insertParagraph');
    this.captureEditorContent();
  }

  formatPlatform(platform?: string | null) {
    const normalized = (platform || '').toLowerCase();
    const match = this.platformOptions.find((option) => option.value === normalized);
    return match?.label ?? 'Otra red';
  }

  private focusEditor() {
    this.articleEditor?.nativeElement.focus();
  }

  private captureEditorContent() {
    if (!this.articleEditor) {
      return;
    }
    this.draft.content = this.normalizeEditorHtml(this.articleEditor.nativeElement.innerHTML);
  }

  private queueEditorSync() {
    if (!this.isBrowser) {
      return;
    }
    setTimeout(() => this.syncEditorFromDraft());
  }

  private syncEditorFromDraft() {
    if (!this.articleEditor || this.draft.contentType !== 'article') {
      return;
    }
    const html = this.renderEditorHtml(this.draft.content);
    if (this.articleEditor.nativeElement.innerHTML !== html) {
      this.articleEditor.nativeElement.innerHTML = html;
    }
  }

  private renderEditorHtml(content?: string | null): string {
    const value = (content || '').trim();
    if (!value) {
      return '';
    }
    if (/<[a-z][\s\S]*>/i.test(value)) {
      return value;
    }
    return value
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${this.escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  private normalizeEditorHtml(html?: string | null): string {
    const value = (html || '').trim();
    if (!value) {
      return '';
    }

    const container = document.createElement('div');
    container.innerHTML = value;
    container.querySelectorAll('div').forEach((node) => {
      const paragraph = document.createElement('p');
      paragraph.innerHTML = node.innerHTML;
      node.replaceWith(paragraph);
    });
    const text = container.textContent?.replace(/\u00a0/g, ' ').trim() ?? '';
    const hasMedia = !!container.querySelector('img, video, iframe, a');
    if (!text && !hasMedia) {
      return '';
    }
    return container.innerHTML.trim();
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
