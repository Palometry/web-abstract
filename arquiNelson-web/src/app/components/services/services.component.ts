import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Service {
  id: number;
  icon: string;
  title: string;
  description: string;
  url?: string;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent {
  services: Service[] = [
    {
      id: 1,
      icon: '',
      title: 'Desarrollo inmobiliario',
      description: 'Vivienda unifamiliar, multifamiliar y casas de campo.',
      url: '/projects'
    },
    {
      id: 2,
      icon: '',
      title: 'Saneamiento físico legal y consultoría urbana',
      description: 'Regularización de predios y asesoría técnica para el ordenamiento territorial.',
      url: '/contact'
    },
    {
      id: 3,
      icon: '',
      title: 'Diseño urbano',
      description: 'Proyectos de habilitación urbana y planificación integral de barrios.',
      url: '/portfolio'
    },
    {
      id: 4,
      icon: '',
      title: 'Supervisión y ejecución de obras',
      description: 'Gestión y control de obras públicas y privadas con altos estándares de calidad.',
      url: '/contact'
    },
    {
      id: 5,
      icon: '',
      title: 'Consultoría técnica',
      description: 'Elaboración de expedientes técnicos y asesoramiento al Estado y al sector privado.',
      url: '/contact'
    },
    {
      id: 6,
      icon: '',
      title: 'Implementación BIM',
      description: 'Especialistas en procesos colaborativos y digitalización para entidades públicas y municipalidades.',
      url: '/portfolio'
    },
    {
      id: 7,
      icon: '',
      title: 'Materiales sostenibles',
      description: 'Asesoría en el uso de bambú y madera de plantaciones forestales certificadas.',
      url: '/about'
    },
    {
      id: 8,
      icon: '',
      title: 'Alianzas estratégicas',
      description: 'Colaboraciones con ONGs y actores públicos y privados para proteger agua, bosques y suelo.',
      url: '/about'
    }
  ];

  isInternal(url: string | undefined) {
    return !!url && url.startsWith('/');
  }
}
