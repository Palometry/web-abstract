import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
export class PortfolioDetailComponent implements OnInit {
  item?: PortfolioItem;
  heroImages: string[] = [];
  activeHero = '';
  activeHeroIndex = 0;
  autocadEmbedUrl?: SafeResourceUrl;
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private portfolioService: PortfolioService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(async (params) => {
      const id = params.get('id');
      this.loading = true;
      const selected = id ? await this.portfolioService.getById(id) : null;
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
    });
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
