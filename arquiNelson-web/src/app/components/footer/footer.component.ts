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
    { image: 'img/facebook.png', url: 'https://www.facebook.com/Abstract.Daza/', label: 'Facebook' },
    { image: 'img/instagram.png', url: '#', label: 'Instagram' },
    { image: 'img/linkedin.png', url: 'https://linkedin.com/in/nelson-daza-b37844298', label: 'LinkedIn' },
    { image: 'img/twitter.png', url: '#', label: 'Twitter' }
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
