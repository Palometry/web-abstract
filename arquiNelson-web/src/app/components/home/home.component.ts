import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { HeroComponent } from '../hero/hero.component';
import { AboutComponent } from '../about/about.component';
import { ServicesComponent } from '../services/services.component';
import { ProjectsComponent } from '../projects/projects.component';
import { PublicContentService, PublicPageSection } from '../../services/public-content';
import { PublicServicesService, PublicService } from '../../services/public-services';
import { ProjectService, ProjectData } from '../../services/project';
import { PortfolioService } from '../../services/portfolio';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, HeroComponent, AboutComponent, ServicesComponent, ProjectsComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private readonly fallbackSlug = 'inmo';
  extraSections: PublicPageSection[] = [];
  services: PublicService[] = [];
  marqueeProjects: ProjectData[] = [];
  collageItems: { src: string; alt: string }[] = [];
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

  private async buildCollageItems(): Promise<{ src: string; alt: string }[]> {
    const maxTiles = 6;
    const items = await this.portfolioService.getItems();
    const fromPortfolio = items
      .filter((item) => !!item.coverImage)
      .map((item) => ({
        src: item.coverImage ?? '',
        alt: item.title || 'Portafolio',
      }))
      .filter((item) => item.src !== '')
      .slice(0, maxTiles);

    if (fromPortfolio.length >= maxTiles) {
      return fromPortfolio;
    }

    const needed = maxTiles - fromPortfolio.length;
    return [...fromPortfolio, ...this.collageFallback.slice(0, needed)];
  }

  onCollageError(index: number) {
    const fallback = this.collageFallback[index % this.collageFallback.length];
    if (!fallback) {
      return;
    }
    this.collageItems[index] = fallback;
    this.cdr.detectChanges();
  }
}
