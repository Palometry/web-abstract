import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { HeroComponent } from '../hero/hero.component';
import { AboutComponent } from '../about/about.component';
import { ServicesComponent } from '../services/services.component';
import { ProjectsComponent } from '../projects/projects.component';
import { PublicContentService, PublicPageSection } from '../../services/public-content';
import { PublicServicesService, PublicService } from '../../services/public-services';
import { ProjectService, ProjectData } from '../../services/project';
import { PortfolioItem, PortfolioService } from '../../services/portfolio';
import { RouterLink } from '@angular/router';

type CollageTile = {
  id: number | null;
  src: string;
  alt: string;
  title: string;
  summary: string;
  category: string;
};

type CollageStorySlide = {
  id: string;
  title: string;
  text: string;
  image: string;
  caption: string;
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, HeroComponent, AboutComponent, ServicesComponent, ProjectsComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly fallbackSlug = 'inmo';
  private detailRequestToken = 0;

  @ViewChild('storyRail') private storyRail?: ElementRef<HTMLElement>;

  extraSections: PublicPageSection[] = [];
  services: PublicService[] = [];
  marqueeProjects: ProjectData[] = [];
  collageItems: CollageTile[] = [];
  isCollageDetailOpen = false;
  collageDetailLoading = false;
  activeCollageTile: CollageTile | null = null;
  activePortfolioItem: PortfolioItem | null = null;
  collageStorySlides: CollageStorySlide[] = [];
  detailAnimationStyle: Record<string, string> = {
    '--modal-origin-x': '50%',
    '--modal-origin-y': '80%',
  };
  private readonly isBrowser: boolean;
  private readonly collageFallback = [
    {
      src: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80',
      alt: 'Volumen arquitectonico moderno',
    },
    {
      src: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80',
      alt: 'Interiores con luz natural',
    },
    {
      src: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=900&q=80',
      alt: 'Urbanismo y paisaje',
    },
    {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80',
      alt: 'Espacio verde y entorno',
    },
    {
      src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=80',
      alt: 'Detalles de materiales',
    },
    {
      src: 'https://images.unsplash.com/photo-1442406964439-e46ab8eff7c4?auto=format&fit=crop&w=900&q=80',
      alt: 'Fachada contemporanea',
    },
    {
      src: 'https://images.unsplash.com/photo-1465808027928-7c67507b9691?auto=format&fit=crop&w=900&q=80',
      alt: 'Perspectiva urbana',
    },
  ];

  constructor(
    private contentService: PublicContentService,
    private servicesService: PublicServicesService,
    private projectService: ProjectService,
    private portfolioService: PortfolioService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    if (!this.isBrowser) {
      return;
    }
    const projects = this.projectService.getProjects();
    this.marqueeProjects = projects.length ? [...projects, ...projects] : [];
    const services = await this.servicesService.getServices();
    this.services = services.map((service) => ({
      ...service,
      icon: service.icon ?? ''
    }));
    this.collageItems = await this.buildCollageItems();
    const page =
      (await this.contentService.getHomePage()) ??
      (await this.contentService.getPageBySlug(this.fallbackSlug));
    if (!page) {
      return;
    }
    this.extraSections = page.sections;
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.toggleBodyScrollLock(false);
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (!this.isBrowser || !this.isCollageDetailOpen) {
      return;
    }
    this.closeCollageDetail();
  }

  async openCollageDetail(item: CollageTile, event?: MouseEvent): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    this.setDetailAnimationOrigin(event);
    const requestToken = ++this.detailRequestToken;
    this.activeCollageTile = item;
    this.activePortfolioItem = null;
    this.collageDetailLoading = true;
    this.isCollageDetailOpen = true;
    this.toggleBodyScrollLock(true);
    this.collageStorySlides = this.buildCollageStorySlides(item, null);
    this.cdr.detectChanges();

    const detail = item.id !== null ? await this.portfolioService.getById(item.id) : null;
    if (requestToken !== this.detailRequestToken) {
      return;
    }

    this.activePortfolioItem = detail;
    this.collageStorySlides = this.buildCollageStorySlides(item, detail);
    this.collageDetailLoading = false;
    this.resetStoryRailPosition();
    this.cdr.detectChanges();
  }

  closeCollageDetail(): void {
    if (!this.isBrowser) {
      return;
    }
    this.detailRequestToken++;
    this.isCollageDetailOpen = false;
    this.collageDetailLoading = false;
    this.activeCollageTile = null;
    this.activePortfolioItem = null;
    this.collageStorySlides = [];
    this.toggleBodyScrollLock(false);
    this.cdr.detectChanges();
  }

  onDetailBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeCollageDetail();
    }
  }

  scrollStory(direction: -1 | 1): void {
    const rail = this.storyRail?.nativeElement;
    if (!rail) {
      return;
    }
    const step = Math.max(rail.clientWidth * 0.8, 320);
    rail.scrollBy({ left: step * direction, behavior: 'smooth' });
  }

  trackBySlide(_: number, slide: CollageStorySlide): string {
    return slide.id;
  }

  private async buildCollageItems(): Promise<CollageTile[]> {
    const maxTiles = 6;
    const items = await this.portfolioService.getItems();
    const fromPortfolio = items
      .filter((item) => !!item.coverImage)
      .map((item) => ({
        id: item.id,
        src: item.coverImage ?? '',
        alt: item.title || 'Portafolio',
        title: item.title || 'Proyecto',
        summary: item.description || 'Explora este proyecto en detalle.',
        category: item.category || 'Portafolio',
      }))
      .filter((item) => item.src !== '')
      .slice(0, maxTiles);

    if (fromPortfolio.length >= maxTiles) {
      return fromPortfolio;
    }

    const needed = maxTiles - fromPortfolio.length;
    const fromFallback = this.collageFallback.slice(0, needed).map((item, index) => ({
      id: null,
      src: item.src,
      alt: item.alt,
      title: item.alt,
      summary: 'Imagen de referencia del estudio.',
      category: `Coleccion ${index + 1}`,
    }));
    return [...fromPortfolio, ...fromFallback];
  }

  onCollageError(index: number) {
    const fallback = this.collageFallback[index % this.collageFallback.length];
    if (!fallback) {
      return;
    }
    const current = this.collageItems[index];
    this.collageItems[index] = {
      id: current?.id ?? null,
      src: fallback.src,
      alt: fallback.alt,
      title: current?.title || fallback.alt,
      summary: current?.summary || 'Imagen de referencia del estudio.',
      category: current?.category || 'Portafolio',
    };
    this.cdr.detectChanges();
  }

  private buildCollageStorySlides(item: CollageTile, detail: PortfolioItem | null): CollageStorySlide[] {
    const projectTitle = detail?.title || item.title;
    const category = detail?.category || item.category || 'Proyecto';
    const textBlocks = (detail?.blocks ?? [])
      .filter((block) => block.type === 'text' && !!block.text?.trim())
      .map((block) => block.text!.trim());
    const summary =
      detail?.description?.trim() ||
      item.summary ||
      'Proyecto arquitectonico seleccionado para este collage.';
    const images = this.collectProjectImages(item, detail);
    const slides: CollageStorySlide[] = [
      {
        id: `${item.id ?? 'fallback'}-overview`,
        title: projectTitle,
        text: summary,
        image: images[0] || item.src,
        caption: category,
      },
    ];

    const articleBlocks = textBlocks.slice(0, 4);
    articleBlocks.forEach((text, index) => {
      const imageForSlide = images.length ? images[(index + 1) % images.length] : item.src;
      slides.push({
        id: `${item.id ?? 'fallback'}-article-${index}`,
        title: `Historia ${index + 1}`,
        text,
        image: imageForSlide || images[0] || item.src,
        caption: `Detalle ${index + 1}`,
      });
    });

    const galleryImages = images.slice(1, 8);
    galleryImages.forEach((image, index) => {
      slides.push({
        id: `${item.id ?? 'fallback'}-gallery-${index}`,
        title: `Galeria ${index + 1}`,
        text: index === 0 ? 'Desliza lateralmente para continuar explorando el proyecto.' : '',
        image,
        caption: projectTitle,
      });
    });

    return slides;
  }

  private collectProjectImages(item: CollageTile, detail: PortfolioItem | null): string[] {
    const blockImages = (detail?.blocks ?? [])
      .filter((block) => block.type === 'image' && !!block.src)
      .map((block) => block.src as string);
    const ordered = [item.src, ...(detail?.heroImages ?? []), ...(detail?.gallery ?? []), ...blockImages];
    const unique = new Set<string>();
    for (const image of ordered) {
      const normalized = image?.trim();
      if (!normalized || unique.has(normalized)) {
        continue;
      }
      unique.add(normalized);
    }
    return Array.from(unique);
  }

  private resetStoryRailPosition(): void {
    const rail = this.storyRail?.nativeElement;
    if (!rail) {
      return;
    }
    rail.scrollLeft = 0;
  }

  private toggleBodyScrollLock(shouldLock: boolean): void {
    if (!this.isBrowser) {
      return;
    }
    if (shouldLock) {
      document.body.style.overflow = 'hidden';
      return;
    }
    document.body.style.removeProperty('overflow');
  }

  private setDetailAnimationOrigin(event?: MouseEvent): void {
    if (!this.isBrowser || !event) {
      this.detailAnimationStyle = {
        '--modal-origin-x': '50%',
        '--modal-origin-y': '80%',
      };
      return;
    }
    const viewportWidth = Math.max(window.innerWidth, 1);
    const viewportHeight = Math.max(window.innerHeight, 1);
    const x = Math.min(94, Math.max(6, (event.clientX / viewportWidth) * 100));
    const y = Math.min(94, Math.max(6, (event.clientY / viewportHeight) * 100));
    this.detailAnimationStyle = {
      '--modal-origin-x': `${x}%`,
      '--modal-origin-y': `${y}%`,
    };
  }
}
