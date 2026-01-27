import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  constructor(private projectService: ProjectService) {
    this.projects = this.projectService.getProjects();
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
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
