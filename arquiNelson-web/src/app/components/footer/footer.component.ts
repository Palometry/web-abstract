import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  currentYear = new Date().getFullYear();
  isContactPage = false;

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

  constructor() {
    this.updateRouteState(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.updateRouteState(event.urlAfterRedirects);
      });
  }

  private updateRouteState(url: string): void {
    this.isContactPage = url === '/contact';
  }
}
