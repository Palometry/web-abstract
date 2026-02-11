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
  private readonly isBrowser: boolean;

  constructor(
    private projectService: ProjectService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.projects = this.projectService.getProjects();
    this.updateExpanded();
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
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

  menuItems = [
    { name: 'Inicio', link: '/', fragment: 'home' },
    { name: 'Sobre Nosotros', link: '/', fragment: 'about' },
    { name: 'Servicios', link: '/', fragment: 'services' },
    { name: 'Portafolio', link: '/', fragment: 'portfolio' },
    { name: 'Proyecto', link: '/projects', dropdown: true },
    { name: 'Contacto', link: '/', fragment: 'contact' }
  ];
}
