import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminDataService, AdminProject } from '../../services/admin-data';

@Component({
  selector: 'app-admin-projects',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-projects.component.html',
  styleUrls: ['./admin-projects.component.scss']
})
export class AdminProjectsComponent implements OnInit, AfterViewInit {
  projects: AdminProject[] = [];
  loading = false;
  error = '';
  private loaded = false;
  private readonly isBrowser: boolean;

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
    await this.loadProjects();
  }

  formatStatus(status: string) {
    switch (status) {
      case 'draft':
        return 'Borrador';
      case 'active':
        return 'Activo';
      case 'suspended':
        return 'Suspendido';
      case 'archived':
        return 'Archivado';
      default:
        return status;
    }
  }

  async deleteProject(project: AdminProject) {
    this.error = '';
    const confirmed = confirm(`Eliminar el proyecto "${project.name}"?`);
    if (!confirmed) {
      return;
    }
    const ok = await this.data.deleteProject(project.id);
    if (!ok) {
      this.error = 'No se pudo eliminar el proyecto.';
      return;
    }
    await this.loadProjects();
  }

  private async loadProjects() {
    this.loading = true;
    try {
      this.projects = await this.data.getProjects();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
