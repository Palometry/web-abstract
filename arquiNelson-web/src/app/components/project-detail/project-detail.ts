import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  project: ProjectData | undefined;
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
    private projectService: ProjectService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.sub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      // Reset before loading the next project to avoid showing stale data
      this.project = undefined;
      if (id) {
        this.project = this.projectService.getProjectById(id) ?? undefined;
      }
      this.setupBanner();
      this.setupHousePlans();
      this.setupMap();
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
    if (this.project?.mapEmbedUrl) {
      this.mapEmbedSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        this.project.mapEmbedUrl
      );
      return;
    }

    this.mapEmbedSafeUrl = null;
  }

}
