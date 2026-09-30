import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminAuthService } from '../../services/admin-auth';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent {
  navOpen = false;
  currentPath = '/admin';
  private readonly destroyRef = inject(DestroyRef);
  private readonly pages = [
    { path: '/admin/projects', title: 'Portafolio', description: 'Obras y trabajos publicados en el sitio.' },
    { path: '/admin/lots', title: 'Proyectos', description: 'Proyectos inmobiliarios e inventario de lotes.' },
    { path: '/admin/store', title: 'Tienda', description: 'Productos y servicios digitales.' },
    { path: '/admin/blog', title: 'Blog', description: 'Articulos y publicaciones externas.' },
    { path: '/admin/quotes', title: 'Cotizaciones', description: 'Solicitudes, costos y propuestas para clientes.' },
    { path: '/admin/services', title: 'Servicios', description: 'Catalogo publico y configuracion de precios.' },
    { path: '/admin/users', title: 'Usuarios', description: 'Accesos, permisos y roles del equipo.' },
    { path: '/admin', title: 'Resumen', description: 'Estado general y accesos frecuentes.' }
  ];

  constructor(private auth: AdminAuthService, private router: Router) {
    this.currentPath = this.router.url.split('?')[0];
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.currentPath = event.urlAfterRedirects.split('?')[0];
        this.navOpen = false;
      });
  }

  get user() {
    return this.auth.user();
  }

  get canManageUsers() {
    return this.auth.canManageUsers();
  }

  get pageTitle(): string {
    return this.pages.find((page) => this.currentPath.startsWith(page.path))?.title ?? 'Administracion';
  }

  get pageDescription(): string {
    return this.pages.find((page) => this.currentPath.startsWith(page.path))?.description ?? '';
  }

  get userInitials(): string {
    const name = this.user?.fullName?.trim() || 'Usuario';
    return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  }

  toggleNav() {
    this.navOpen = !this.navOpen;
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/admin/login']);
  }
}
