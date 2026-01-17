import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminDataService, AdminProjectDetail, AdminProjectImage } from '../../services/admin-data';

type ProjectImageView = AdminProjectImage & {
  draft: {
    fileUrl: string;
    title: string;
    altText: string;
    isCover: boolean;
    sortOrder: number;
  };
};

@Component({
  selector: 'app-admin-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-project-detail.component.html',
  styleUrls: ['./admin-project-detail.component.scss']
})
export class AdminProjectDetailComponent implements OnInit {
  project: AdminProjectDetail | null = null;
  images: ProjectImageView[] = [];
  loading = false;
  saving = false;
  error = '';

  draft = {
    name: '',
    clientName: '',
    address: '',
    description: '',
    status: 'draft',
    startDate: '',
    endDate: ''
  };

  imageDraft = {
    fileUrl: '',
    title: '',
    altText: '',
    isCover: false,
    sortOrder: 0
  };

  portfolioDraft = {
    enabled: false,
    titleOverride: '',
    sortOrder: 0,
    isVisible: true
  };

  constructor(private route: ActivatedRoute, private data: AdminDataService) {}

  ngOnInit() {
    this.loadProject();
  }

  async loadProject() {
    const projectId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(projectId)) {
      this.error = 'Proyecto invalido.';
      return;
    }
    this.loading = true;
    this.error = '';
    const project = await this.data.getProjectDetail(projectId);
    if (!project) {
      this.error = 'No se encontro el proyecto.';
      this.loading = false;
      return;
    }
    this.project = project;
    this.draft = {
      name: project.name,
      clientName: project.clientName,
      address: project.address,
      description: project.description ?? '',
      status: project.status,
      startDate: project.startDate ?? '',
      endDate: project.endDate ?? ''
    };
    this.images = project.images.map((image) => ({
      ...image,
      draft: {
        fileUrl: image.fileUrl,
        title: image.title ?? '',
        altText: image.altText ?? '',
        isCover: image.isCover,
        sortOrder: image.sortOrder
      }
    }));
    this.portfolioDraft = {
      enabled: !!project.portfolioEntry,
      titleOverride: project.portfolioEntry?.titleOverride ?? '',
      sortOrder: project.portfolioEntry?.sortOrder ?? 0,
      isVisible: project.portfolioEntry?.isVisible ?? true
    };
    this.loading = false;
  }

  async saveProject() {
    if (!this.project) {
      return;
    }
    const name = this.draft.name.trim();
    const clientName = this.draft.clientName.trim();
    const address = this.draft.address.trim();
    if (!name || !clientName || !address) {
      this.error = 'Nombre, cliente y direccion son obligatorios.';
      return;
    }
    this.saving = true;
    this.error = '';
    const result = await this.data.updateProject(this.project.id, {
      name,
      clientName,
      address,
      description: this.draft.description || null,
      status: this.draft.status,
      startDate: this.draft.startDate || null,
      endDate: this.draft.endDate || null
    });
    this.saving = false;
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo guardar el proyecto.';
      return;
    }
    await this.loadProject();
  }

  async addImage() {
    if (!this.project) {
      return;
    }
    const fileUrl = this.imageDraft.fileUrl.trim();
    if (!fileUrl) {
      this.error = 'La URL de la imagen es obligatoria.';
      return;
    }
    const result = await this.data.createProjectImage(this.project.id, {
      fileUrl,
      title: this.imageDraft.title || null,
      altText: this.imageDraft.altText || null,
      isCover: this.imageDraft.isCover,
      sortOrder: this.imageDraft.sortOrder
    });
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo agregar la imagen.';
      return;
    }
    this.imageDraft = { fileUrl: '', title: '', altText: '', isCover: false, sortOrder: 0 };
    await this.loadProject();
  }

  async saveImage(image: ProjectImageView) {
    if (!this.project) {
      return;
    }
    const result = await this.data.updateProjectImage(this.project.id, image.id, {
      fileUrl: image.draft.fileUrl.trim(),
      title: image.draft.title || null,
      altText: image.draft.altText || null,
      isCover: image.draft.isCover,
      sortOrder: image.draft.sortOrder
    });
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo guardar la imagen.';
      return;
    }
    await this.loadProject();
  }

  async deleteImage(image: ProjectImageView) {
    if (!this.project) {
      return;
    }
    const confirmed = confirm('Eliminar esta imagen?');
    if (!confirmed) {
      return;
    }
    const ok = await this.data.deleteProjectImage(this.project.id, image.id);
    if (!ok) {
      this.error = 'No se pudo eliminar la imagen.';
      return;
    }
    await this.loadProject();
  }

  async savePortfolio() {
    if (!this.project) {
      return;
    }
    this.error = '';
    if (!this.portfolioDraft.enabled) {
      const ok = await this.data.removeProjectPortfolio(this.project.id);
      if (!ok) {
        this.error = 'No se pudo quitar del portafolio.';
        return;
      }
      await this.loadProject();
      return;
    }

    const result = await this.data.updateProjectPortfolio(this.project.id, {
      titleOverride: this.portfolioDraft.titleOverride || null,
      sortOrder: this.portfolioDraft.sortOrder,
      isVisible: this.portfolioDraft.isVisible
    });
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo actualizar el portafolio.';
      return;
    }
    await this.loadProject();
  }
}
