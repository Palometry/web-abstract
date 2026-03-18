import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeroComponent } from '../hero/hero.component';
import { AboutComponent } from '../about/about.component';
import { PublicContentService, PublicPageSection } from '../../services/public-content';
import { ProjectData, ProjectService } from '../../services/project';
import { PublicProject, PublicProjectsService } from '../../services/public-projects';

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
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, HeroComponent, AboutComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private readonly fallbackSlug = 'inmo';
  private readonly isBrowser: boolean;
  private readonly maxHomeProjects = 6;

  extraSections: PublicPageSection[] = [];
  collageItems: CollageTile[] = [];
  collageRows: CollageRow[] = [];

  constructor(
    private contentService: PublicContentService,
    private publicProjectsService: PublicProjectsService,
    private legacyProjectService: ProjectService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    if (!this.isBrowser) {
      return;
    }

    this.collageItems = await this.buildCollageItems();
    this.collageRows = this.buildCollageRows(this.collageItems);

    const page =
      (await this.contentService.getHomePage()) ??
      (await this.contentService.getPageBySlug(this.fallbackSlug));
    if (!page) {
      return;
    }

    this.extraSections = page.sections.filter((section) => !this.isNewsSection(section));
    this.cdr.detectChanges();
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

  private async buildCollageItems(): Promise<CollageTile[]> {
    const projects = await this.getMergedProjects();
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

  private async getMergedProjects(): Promise<CollageProject[]> {
    const [apiProjects, legacyProjects] = await Promise.all([
      this.publicProjectsService.getProjects(),
      Promise.resolve(this.legacyProjectService.getProjects()),
    ]);

    if (!apiProjects.length) {
      return this.sortProjectsByRecency(legacyProjects).slice(0, this.maxHomeProjects);
    }

    const seen = new Set(apiProjects.map((project) => project.title.trim().toLowerCase()));
    const merged: CollageProject[] = [...apiProjects];
    for (const legacy of legacyProjects) {
      const key = legacy.title.trim().toLowerCase();
      if (!seen.has(key)) {
        merged.push(legacy);
      }
    }
    return this.sortProjectsByRecency(merged).slice(0, this.maxHomeProjects);
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
      const createdAtDiff = this.getProjectCreatedAtValue(right) - this.getProjectCreatedAtValue(left);
      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }

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

  private getProjectCreatedAtValue(project: CollageProject): number {
    const rawValue = 'createdAt' in project ? project.createdAt : undefined;
    if (!rawValue) {
      return 0;
    }

    const timestamp = Date.parse(rawValue);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private isNewsSection(section: PublicPageSection): boolean {
    const sectionKey = section.sectionKey?.trim().toLowerCase() ?? '';
    const title = section.title?.trim().toLowerCase() ?? '';
    return sectionKey === 'news' || sectionKey === 'noticias' || title === 'news' || title === 'noticias';
  }
}
