import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  selector: 'app-admin-project-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-project-create.component.html',
  styleUrls: ['./admin-project-create.component.scss']
})
export class AdminProjectCreateComponent {
  saving = false;
  loading = false;
  error = '';
  projectId: number | null = null;
  project: AdminProjectDetail | null = null;
  images: ProjectImageView[] = [];

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

  constructor(private data: AdminDataService) {}

  async createProject() {
    const name = this.draft.name.trim();
    const clientName = this.draft.clientName.trim();
    const address = this.draft.address.trim();
    if (!name || !clientName || !address) {
      this.error = 'Nombre, cliente y direccion son obligatorios.';
      return;
    }
    this.saving = true;
    this.error = '';
    const result = await this.data.createProject({
      name,
      clientName,
      address,
      description: this.draft.description || null,
      status: this.draft.status,
      startDate: this.draft.startDate || null,
      endDate: this.draft.endDate || null
    });
    this.saving = false;
    if (!result.ok || !result.id) {
      this.error = result.error ?? 'No se pudo crear el proyecto.';
      return;
    }
    this.projectId = result.id;
    await this.loadProject(result.id);
  }

  async saveProject() {
    if (!this.projectId) {
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
    const result = await this.data.updateProject(this.projectId, {
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
    await this.loadProject(this.projectId);
  }

  private async loadProject(projectId: number) {
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
    const images = Array.isArray(project.images) ? project.images : [];
    this.images = images.map((image) => ({
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

  async addImage() {
    if (!this.projectId) {
      return;
    }
    const fileUrl = this.imageDraft.fileUrl.trim();
    if (!fileUrl) {
      this.error = 'La URL de la imagen es obligatoria.';
      return;
    }
    const result = await this.data.createProjectImage(this.projectId, {
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
    await this.loadProject(this.projectId);
  }

  async saveImage(image: ProjectImageView) {
    if (!this.projectId) {
      return;
    }
    const result = await this.data.updateProjectImage(this.projectId, image.id, {
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
    await this.loadProject(this.projectId);
  }

  async deleteImage(image: ProjectImageView) {
    if (!this.projectId) {
      return;
    }
    const confirmed = confirm('Eliminar esta imagen?');
    if (!confirmed) {
      return;
    }
    const ok = await this.data.deleteProjectImage(this.projectId, image.id);
    if (!ok) {
      this.error = 'No se pudo eliminar la imagen.';
      return;
    }
    await this.loadProject(this.projectId);
  }

  async savePortfolio() {
    if (!this.projectId) {
      return;
    }
    this.error = '';
    if (!this.portfolioDraft.enabled) {
      const ok = await this.data.removeProjectPortfolio(this.projectId);
      if (!ok) {
        this.error = 'No se pudo quitar del portafolio.';
        return;
      }
      await this.loadProject(this.projectId);
      return;
    }

    const result = await this.data.updateProjectPortfolio(this.projectId, {
      titleOverride: this.portfolioDraft.titleOverride || null,
      sortOrder: this.portfolioDraft.sortOrder,
      isVisible: this.portfolioDraft.isVisible
    });
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo actualizar el portafolio.';
      return;
    }
    await this.loadProject(this.projectId);
  }
}
