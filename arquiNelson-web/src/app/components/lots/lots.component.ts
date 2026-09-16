import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PublicProject, PublicProjectsService } from '../../services/public-projects';

type LotStatus = 'Disponible' | 'Reservado' | 'Vendido' | string;

type LotCard = {
  key: string;
  id: string;
  projectId: number | string;
  projectRouteId: number | string;
  projectTitle: string;
  projectType: string;
  location: string;
  promoter: string;
  area: string;
  areaValue: number;
  status: LotStatus;
  price: number | null;
  oldPrice: number | null;
  block: string;
  frontage: string;
  depth: string;
  notes: string;
  image: string;
  gallery: string[];
  amenities: string[];
};

@Component({
  selector: 'app-lots',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lots.component.html',
  styleUrls: ['./lots.component.scss']
})
export class LotsComponent {
  readonly whatsappNumber = '51956639199';
  isLoading = true;
  error = '';
  lots: LotCard[] = [];
  searchTerm = '';
  selectedStatus = '';
  selectedProject = '';
  minArea: number | null = null;
  maxArea: number | null = null;
  onlyAvailable = false;

  private readonly currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0
  });

  constructor(
    private readonly projectService: PublicProjectsService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.loadLots();
  }

  get filteredLots(): LotCard[] {
    const term = this.normalize(this.searchTerm);
    return this.lots.filter((lot) => {
      const matchesSearch = !term || [
        lot.id,
        lot.projectTitle,
        lot.location,
        lot.projectType,
        lot.block,
        lot.status,
      ].some((value) => this.normalize(value).includes(term));
      const matchesStatus = !this.selectedStatus || lot.status === this.selectedStatus;
      const matchesProject = !this.selectedProject || lot.projectTitle === this.selectedProject;
      const matchesAvailable = !this.onlyAvailable || this.isAvailable(lot.status);
      const matchesMinArea = this.minArea === null || lot.areaValue >= this.minArea;
      const matchesMaxArea = this.maxArea === null || lot.areaValue <= this.maxArea;

      return matchesSearch && matchesStatus && matchesProject && matchesAvailable && matchesMinArea && matchesMaxArea;
    });
  }

  get projectOptions(): string[] {
    return [...new Set(this.lots.map((lot) => lot.projectTitle))].sort((a, b) => a.localeCompare(b));
  }

  get statusOptions(): string[] {
    return [...new Set(this.lots.map((lot) => lot.status))];
  }

  get availableCount(): number {
    return this.lots.filter((lot) => this.isAvailable(lot.status)).length;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedProject = '';
    this.minArea = null;
    this.maxArea = null;
    this.onlyAvailable = false;
  }

  setStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.onlyAvailable = false;
  }

  setProjectFilter(project: string): void {
    this.selectedProject = project;
  }

  formatPrice(value: number | null): string {
    return value === null ? 'Consultar precio' : this.currency.format(value);
  }

  buildWhatsAppHref(lot: LotCard): string {
    const message = encodeURIComponent(
      `Hola, quiero informacion del ${lot.id} en ${lot.projectTitle}. Area: ${lot.area}. Estado: ${lot.status}.`
    );

    return `https://wa.me/${this.whatsappNumber}?text=${message}`;
  }

  isAvailable(status: LotStatus): boolean {
    return this.normalize(status) === 'disponible';
  }

  statusClass(status: LotStatus): string {
    const normalized = this.normalize(status);
    if (normalized === 'disponible') {
      return 'available';
    }
    if (normalized === 'reservado') {
      return 'reserved';
    }
    if (normalized === 'vendido') {
      return 'sold';
    }
    return 'neutral';
  }

  trackLot(_index: number, lot: LotCard): string {
    return lot.key;
  }

  private async loadLots(): Promise<void> {
    try {
      const projects = await this.projectService.getProjects();
      const details = await Promise.all(
        projects.map((project) => this.projectService.getProjectById(this.getProjectRouteId(project)))
      );

      this.lots = details
        .filter((project): project is PublicProject => !!project)
        .flatMap((project) => this.buildLotsFromProject(project));
    } catch {
      this.error = 'No pudimos cargar los lotes en este momento.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private buildLotsFromProject(project: PublicProject): LotCard[] {
    const projectLots = Array.isArray(project.lots) ? project.lots : [];
    const gallery = this.projectImages(project);

    return projectLots.map((lot, index) => ({
      key: `${project.id}-${lot.id || index}`,
      id: lot.id || `Lote ${index + 1}`,
      projectId: project.id,
      projectRouteId: this.getProjectRouteId(project),
      projectTitle: project.title,
      projectType: project.type || project.classification || 'Lote residencial',
      location: project.location || 'Ubicacion por confirmar',
      promoter: project.promoter || '',
      area: lot.area || 'Area por confirmar',
      areaValue: this.parseArea(lot.area),
      status: lot.status || 'Disponible',
      price: this.parseMoney(lot.price),
      oldPrice: this.parseMoney(lot.oldPrice),
      block: lot.block || '',
      frontage: lot.frontage || '',
      depth: lot.depth || '',
      notes: lot.notes || project.shortDesc || project.description || '',
      image: gallery[index % gallery.length] || '/img/LOGO.webp',
      gallery,
      amenities: project.amenities || [],
    }));
  }

  private projectImages(project: PublicProject): string[] {
    return [
      project.image,
      project.thumbImage,
      project.masterplanImage,
      ...(project.bannerImages || []),
      ...(project.gallery || []),
    ].filter((image): image is string => typeof image === 'string' && image.trim().length > 0);
  }

  private getProjectRouteId(project: PublicProject): number | string {
    return typeof project.slug === 'string' && project.slug.trim() ? project.slug.trim() : project.id;
  }

  private parseArea(value: string | null | undefined): number {
    if (!value) {
      return 0;
    }
    const number = Number(String(value).replace(',', '.').match(/\d+(\.\d+)?/)?.[0] ?? 0);
    return Number.isFinite(number) ? number : 0;
  }

  private parseMoney(value: number | string | null | undefined): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value !== 'string') {
      return null;
    }
    const parsed = Number(value.replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private normalize(value: string | null | undefined): string {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
