import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicProjectsService, PublicProject } from '../../services/public-projects';
import { ProjectData, ProjectService } from '../../services/project';

type CollageProject = PublicProject | ProjectData;

type CollageTile = {
  id: number | string;
  src: string;
  alt: string;
  title: string;
  summary: string;
  category: string;
  project: CollageProject;
};

type CollageRow = {
  featured: CollageTile;
  stacked: CollageTile[];
  reverse: boolean;
};

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent {
  collageItems: CollageTile[] = [];
  collageRows: CollageRow[] = [];

  constructor(
    private projectService: PublicProjectsService,
    private legacyProjectService: ProjectService,
    private cdr: ChangeDetectorRef
  ) {
    this.loadProjects();
  }

  onCollageError(index: number): void {
    const project = this.collageItems[index]?.project;
    if (!project) {
      return;
    }

    const fallbackImage = this.collectProjectImages(project)[0];
    if (!fallbackImage) {
      return;
    }

    this.collageItems[index] = {
      ...this.collageItems[index],
      src: fallbackImage,
      alt: project.title,
    };
    this.collageRows = this.buildCollageRows(this.collageItems);
    this.cdr.detectChanges();
  }

  private async loadProjects() {
    try {
      const [apiProjects, legacyProjects] = await Promise.all([
        this.projectService.getProjects(),
        Promise.resolve(this.legacyProjectService.getProjects())
      ]);

      const merged = this.mergeProjects(apiProjects, legacyProjects);
      const ordered = this.sortProjectsByRecency(merged);
      this.collageItems = this.buildCollageItems(ordered);
      this.collageRows = this.buildCollageRows(this.collageItems);
      this.cdr.detectChanges();
    } catch {
      const ordered = this.sortProjectsByRecency(this.legacyProjectService.getProjects());
      this.collageItems = this.buildCollageItems(ordered);
      this.collageRows = this.buildCollageRows(this.collageItems);
      this.cdr.detectChanges();
    }
  }

  private mergeProjects(apiProjects: PublicProject[], legacyProjects: ProjectData[]): CollageProject[] {
    if (!apiProjects.length) {
      return legacyProjects;
    }

    const seen = new Set(apiProjects.map((project) => project.title.trim().toLowerCase()));
    const merged: CollageProject[] = [...apiProjects];
    for (const legacy of legacyProjects) {
      const key = legacy.title.trim().toLowerCase();
      if (!seen.has(key)) {
        merged.push(legacy);
      }
    }

    return merged;
  }

  private buildCollageItems(projects: CollageProject[]): CollageTile[] {
    return projects.map((project) => {
      const images = this.collectProjectImages(project);
      const image = images[0] || '/LOGO.jpg';
      return {
        id: project.id,
        src: image,
        alt: project.title,
        title: project.title,
        summary: project.shortDesc || project.description || 'Explora este proyecto en detalle.',
        category: project.type || project.status || 'Proyecto',
        project,
      };
    });
  }

  private buildCollageRows(items: CollageTile[]): CollageRow[] {
    const rows: CollageRow[] = [];
    for (let index = 0; index < items.length; index += 3) {
      const group = items.slice(index, index + 3);
      if (!group.length) {
        continue;
      }

      const reverse = rows.length % 2 === 1;
      const featured = reverse ? group[group.length - 1] : group[0];
      const stacked = reverse ? group.slice(0, -1) : group.slice(1);
      rows.push({ featured, stacked, reverse });
    }

    return rows;
  }

  private collectProjectImages(project: CollageProject): string[] {
    const ordered = [
      project.image,
      project.thumbImage,
      project.masterplanImage,
      ...(project.gallery ?? []),
      ...((project.houseModels ?? []).flatMap((model) => model.images ?? (model.image ? [model.image] : []))),
    ];

    const unique = new Set<string>();
    for (const image of ordered) {
      const normalized = image?.trim();
      if (!normalized || unique.has(normalized)) {
        continue;
      }
      unique.add(normalized);
    }

    return Array.from(unique);
  }

  private sortProjectsByRecency(projects: CollageProject[]): CollageProject[] {
    return [...projects].sort((left, right) => {
      const yearDiff = this.getProjectRecencyValue(right) - this.getProjectRecencyValue(left);
      if (yearDiff !== 0) {
        return yearDiff;
      }

      const rightId = typeof right.id === 'number' ? right.id : Number.NaN;
      const leftId = typeof left.id === 'number' ? left.id : Number.NaN;
      if (!Number.isNaN(rightId) && !Number.isNaN(leftId) && rightId !== leftId) {
        return rightId - leftId;
      }

      return left.title.localeCompare(right.title);
    });
  }

  private getProjectRecencyValue(project: CollageProject): number {
    return Math.max(project.deliveryYear || 0, project.startYear || 0);
  }
}
