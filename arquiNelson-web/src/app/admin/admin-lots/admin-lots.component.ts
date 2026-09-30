import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminDataService, AdminProjectDetail } from '../../services/admin-data';

@Component({
  selector: 'app-admin-lots',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-lots.component.html',
  styleUrls: ['./admin-lots.component.scss']
})
export class AdminLotsComponent implements OnInit {
  projects: AdminProjectDetail[] = [];
  loading = false;
  error = '';
  private readonly isBrowser: boolean;

  constructor(
    private readonly data: AdminDataService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      void this.loadProjects();
    }
  }

  lotCount(project: AdminProjectDetail): number {
    return project.details?.lots?.length ?? 0;
  }

  private async loadProjects(): Promise<void> {
    this.loading = true;
    const summaries = await this.data.getProjects();
    const details = await Promise.all(summaries.map((project) => this.data.getProjectDetail(project.id)));
    this.projects = details
      .filter((project): project is AdminProjectDetail => !!project)
      .filter((project) => project.details?.publicScope === 'Habilitaciones' || !!project.details?.lots?.length);
    this.loading = false;
    this.cdr.detectChanges();
  }
}
