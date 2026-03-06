import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Service {
  id: number;
  icon?: string | null;
  title: string;
  description: string;
  url?: string;
  openInNewTab?: boolean;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent {
  @Input() title?: string;
  @Input() summary?: string;
  @Input() items?: Service[];

  defaultTitle = 'Servicios';
  defaultSummary = 'Ofrecemos soluciones inmobiliarias integrales y profesionales';

  services: Service[] = [
    {
      id: 1,
      icon: '',
      title: 'Desarrollo inmobiliario',
      description: 'Vivienda unifamiliar, multifamiliar y casas de campo.'
    },
    {
      id: 2,
      icon: '',
      title: 'Saneamiento físico legal y consultoría urbana',
      description: 'Regularización de predios y asesoría técnica para el ordenamiento territorial.'
    },
    {
      id: 3,
      icon: '',
      title: 'Diseño urbano',
      description: 'Proyectos de habilitación urbana y planificación integral de barrios.'
    },
    {
      id: 4,
      icon: '',
      title: 'Supervisión y ejecución de obras',
      description: 'Gestión y control de obras públicas y privadas con altos estándares de calidad.'
    },
    {
      id: 5,
      icon: '',
      title: 'Consultoría técnica',
      description: 'Elaboración de expedientes técnicos y asesoramiento al Estado y al sector privado.'
    },
    {
      id: 6,
      icon: '',
      title: 'Implementación BIM',
      description: 'Especialistas en procesos colaborativos y digitalización para entidades públicas y municipalidades.'
    },
    {
      id: 7,
      icon: '',
      title: 'Materiales sostenibles',
      description: 'Asesoría en el uso de bambú y madera de plantaciones forestales certificadas.'
    },
    {
      id: 8,
      icon: '',
      title: 'Alianzas estratégicas',
      description: 'Colaboraciones con ONGs y actores públicos y privados para proteger agua, bosques y suelo.'
    }
  ];

  get displayServices() {
    return this.items?.length ? this.items : this.services;
  }

  isInternal(url: string | undefined) {
    return !!url && url.startsWith('/');
  }

  isExternal(url: string | undefined) {
    return !!url && /^https?:\/\//i.test(url);
  }

  getTarget(service: Service) {
    if (service.openInNewTab) {
      return '_blank';
    }
    return this.isExternal(service.url) ? '_blank' : undefined;
  }
}
