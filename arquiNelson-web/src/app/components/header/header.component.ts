import { Component, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ProjectService, ProjectData } from '../../services/project';
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
export class HeaderComponent {
  isMenuOpen = false;
  projects: ProjectData[] = [];
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
    private projectService: ProjectService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.projects = this.projectService.getProjects();
    this.initTheme();
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.updateHeaderAppearance());
    this.updateHeaderAppearance();
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
    { name: 'SOBRE NOSOTROS', link: '/blog' },
    { name: 'CONTACTO', link: '/contact' }
  ];
}
