import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  socialLinks = [
    { icon: '📘', url: 'https://www.facebook.com/Abstract.Daza/', label: 'Facebook' },
    { icon: '🐦', url: '#', label: 'Twitter' },
    { icon: '📷', url: '#', label: 'Instagram' },
    { icon: '💼', url: 'https://linkedin.com/in/nelson-daza-b37844298', label: 'LinkedIn' }
  ];

  quickLinks = [
    { name: 'Inicio', href: '#home' },
    { name: 'Sobre Nosotros', href: '#about' },
    { name: 'Servicios', href: '#services' },
    { name: 'Portafolio', href: '#portfolio' },
    { name: 'Proyectos', href: 'projects' },
    { name: 'Contacto', href: '#contact' }
  ];
}
