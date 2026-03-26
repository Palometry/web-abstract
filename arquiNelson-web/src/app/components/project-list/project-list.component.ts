import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicProjectsService, PublicProject } from '../../services/public-projects';
import { ProjectData, ProjectService } from '../../services/project';
import {
  DEFAULT_PROJECT_CATALOG,
  formatProjectLabel,
  formatProjectTypeLabel,
} from '../../admin/project-classifications';

type CollageProject = PublicProject | ProjectData;

type CollageTile = {
  id: number | string;
  src: string;
  alt: string;
  title: string;
  summary: string;
  category: string;
  classification: string;
  project: CollageProject;
};

type CollageRow = {
  featured: CollageTile;
  stacked: CollageTile[];
  reverse: boolean;
};

type CollageSection = {
  year: number | null;
  label: string | null;
  rows: CollageRow[];
};

type TaxonomyResolution = {
  type: string;
  classification: string;
};

type ScopeCatalogMaps = {
  types: Map<string, string>;
  classifications: Map<string, TaxonomyResolution>;
  categories: Map<string, TaxonomyResolution>;
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
  collageSections: CollageSection[] = [];
  private allCollageItems: CollageTile[] = [];
  private readonly edificacionesCatalog = this.buildEdificacionesCatalog();
  private readonly habilitacionesCatalog = this.buildHabilitacionesCatalog();
  selectedType = '';
  selectedClassification = '';

  constructor(
    private projectService: PublicProjectsService,
    private legacyProjectService: ProjectService,
    private cdr: ChangeDetectorRef
  ) {
    this.loadProjects();
  }

  onCollageError(tile: CollageTile): void {
    const project = tile.project;
    if (!project) {
      return;
    }

    const fallbackImage = this.collectProjectImages(project).find((image) => image !== tile.src);
    if (!fallbackImage) {
      return;
    }

    this.collageItems = this.collageItems.map((item) => item === tile ? {
      ...item,
      src: fallbackImage,
      alt: project.title,
    } : item);
    this.rebuildCollageLayout();
    this.cdr.detectChanges();
  }

  trackSection(_index: number, section: CollageSection): string {
    return section.year === null ? 'current' : String(section.year);
  }

  trackRow(index: number, row: CollageRow): string {
    return `${row.featured.id}-${index}`;
  }

  trackTile(_index: number, tile: CollageTile): string | number {
    return tile.id;
  }

  get typeOptions(): string[] {
    const edificaciones = Object.keys(DEFAULT_PROJECT_CATALOG.edificaciones).map((label) => formatProjectTypeLabel(label));
    const habilitaciones = Object.keys(DEFAULT_PROJECT_CATALOG.habilitaciones).map((label) => formatProjectTypeLabel(label));

    return this.getUniqueOptions([...edificaciones, ...habilitaciones]);
  }

  get classificationOptions(): string[] {
    if (!this.selectedType) {
      return [];
    }

    const selectedKey = this.toLookupKey(this.selectedType);

    for (const [typeLabel, classificationMap] of Object.entries(DEFAULT_PROJECT_CATALOG.edificaciones)) {
      if (this.toLookupKey(typeLabel) !== selectedKey) {
        continue;
      }

      return this.getUniqueOptions(
        Object.keys(classificationMap).map((label) => formatProjectLabel(label))
      );
    }

    for (const [typeLabel, classificationList] of Object.entries(DEFAULT_PROJECT_CATALOG.habilitaciones)) {
      if (this.toLookupKey(typeLabel) !== selectedKey) {
        continue;
      }

      return this.getUniqueOptions(
        classificationList.map((label) => formatProjectLabel(label))
      );
    }

    return [];
  }

  onTypeChange(value: string): void {
    this.selectedType = value;
    if (this.selectedClassification && !this.classificationOptions.includes(this.selectedClassification)) {
      this.selectedClassification = '';
    }
    this.applyFilters();
  }

  onClassificationChange(value: string): void {
    this.selectedClassification = value;
    this.applyFilters();
  }

  formatTypeLabel(label: string): string {
    return formatProjectTypeLabel(label);
  }

  formatClassificationLabel(label: string): string {
    return formatProjectLabel(label);
  }

  private async loadProjects() {
    try {
      const [apiProjects, legacyProjects] = await Promise.all([
        this.projectService.getProjects(),
        Promise.resolve(this.legacyProjectService.getProjects())
      ]);

      const merged = this.mergeProjects(apiProjects, legacyProjects);
      const ordered = this.sortProjectsByRecency(merged);
      this.allCollageItems = this.buildCollageItems(ordered);
      this.applyFilters();
      this.cdr.detectChanges();
    } catch {
      const ordered = this.sortProjectsByRecency(this.legacyProjectService.getProjects());
      this.allCollageItems = this.buildCollageItems(ordered);
      this.applyFilters();
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
      const taxonomy = this.resolveProjectTaxonomy(project);
      return {
        id: project.id,
        src: image,
        alt: project.title,
        title: project.title,
        summary: project.shortDesc || project.description || 'Explora este proyecto en detalle.',
        category: taxonomy.type || project.type || project.status || 'Proyecto',
        classification: taxonomy.classification,
        project,
      };
    });
  }

  private rebuildCollageLayout(): void {
    this.collageRows = this.buildCollageRows(this.collageItems);
    this.collageSections = this.buildCollageSections(this.collageItems);
  }

  private buildCollageSections(items: CollageTile[]): CollageSection[] {
    if (!items.length) {
      return [];
    }

    const currentYear = new Date().getFullYear();
    const sections = new Map<number | 'current', CollageTile[]>();

    for (const item of items) {
      const year = this.getProjectDisplayYearValue(item.project);
      const key = year > 0 ? year : 'current';
      const bucket = sections.get(key) ?? [];
      bucket.push(item);
      sections.set(key, bucket);
    }

    return Array.from(sections.entries()).map(([key, sectionItems]) => {
      const year = key === 'current' ? null : key;
      return {
        year,
        label: year !== null && year < currentYear ? String(year) : null,
        rows: this.buildCollageRows(sectionItems),
      };
    });
  }

  private applyFilters(): void {
    this.collageItems = this.allCollageItems.filter((item) => {
      const matchesType = !this.selectedType || item.category === this.selectedType;
      const matchesClassification = !this.selectedClassification || item.classification === this.selectedClassification;
      return matchesType && matchesClassification;
    });
    this.rebuildCollageLayout();
  }

  private getUniqueOptions(values: string[]): string[] {
    return Array.from(
      new Set(
        values
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      )
    ).sort((left, right) => left.localeCompare(right, 'es'));
  }

  private resolveProjectTaxonomy(project: CollageProject): TaxonomyResolution {
    const rawType = formatProjectTypeLabel(project.type || '');
    const rawClassification = formatProjectLabel('classification' in project ? project.classification || '' : '');
    const rawScope = formatProjectLabel('scope' in project ? project.scope || '' : '');

    const scopesToTry = this.getScopesToTry(rawScope);
    const labelsToTry = [rawType, rawClassification].filter((label, index, values) => label && values.indexOf(label) === index);

    for (const scope of scopesToTry) {
      const resolution = this.resolveForScope(scope, labelsToTry);
      if (resolution) {
        return resolution;
      }
    }

    return {
      type: rawType,
      classification: rawClassification,
    };
  }

  private getScopesToTry(scope: string): Array<'Edificaciones' | 'Habilitaciones'> {
    const normalized = this.toLookupKey(scope);
    if (normalized === this.toLookupKey('Edificaciones')) {
      return ['Edificaciones', 'Habilitaciones'];
    }

    if (normalized === this.toLookupKey('Habilitaciones')) {
      return ['Habilitaciones', 'Edificaciones'];
    }

    return ['Edificaciones', 'Habilitaciones'];
  }

  private resolveForScope(scope: 'Edificaciones' | 'Habilitaciones', labels: string[]): TaxonomyResolution | null {
    const catalog = scope === 'Edificaciones' ? this.edificacionesCatalog : this.habilitacionesCatalog;

    for (const label of labels) {
      const typeMatch = catalog.types.get(this.toLookupKey(label));
      if (!typeMatch) {
        continue;
      }

      for (const secondary of labels) {
        const classificationMatch = catalog.classifications.get(this.toLookupKey(secondary));
        if (classificationMatch && classificationMatch.type === typeMatch) {
          return classificationMatch;
        }

        const categoryMatch = catalog.categories.get(this.toLookupKey(secondary));
        if (categoryMatch && categoryMatch.type === typeMatch) {
          return categoryMatch;
        }
      }

      return {
        type: typeMatch,
        classification: '',
      };
    }

    for (const label of labels) {
      const classificationMatch = catalog.classifications.get(this.toLookupKey(label));
      if (classificationMatch) {
        return classificationMatch;
      }
    }

    for (const label of labels) {
      const categoryMatch = catalog.categories.get(this.toLookupKey(label));
      if (categoryMatch) {
        return categoryMatch;
      }
    }

    return null;
  }

  private buildEdificacionesCatalog(): ScopeCatalogMaps {
    const types = new Map<string, string>();
    const classifications = new Map<string, TaxonomyResolution>();
    const categories = new Map<string, TaxonomyResolution>();

    for (const [typeLabel, classificationMap] of Object.entries(DEFAULT_PROJECT_CATALOG.edificaciones)) {
      const cleanType = formatProjectTypeLabel(typeLabel);
      types.set(this.toLookupKey(cleanType), cleanType);
      types.set(this.toLookupKey(typeLabel), cleanType);

      for (const [classificationLabel, categoryList] of Object.entries(classificationMap)) {
        const cleanClassification = formatProjectLabel(classificationLabel);
        const resolution = { type: cleanType, classification: cleanClassification };
        classifications.set(this.toLookupKey(cleanClassification), resolution);
        classifications.set(this.toLookupKey(classificationLabel), resolution);

        for (const categoryLabel of categoryList) {
          const cleanCategory = formatProjectLabel(categoryLabel);
          categories.set(this.toLookupKey(cleanCategory), resolution);
          categories.set(this.toLookupKey(categoryLabel), resolution);
        }
      }
    }

    return { types, classifications, categories };
  }

  private buildHabilitacionesCatalog(): ScopeCatalogMaps {
    const types = new Map<string, string>();
    const classifications = new Map<string, TaxonomyResolution>();
    const categories = new Map<string, TaxonomyResolution>();

    for (const [typeLabel, classificationList] of Object.entries(DEFAULT_PROJECT_CATALOG.habilitaciones)) {
      const cleanType = formatProjectTypeLabel(typeLabel);
      types.set(this.toLookupKey(cleanType), cleanType);
      types.set(this.toLookupKey(typeLabel), cleanType);

      for (const classificationLabel of classificationList) {
        const cleanClassification = formatProjectLabel(classificationLabel);
        const resolution = { type: cleanType, classification: cleanClassification };
        classifications.set(this.toLookupKey(cleanClassification), resolution);
        classifications.set(this.toLookupKey(classificationLabel), resolution);
      }
    }

    return { types, classifications, categories };
  }

  private toLookupKey(value: string): string {
    return formatProjectLabel(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
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

  private getProjectDisplayYearValue(project: CollageProject): number {
    const recency = this.getProjectRecencyValue(project);
    if (recency > 0) {
      return recency;
    }

    const createdAt = this.getProjectCreatedAtValue(project);
    if (createdAt > 0) {
      return new Date(createdAt).getFullYear();
    }

    return 0;
  }

  private sortProjectsByRecency(projects: CollageProject[]): CollageProject[] {
    return [...projects].sort((left, right) => {
      const yearDiff = this.getProjectRecencyValue(right) - this.getProjectRecencyValue(left);
      if (yearDiff !== 0) {
        return yearDiff;
      }

      const createdAtDiff = this.getProjectCreatedAtValue(right) - this.getProjectCreatedAtValue(left);
      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }

      const rightId = typeof right.id === 'number' ? right.id : Number.NaN;
      const leftId = typeof left.id === 'number' ? left.id : Number.NaN;
      if (!Number.isNaN(rightId) && !Number.isNaN(leftId) && rightId !== leftId) {
        return rightId - leftId;
      }

      return left.title.localeCompare(right.title, 'es');
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
}
