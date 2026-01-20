import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PortfolioItem, PortfolioService } from '../../services/portfolio';

@Component({
  selector: 'app-portfolio-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './portfolio-detail.component.html',
  styleUrls: ['./portfolio-detail.component.scss']
})
export class PortfolioDetailComponent implements OnInit, AfterViewInit {
  item?: PortfolioItem;
  heroImages: string[] = [];
  activeHero = '';
  activeHeroIndex = 0;
  autocadEmbedUrl?: SafeResourceUrl;
  loading = false;
  private loaded = false;
  private portfolioId: number | null = null;
  private readonly isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private portfolioService: PortfolioService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const idValue = Number(params.get('id'));
      this.portfolioId = Number.isFinite(idValue) ? idValue : null;
      this.tryLoad();
    });
  }

  ngAfterViewInit() {
    this.tryLoad();
  }

  private async tryLoad() {
    if (!this.isBrowser || this.loaded || this.portfolioId === null) {
      return;
    }
    this.loaded = true;
    this.loading = true;
    const selected = await this.portfolioService.getById(this.portfolioId);
    this.loading = false;

    this.item = selected ?? undefined;
    this.heroImages = selected?.heroImages?.length
      ? selected.heroImages
      : selected?.coverImage
        ? [selected.coverImage]
        : [];
    this.activeHeroIndex = 0;
    this.activeHero = this.heroImages[0] ?? '';
    this.autocadEmbedUrl = selected?.autocadUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(selected.autocadUrl)
      : undefined;
    this.cdr.detectChanges();
  }

  setHero(index: number): void {
    if (index < 0 || index >= this.heroImages.length) {
      return;
    }
    this.activeHeroIndex = index;
    this.activeHero = this.heroImages[index];
  }

  trackByIndex(index: number): number {
    return index;
  }
}
