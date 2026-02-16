import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { HeroComponent } from '../hero/hero.component';
import { AboutComponent } from '../about/about.component';
import { ServicesComponent } from '../services/services.component';
import { ProjectsComponent } from '../projects/projects.component';
import { PublicContentService, PublicPageSection } from '../../services/public-content';
import { PublicServicesService, PublicService } from '../../services/public-services';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HeroComponent, AboutComponent, ServicesComponent, ProjectsComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private readonly fallbackSlug = 'inmo';
  extraSections: PublicPageSection[] = [];
  services: PublicService[] = [];
  private readonly isBrowser: boolean;

  constructor(
    private contentService: PublicContentService,
    private servicesService: PublicServicesService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    if (!this.isBrowser) {
      return;
    }
    const services = await this.servicesService.getServices();
    this.services = services.map((service) => ({
      ...service,
      icon: service.icon ?? ''
    }));
    const page =
      (await this.contentService.getHomePage()) ??
      (await this.contentService.getPageBySlug(this.fallbackSlug));
    if (!page) {
      return;
    }
    this.extraSections = page.sections;
    this.cdr.detectChanges();
  }
}
