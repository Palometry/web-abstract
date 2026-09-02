import { ChangeDetectorRef, Component, HostListener, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { PublicProject, PublicProjectsService } from '../../services/public-projects';
import { filter } from 'rxjs/operators';

type MenuItem = {
  name: string;
  link: string;
  dropdown?: boolean;
  fragment?: string;
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  isMenuOpen = false;
  projects: PublicProject[] = [];
  isOverlayHeader = false;
  isDarkMode = false;
  private readonly isBrowser: boolean;
  socialLinks = [
    { image: 'img/facebook.png', url: 'https://www.facebook.com/Abstract.Daza/', label: 'Facebook' },
    { image: 'img/instagram.png', url: '#', label: 'Instagram' },
    { image: 'img/linkedin.png', url: 'https://www.linkedin.com/in/ndd-10/', label: 'LinkedIn' },
    { image: 'img/pngwing.com.png', url: '#', label: 'Tik Tok' }
  ];

  constructor(
    private projectService: PublicProjectsService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.initTheme();
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.updateHeaderAppearance());
    this.updateHeaderAppearance();
  }

  async ngOnInit(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    this.projects = await this.projectService.getProjects();
    this.cdr.detectChanges();
  }

  getProjectRouteId(project: PublicProject): string | number {
    if (typeof project.slug === 'string' && project.slug.trim()) {
      return project.slug.trim();
    }
    return project.id;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    this.updateHeaderAppearance();
  }

  closeMenu() {
    this.isMenuOpen = false;
    this.updateHeaderAppearance();
  }

  toggleTheme() {
    if (!this.isBrowser) {
      return;
    }
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
    localStorage.setItem('arqui-theme', this.isDarkMode ? 'dark' : 'light');
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.updateHeaderAppearance();
  }

  private updateHeaderAppearance() {
    if (!this.isBrowser) {
      return;
    }

    const currentPath = this.router.url.split('#')[0].split('?')[0] || '/';
    const isHome = currentPath === '/';
    this.isOverlayHeader = isHome && window.scrollY < 32 && !this.isMenuOpen;
  }

  private initTheme() {
    if (!this.isBrowser) {
      return;
    }
    const saved = localStorage.getItem('arqui-theme');
    if (saved === 'dark' || saved === 'light') {
      this.isDarkMode = saved === 'dark';
    } else {
      this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    this.applyTheme();
  }

  private applyTheme() {
    document.body.classList.toggle('theme-dark', this.isDarkMode);
  }

  menuItems: MenuItem[] = [
    { name: 'PROYECTOS', link: '/projects', dropdown: true },
    { name: 'SERVICIOS', link: '/services' },
    { name: 'TIENDA', link: '/tienda' },
    { name: 'SOBRE NOSOTROS', link: '/blog' },
    { name: 'CONTACTO', link: '/contact' }
  ];
}
