import { Component, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ProjectService, ProjectData } from '../../services/project';

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
  isExpanded = true;
  isDarkMode = false;
  private readonly isBrowser: boolean;

  constructor(
    private projectService: ProjectService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.projects = this.projectService.getProjects();
    this.initTheme();
    this.updateExpanded();
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
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
    this.updateExpanded();
  }

  private updateExpanded() {
    if (!this.isBrowser) {
      return;
    }
    this.isExpanded = window.scrollY < 40;
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

  menuItems = [
    { name: 'INICIO', link: '/', fragment: 'home' },
    { name: 'SOBRE NOSOTROS', link: '/', fragment: 'about' },
    { name: 'SERVICIOS', link: '/', fragment: 'services' },
    { name: 'PORTAFOLIO', link: '/', fragment: 'portfolio' },
    { name: 'BLOG', link: '/blog' },
    { name: 'PROYECTOS', link: '/projects', dropdown: true },
    { name: 'CONTACTO', link: '/', fragment: 'contact' }
  ];
}
