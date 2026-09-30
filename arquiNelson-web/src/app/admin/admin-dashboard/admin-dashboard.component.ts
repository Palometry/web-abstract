import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminDataService, AdminDashboardActivity } from '../../services/admin-data';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  stats = [
    { label: 'Publicaciones activas', value: 0 },
    { label: 'Solicitudes nuevas', value: 0 },
    { label: 'Cotizaciones enviadas', value: 0 }
  ];

  activity: AdminDashboardActivity[] = [];
  loading = false;
  private loaded = false;
  private readonly isBrowser: boolean;

  quickActions = [
    {
      title: 'Nueva cotizacion',
      description: 'Genera un calculo rapido para clientes.',
      link: '/admin/quotes/new'
    },
    {
      title: 'Actualizar portafolio',
      description: 'Crea y actualiza trabajos del portafolio.',
      link: '/admin/projects'
    },
    {
      title: 'Nuevo proyecto',
      description: 'Publica un proyecto inmobiliario y sus lotes.',
      link: '/admin/lots'
    },
    {
      title: 'Gestionar tienda',
      description: 'Agrega o actualiza productos digitales.',
      link: '/admin/store'
    }
  ];

  constructor(
    private data: AdminDataService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.tryLoad();
  }

  ngAfterViewInit() {
    this.tryLoad();
  }

  private async tryLoad() {
    if (!this.isBrowser || this.loaded) {
      return;
    }
    this.loaded = true;
    await this.loadDashboard();
  }

  private async loadDashboard() {
    this.loading = true;
    try {
      const dashboard = await this.data.getDashboard();
      this.stats = [
        { label: 'Publicaciones activas', value: dashboard.stats.activeProjects },
        { label: 'Solicitudes nuevas', value: dashboard.stats.newQuotes },
        { label: 'Cotizaciones enviadas', value: dashboard.stats.sentQuotes }
      ];
      this.activity = dashboard.activity;
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
