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
    { image: 'img/linkedin.png', url: 'https://www.linkedin.com/in/ndd-10/', label: 'LinkedIn' },
    { image: 'img/pngwing.com.png', url: '#', label: 'Tik Tok' }
  ];

  quickLinks = [
    { name: 'Proyectos', href: '/projects' },
    { name: 'Sobre Nosotros', href: '/blog' },
    { name: 'Servicios', href: '/services' },
    { name: 'Contacto', href: '/contact' }
  ];
}
