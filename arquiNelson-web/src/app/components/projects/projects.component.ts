import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface Project {
  id: number;
  title: string;
  category: string;
  image: string;
  description: string;
  details: string;
  autodesk360Url?: string;
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent {
  selectedProject: Project | null = null;
  showAutodeskModal = false;
  sanitizedUrl: SafeResourceUrl | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  projects: Project[] = [
    {
      id: 1,
      title: 'Laboratorio Jaen',
      category: 'Instituto',
      image: 'img/Exagono.png',
      //image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&h=500&fit=crop',
      description: 'Desarrollo de gran capacidad para investigación',
      details: 'Proyecto de un laboratorio moderno y funcional',
      autodesk360Url: 'https://a360.co/2HCZnMC'
    },
    {
      id: 2,
      title: 'Centro Comercial Vista',
      category: 'Comercial',
      image: 'https://images.unsplash.com/photo-1562280963-8a5475740a10?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      description: 'Complejo comercial moderno y sostenible',
      details: 'Centro comercial inteligente con áreas verdes integradas'
    },
    {
      id: 3,
      title: 'Condominios La Calera',
      category: 'Residencial',
      image: 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=500&h=500&fit=crop',
      description: 'Comunidad cerrada con excelentes servicios',
      details: 'Desarrollo de viviendas unifamiliares en zona premium'
    },
    {
      id: 4,
      title: 'Oficinas Ejecutivas',
      category: 'Corporativo',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&h=500&fit=crop',
      description: 'Edificio corporativo con infraestructura avanzada',
      details: 'Espacio de trabajo flexible con tecnología de punta'
    },
    {
      id: 5,
      title: 'Parque Sostenible',
      category: 'Mixto',
      image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=500&h=500&fit=crop',
      description: 'Desarrollo mixto con enfoque sustentable',
      details: 'Proyecto integral con residencias, comercios y áreas verdes'
    },
    {
      id: 6,
      title: 'Hotel Boutique',
      category: 'Hotelería',
      image: 'https://images.unsplash.com/photo-1757839939579-d71ac270993b?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      description: 'Hotel de lujo con servicio personalizado',
      details: 'Establecimiento hotelero de 5 estrellas con diseño exclusivo'
    }
  ];

  openProject(project: Project) {
    this.selectedProject = project;
  }

  closeProject() {
    this.selectedProject = null;
    this.showAutodeskModal = false;
  }

  openAutodeskModal() {
    if (this.selectedProject?.autodesk360Url) {
      this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        this.selectedProject.autodesk360Url
      );
      this.showAutodeskModal = true;
    }
  }

  closeAutodeskModal() {
    this.showAutodeskModal = false;
  }
}
