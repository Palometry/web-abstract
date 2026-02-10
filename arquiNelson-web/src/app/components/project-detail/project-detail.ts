import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicProjectsService, PublicProject } from '../../services/public-projects';
import { ProjectService, ProjectData } from '../../services/project';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type HousePlan = {
  name: string;
  ambientes: number;
  totalArea: string;
  coveredArea: string;
  image: string;
};

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, CommonModule],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.scss'
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  private readonly fallbackImage = '/LOGO.jpg';
  project: PublicProject | ProjectData | undefined;
  bannerImages: string[] = [];
  currentBannerIndex = 0;
  housePlans: HousePlan[] = [];
  filteredPlans: HousePlan[] = [];
  planOptions: number[] = [];
  selectedAmbientes = 0;
  currentPlanIndex = 0;
  mapEmbedSafeUrl: SafeResourceUrl | null = null;
  private sub?: Subscription;
  private bannerTimer?: ReturnType<typeof setInterval>;

  constructor(
    private route: ActivatedRoute,
    private projectService: PublicProjectsService,
    private legacyProjectService: ProjectService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.sub = this.route.paramMap.subscribe(async (params) => {
      const rawId = params.get('id');
      this.project = undefined;
      if (rawId) {
        const id = Number(rawId);
        if (Number.isFinite(id)) {
          const project = await this.projectService.getProjectById(id);
          if (project) {
            if (!project.image) {
              project.image = this.fallbackImage;
            }
            if (!project.thumbImage) {
              project.thumbImage = project.image || this.fallbackImage;
            }
          }
          this.project = project ?? undefined;
        } else {
          const legacy = this.legacyProjectService.getProjectById(rawId) ?? undefined;
          if (legacy) {
            legacy.image = legacy.image || this.fallbackImage;
            legacy.thumbImage = legacy.thumbImage || legacy.image || this.fallbackImage;
          }
          this.project = legacy;
        }
      }
      this.setupBanner();
      this.setupHousePlans();
      this.setupMap();
      this.cdr.detectChanges();
    });
  }

  get currentBannerImage(): string | null {
    return this.bannerImages.length ? this.bannerImages[this.currentBannerIndex] : null;
  }

  nextBanner() {
    if (!this.bannerImages.length) {
      return;
    }
    this.currentBannerIndex = (this.currentBannerIndex + 1) % this.bannerImages.length;
  }

  prevBanner() {
    if (!this.bannerImages.length) {
      return;
    }
    this.currentBannerIndex =
      (this.currentBannerIndex - 1 + this.bannerImages.length) % this.bannerImages.length;
  }

  goToBanner(index: number) {
    if (index >= 0 && index < this.bannerImages.length) {
      this.currentBannerIndex = index;
    }
  }

  get currentPlan(): HousePlan | null {
    return this.filteredPlans.length ? this.filteredPlans[this.currentPlanIndex] : null;
  }

  nextPlan() {
    if (!this.filteredPlans.length) {
      return;
    }
    this.currentPlanIndex = (this.currentPlanIndex + 1) % this.filteredPlans.length;
  }

  prevPlan() {
    if (!this.filteredPlans.length) {
      return;
    }
    this.currentPlanIndex =
      (this.currentPlanIndex - 1 + this.filteredPlans.length) % this.filteredPlans.length;
  }

  goToPlan(index: number) {
    if (index >= 0 && index < this.filteredPlans.length) {
      this.currentPlanIndex = index;
    }
  }

  onAmbientesChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedAmbientes = Number(value);
    this.applyPlanFilter();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    if (this.bannerTimer) {
      clearInterval(this.bannerTimer);
    }
  }

  private setupBanner() {
    if (this.bannerTimer) {
      clearInterval(this.bannerTimer);
    }

    if (this.project) {
      const gallery = this.project.gallery?.length ? this.project.gallery : [];
      this.bannerImages = gallery.length ? gallery : [this.project.image];
    } else {
      this.bannerImages = [];
    }

    this.currentBannerIndex = 0;
    if (this.bannerImages.length > 1) {
      this.bannerTimer = setInterval(() => this.nextBanner(), 6000);
    }
  }

  private setupHousePlans() {
    if (this.project?.housePlans?.length) {
      this.housePlans = [...this.project.housePlans];
      const unique = Array.from(new Set(this.housePlans.map((plan) => plan.ambientes)));
      this.planOptions = unique.sort((a, b) => a - b);
      this.selectedAmbientes = 0;
      this.applyPlanFilter();
      return;
    }

    this.housePlans = [];
    this.filteredPlans = [];
    this.planOptions = [];
    this.selectedAmbientes = 0;
    this.currentPlanIndex = 0;
  }

  private applyPlanFilter() {
    if (!this.housePlans.length) {
      this.filteredPlans = [];
      this.currentPlanIndex = 0;
      return;
    }

    if (this.selectedAmbientes) {
      this.filteredPlans = this.housePlans.filter(
        (plan) => plan.ambientes === this.selectedAmbientes
      );
    } else {
      this.filteredPlans = [...this.housePlans];
    }

    this.currentPlanIndex = 0;
  }

  private setupMap() {
    if (!this.project) {
      this.mapEmbedSafeUrl = null;
      return;
    }

    const embedUrl =
      this.extractIframeSrc(this.project.mapEmbedUrl) ||
      this.buildEmbedUrlFromMapUrl(this.project.mapUrl);

    if (embedUrl) {
      this.mapEmbedSafeUrl =
        this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
      return;
    }

    this.mapEmbedSafeUrl = null;
  }

  private extractIframeSrc(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (!trimmed.toLowerCase().includes('<iframe')) {
      return trimmed;
    }
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match?.[1]?.trim() ?? null;
  }

  private buildEmbedUrlFromMapUrl(mapUrl?: string | null): string | null {
    if (!mapUrl) {
      return null;
    }

    const trimmed = mapUrl.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.toLowerCase().includes('<iframe')) {
      const match = trimmed.match(/src=["']([^"']+)["']/i);
      if (match?.[1]) {
        mapUrl = match[1].trim();
      }
    }

    try {
      const url = new URL(mapUrl);
      if (url.hostname.includes('google.com') && url.pathname.includes('/maps/embed')) {
        return url.toString();
      }
      if (url.hostname.includes('google.com')) {
        const placeMatch = url.pathname.match(/\/place\/([^/]+)/i);
        if (placeMatch?.[1]) {
          return `https://www.google.com/maps?q=${encodeURIComponent(
            decodeURIComponent(placeMatch[1])
          )}&output=embed`;
        }

        const query = url.searchParams.get('q');
        if (query) {
          return `https://www.google.com/maps?q=${encodeURIComponent(
            query
          )}&output=embed`;
        }
      }

      if (url.hostname.includes('maps.app.goo.gl') || url.hostname.includes('goo.gl')) {
        return `https://www.google.com/maps?q=${encodeURIComponent(
          mapUrl
        )}&output=embed`;
      }
    } catch {
      return null;
    }

    return null;
  }

}
