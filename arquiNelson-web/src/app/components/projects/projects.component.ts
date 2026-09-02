import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PortfolioListItem, PortfolioService } from '../../services/portfolio';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit, AfterViewInit {
  items: PortfolioListItem[] = [];
  loading = false;
  error = '';
  private loaded = false;
  hasLoaded = false;
  private readonly isBrowser: boolean;

  constructor(
    private portfolioService: PortfolioService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    this.tryLoad();
  }

  async ngAfterViewInit() {
    this.tryLoad();
  }

  private async tryLoad() {
    if (!this.isBrowser || this.loaded) {
      return;
    }
    this.loaded = true;
    this.loading = true;
    this.error = '';
    try {
      this.items = await this.portfolioService.getItems();
    } catch {
      this.items = [];
      this.error = 'No se pudo cargar el portafolio.';
    } finally {
      this.loading = false;
      this.hasLoaded = true;
      this.cdr.detectChanges();
    }
  }
}
