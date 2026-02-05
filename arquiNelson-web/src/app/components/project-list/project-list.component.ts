import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicProjectsService, PublicProject } from '../../services/public-projects';
import { ProjectService, ProjectData } from '../../services/project';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent {
  private readonly fallbackImage = '/LOGO.jpg';
  projects: Array<{
    id: number | string;
    title: string;
    shortDesc: string;
    image: string;
    thumbImage: string;
  }> = [];

  constructor(
    private projectService: PublicProjectsService,
    private legacyProjectService: ProjectService,
    private cdr: ChangeDetectorRef
  ) {
    this.projects = this.legacyProjectService.getProjects();
    this.loadProjects();
  }

  private async loadProjects() {
    try {
      const [apiProjects, legacyProjects] = await Promise.all([
        this.projectService.getProjects(),
        Promise.resolve(this.legacyProjectService.getProjects())
      ]);

      if (!apiProjects.length) {
        this.projects = legacyProjects;
        this.cdr.detectChanges();
        return;
      }

      const seen = new Set(apiProjects.map((project) => project.title.trim().toLowerCase()));
      const merged: Array<PublicProject | ProjectData> = [...apiProjects];
      for (const legacy of legacyProjects) {
        const key = legacy.title.trim().toLowerCase();
        if (!seen.has(key)) {
          merged.push(legacy);
        }
      }
      this.projects = merged.map((project) => ({
        id: project.id,
        title: project.title,
        shortDesc: project.shortDesc,
        image: project.image || this.fallbackImage,
        thumbImage: project.thumbImage || project.image || this.fallbackImage
      }));
      this.cdr.detectChanges();
    } catch {
      this.projects = this.legacyProjectService.getProjects();
      this.cdr.detectChanges();
    }
  }
}
