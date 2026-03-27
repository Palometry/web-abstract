import { Injectable } from '@angular/core';

export interface ProjectData {
  id: string;
  title: string;
  shortDesc: string;
  image: string;
  thumbImage: string;
  createdAt?: string;
  classification?: string;
  category?: string;
  scope?: string;
  brochurePdfUrl?: string;
  brochureCoverUrl?: string;
  masterplanImage?: string;
  heroVideoUrl?: string;
  houseModels?: {
    name: string;
    description?: string;
    rooms?: number;
    features?: string[];
    images?: string[];
    image?: string;
  }[];
  housePlans?: { name: string; ambientes: number; totalArea: string; coveredArea: string; image: string }[];
  autocad360Url?: string;
  mapUrl?: string;
  mapEmbedUrl?: string;
  enjoyAreas?: string[];
  location: string;
  promoter: string;
  status: string;
  type: string;
  landArea: string;
  units: number | null;
  amenities: string[];
  startYear: number;
  deliveryYear: number;
  description: string;
  gallery: string[];
  lots?: { id: string; area: string; status: 'Disponible' | 'Reservado' | 'Vendido' }[];
  videos?: {
    id: number;
    fileUrl: string;
    title?: string | null;
    description?: string | null;
    mimeType?: string | null;
    sortOrder?: number;
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private projects: ProjectData[] = [];

  getProjects(): ProjectData[] {
    return this.projects;
  }

  getProjectById(id: string): ProjectData | undefined {
    return this.projects.find((project) => project.id === id);
  }
}
