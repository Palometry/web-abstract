import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  AdminDataService,
  AdminProjectDetail,
  AdminProjectDetails,
  AdminProjectImage,
  AdminProjectVideo
} from '../../services/admin-data';
import { DEFAULT_PROJECT_CATALOG, ProjectCatalog } from '../project-classifications';

type ProjectImageView = AdminProjectImage & {
  draft: {
    fileUrl: string;
    title: string;
    altText: string;
    isCover: boolean;
    sortOrder: number;
  };
};

type ProjectVideoView = AdminProjectVideo & {
  draft: {
    fileUrl: string;
    title: string;
    description: string;
    sortOrder: number;
  };
};

type HouseModelDraft = {
  name: string;
  description: string;
  rooms: string;
  featuresText: string;
  images: string[];
  newImageUrl: string;
};

@Component({
  selector: 'app-admin-project-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-project-create.component.html',
  styleUrls: ['./admin-project-create.component.scss']
})
export class AdminProjectCreateComponent implements OnInit {
  saving = false;
  loading = false;
  error = '';
  uploading = false;
  imageUploadStates: Record<number, boolean> = {};
  projectId: number | null = null;
  project: AdminProjectDetail | null = null;
  images: ProjectImageView[] = [];
  videos: ProjectVideoView[] = [];
  successMessage = '';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  draft = {
    name: '',
    clientName: '',
    address: '',
    description: '',
    status: 'draft',
    startDate: '',
    endDate: ''
  };

  detailsDraft = {
    shortDesc: '',
    location: '',
    promoter: '',
    publicScope: '',
    publicType: '',
    publicClassification: '',
    publicCategory: '',
    landArea: '',
    units: '',
    amenitiesText: '',
    startYear: '',
    deliveryYear: '',
    autocadUrl: '',
    mapUrl: '',
    mapEmbedUrl: '',
    masterplanImage: '',
    bannerImagesText: '',
    galleryText: '',
    enjoyAreasText: '',
    housePlansText: '',
    lotsText: ''
  };

  imageDraft = {
    fileUrl: '',
    title: '',
    altText: '',
    isCover: false,
    sortOrder: 0
  };

  videoDraft = {
    fileUrl: '',
    title: '',
    description: '',
    sortOrder: 0
  };

  houseModels: HouseModelDraft[] = [];
  activeHouseModelIndex = 0;
  activeHouseImageIndex = 0;

  private catalog: ProjectCatalog = DEFAULT_PROJECT_CATALOG;

  constructor(
    private data: AdminDataService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadCatalog();
  }

  private async loadCatalog() {
    const catalog = await this.data.getProjectCatalog();
    if (catalog) {
      this.catalog = catalog;
    }
  }

  getVideoEmbedUrl(url?: string | null): SafeResourceUrl | null {
    const embed = this.toVideoEmbedUrl(url);
    return embed ? this.sanitizer.bypassSecurityTrustResourceUrl(embed) : null;
  }

  isDirectVideoUrl(url?: string | null): boolean {
    if (!url) {
      return false;
    }
    const clean = url.split('?')[0].toLowerCase();
    return clean.startsWith('data:video/')
      || clean.endsWith('.mp4')
      || clean.endsWith('.webm')
      || clean.endsWith('.ogg')
      || clean.endsWith('.ogv')
      || clean.endsWith('.mov')
      || clean.endsWith('.m4v')
      || clean.endsWith('.avi');
  }

  get publicScopeOptions(): string[] {
    return this.catalog.scopes;
  }

  get publicTypeOptions(): string[] {
    const scope = this.detailsDraft.publicScope;
    if (scope === 'Edificaciones') {
      return Object.keys(this.catalog.edificaciones);
    }
    if (scope === 'Habilitaciones') {
      return Object.keys(this.catalog.habilitaciones);
    }
    return [];
  }

  get publicClassificationOptions(): string[] {
    const scope = this.detailsDraft.publicScope;
    const type = this.detailsDraft.publicType;
    if (!type) {
      return [];
    }
    if (scope === 'Edificaciones') {
      const typeData = this.catalog.edificaciones[type];
      return typeData ? Object.keys(typeData) : [];
    }
    if (scope === 'Habilitaciones') {
      return this.catalog.habilitaciones[type] ?? [];
    }
    return [];
  }

  get publicCategoryOptions(): string[] {
    if (this.detailsDraft.publicScope !== 'Edificaciones') {
      return [];
    }
    if (this.detailsDraft.publicType === 'A.030 HOSPEDAJE') {
      const starOptions = this.getHospedajeStars();
      if (starOptions.length) {
        return starOptions;
      }
    }
    const typeData = this.catalog.edificaciones[this.detailsDraft.publicType];
    if (!typeData) {
      return [];
    }
    return typeData[this.detailsDraft.publicClassification] ?? [];
  }

  get publicCategoryLabel(): string {
    if (this.detailsDraft.publicType === 'A.030 HOSPEDAJE') {
      return 'Categoría (estrellas)';
    }
    return 'Categoría';
  }

  private getHospedajeStars(): string[] {
    const classification = this.detailsDraft.publicClassification;
    const map: Record<string, number[]> = {
      Hotel: [1, 2, 3, 4, 5],
      'Apart-hotel': [3, 4, 5],
      Hostal: [1, 2, 3],
      Albergue: [],
    };
    const stars = map[classification];
    return stars ? stars.map((value) => `${value} ${value === 1 ? 'estrella' : 'estrellas'}`) : [];
  }

  onPublicScopeChange() {
    this.detailsDraft.publicType = '';
    this.detailsDraft.publicClassification = '';
    this.detailsDraft.publicCategory = '';
  }

  onPublicTypeChange() {
    this.detailsDraft.publicClassification = '';
    this.detailsDraft.publicCategory = '';
  }

  onPublicClassificationChange() {
    this.detailsDraft.publicCategory = '';
  }

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
    try {
      const result = await this.data.createProject({
        name,
        clientName,
        address,
        description: this.draft.description || null,
        status: this.draft.status,
        startDate: this.draft.startDate || null,
        endDate: this.draft.endDate || null,
        details: this.buildDetailsPayload()
      });
      if (!result.ok || !result.id) {
        this.error = result.error ?? 'No se pudo crear el proyecto.';
        return;
      }
      this.projectId = result.id;
      await this.loadProject(result.id);
      this.showToast('Proyecto creado.');
    } finally {
      this.saving = false;
    }
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
    try {
      const result = await this.data.updateProject(this.projectId, {
        name,
        clientName,
        address,
        description: this.draft.description || null,
        status: this.draft.status,
        startDate: this.draft.startDate || null,
        endDate: this.draft.endDate || null,
        details: this.buildDetailsPayload()
      });
      if (!result.ok) {
        this.error = result.error ?? 'No se pudo guardar el proyecto.';
        return;
      }
      await this.loadProject(this.projectId);
      this.showToast('Proyecto actualizado.');
    } finally {
      this.saving = false;
    }
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
    this.applyDetailsToDraft(project.details);
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
    const videos = Array.isArray(project.videos) ? project.videos : [];
    this.videos = videos.map((video) => ({
      ...video,
      draft: {
        fileUrl: video.fileUrl,
        title: video.title ?? '',
        description: video.description ?? '',
        sortOrder: video.sortOrder
      }
    }));
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

  async addVideo() {
    if (!this.projectId) {
      return;
    }
    const fileUrl = this.videoDraft.fileUrl.trim();
    if (!fileUrl) {
      this.error = 'Ingresa una URL del video.';
      return;
    }
    const result = await this.data.createProjectVideo(this.projectId, {
      fileUrl,
      title: this.videoDraft.title || null,
      description: this.videoDraft.description || null,
      sortOrder: this.videoDraft.sortOrder
    });
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo agregar el video.';
      return;
    }
    this.videoDraft = { fileUrl: '', title: '', description: '', sortOrder: 0 };
    await this.loadProject(this.projectId);
  }

  async uploadImageDraft(event: Event) {
    if (!this.projectId) {
      return;
    }
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.uploading = true;
    const result = await this.data.uploadMedia(file, { title: this.imageDraft.title || undefined });
    this.uploading = false;
    if (!result.ok || !result.fileUrl) {
      this.error = result.error ?? 'No se pudo subir la imagen.';
      return;
    }
    this.imageDraft.fileUrl = result.fileUrl;
    if (input) {
      input.value = '';
    }
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

  async saveVideo(video: ProjectVideoView) {
    if (!this.projectId) {
      return;
    }
    const result = await this.data.updateProjectVideo(this.projectId, video.id, {
      fileUrl: video.draft.fileUrl.trim(),
      title: video.draft.title || null,
      description: video.draft.description || null,
      sortOrder: video.draft.sortOrder
    });
    if (!result.ok) {
      this.error = result.error ?? 'No se pudo guardar el video.';
      return;
    }
    await this.loadProject(this.projectId);
  }

  async uploadImageForExisting(image: ProjectImageView, event: Event) {
    if (!this.projectId) {
      return;
    }
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.imageUploadStates[image.id] = true;
    const result = await this.data.uploadMedia(file, { title: image.draft.title || undefined });
    this.imageUploadStates[image.id] = false;
    if (!result.ok || !result.fileUrl) {
      this.error = result.error ?? 'No se pudo subir la imagen.';
      return;
    }
    image.draft.fileUrl = result.fileUrl;
    if (input) {
      input.value = '';
    }
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

  async deleteVideo(video: ProjectVideoView) {
    if (!this.projectId) {
      return;
    }
    const confirmed = confirm('Eliminar este video?');
    if (!confirmed) {
      return;
    }
    const ok = await this.data.deleteProjectVideo(this.projectId, video.id);
    if (!ok) {
      this.error = 'No se pudo eliminar el video.';
      return;
    }
    await this.loadProject(this.projectId);
  }

  async uploadDetailImage(event: Event, field: keyof typeof this.detailsDraft) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.uploading = true;
    const result = await this.data.uploadMedia(file, { title: file.name });
    this.uploading = false;
    if (!result.ok || !result.fileUrl) {
      this.error = result.error ?? 'No se pudo subir la imagen.';
      return;
    }
    this.detailsDraft[field] = result.fileUrl as any;
    if (input) {
      input.value = '';
    }
  }

  clearDetailImage(field: keyof typeof this.detailsDraft) {
    this.detailsDraft[field] = '' as any;
  }

  async appendDetailImage(event: Event, field: keyof typeof this.detailsDraft) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.uploading = true;
    const result = await this.data.uploadMedia(file, { title: file.name });
    this.uploading = false;
    if (!result.ok || !result.fileUrl) {
      this.error = result.error ?? 'No se pudo subir la imagen.';
      return;
    }
    const current = (this.detailsDraft[field] as unknown as string) || '';
    const next = current ? `${current}\n${result.fileUrl}` : result.fileUrl;
    this.detailsDraft[field] = next as any;
    if (input) {
      input.value = '';
    }
  }

  removeDetailListImage(field: keyof typeof this.detailsDraft, index: number) {
    const current = (this.detailsDraft[field] as unknown as string) || '';
    const lines = this.splitLines(current);
    if (index < 0 || index >= lines.length) {
      return;
    }
    lines.splice(index, 1);
    this.detailsDraft[field] = lines.join('\n') as any;
  }

  async appendHouseModelImage(event: Event) {
    const model = this.activeHouseModel;
    if (!model) {
      return;
    }
    await this.uploadHouseModelImage(model, event);
  }

  async appendHousePlanImage(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.uploading = true;
    const result = await this.data.uploadMedia(file, { title: file.name });
    this.uploading = false;
    if (!result.ok || !result.fileUrl) {
      this.error = result.error ?? 'No se pudo subir la imagen.';
      return;
    }
    const line = `Tipo | 0 | Area total | Area techada | ${result.fileUrl}`;
    this.detailsDraft.housePlansText = this.detailsDraft.housePlansText
      ? `${this.detailsDraft.housePlansText}\n${line}`
      : line;
    if (input) {
      input.value = '';
    }
  }

  get activeHouseModel(): HouseModelDraft | null {
    if (!this.houseModels.length) {
      return null;
    }
    return this.houseModels[this.activeHouseModelIndex] ?? this.houseModels[0];
  }

  get activeHouseImage(): string | null {
    const model = this.activeHouseModel;
    if (!model || !model.images.length) {
      return null;
    }
    return model.images[this.activeHouseImageIndex] ?? model.images[0];
  }

  getHouseModelFeatures(model: HouseModelDraft): string[] {
    return this.splitLines(model.featuresText);
  }

  selectHouseModel(index: number) {
    if (index < 0 || index >= this.houseModels.length) {
      return;
    }
    this.activeHouseModelIndex = index;
    this.activeHouseImageIndex = 0;
  }

  addHouseModel() {
    this.houseModels.push({
      name: '',
      description: '',
      rooms: '',
      featuresText: '',
      images: [],
      newImageUrl: ''
    });
    this.activeHouseModelIndex = this.houseModels.length - 1;
    this.activeHouseImageIndex = 0;
  }

  removeHouseModel(index: number) {
    if (index < 0 || index >= this.houseModels.length) {
      return;
    }
    this.houseModels.splice(index, 1);
    if (this.activeHouseModelIndex >= this.houseModels.length) {
      this.activeHouseModelIndex = Math.max(0, this.houseModels.length - 1);
    }
    this.activeHouseImageIndex = 0;
  }

  addHouseModelImageUrl(model: HouseModelDraft) {
    const url = model.newImageUrl.trim();
    if (!url) {
      return;
    }
    model.images.push(url);
    model.newImageUrl = '';
    this.activeHouseImageIndex = 0;
  }

  async uploadHouseModelImage(model: HouseModelDraft, event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.uploading = true;
    const result = await this.data.uploadMedia(file, { title: file.name });
    this.uploading = false;
    if (!result.ok || !result.fileUrl) {
      this.error = result.error ?? 'No se pudo subir la imagen.';
      return;
    }
    model.images.push(result.fileUrl);
    this.activeHouseImageIndex = 0;
    if (input) {
      input.value = '';
    }
  }

  removeHouseModelImage(model: HouseModelDraft, index: number) {
    if (index < 0 || index >= model.images.length) {
      return;
    }
    model.images.splice(index, 1);
    if (this.activeHouseImageIndex >= model.images.length) {
      this.activeHouseImageIndex = 0;
    }
  }

  nextHouseImage() {
    const model = this.activeHouseModel;
    if (!model || !model.images.length) {
      return;
    }
    this.activeHouseImageIndex = (this.activeHouseImageIndex + 1) % model.images.length;
  }

  prevHouseImage() {
    const model = this.activeHouseModel;
    if (!model || !model.images.length) {
      return;
    }
    this.activeHouseImageIndex =
      (this.activeHouseImageIndex - 1 + model.images.length) % model.images.length;
  }

  goToHouseImage(index: number) {
    const model = this.activeHouseModel;
    if (!model || !model.images.length) {
      return;
    }
    if (index >= 0 && index < model.images.length) {
      this.activeHouseImageIndex = index;
    }
  }

  private buildHouseModelsPayload() {
    return this.houseModels
      .map((model) => {
        const name = model.name.trim();
        if (!name) {
          return null;
        }
        const images = model.images.map((img) => img.trim()).filter(Boolean);
        const roomsValue = model.rooms ? Number(model.rooms) : null;
        return {
          name,
          description: this.nullIfEmpty(model.description),
          rooms: roomsValue !== null && Number.isFinite(roomsValue) ? roomsValue : null,
          features: this.splitLines(model.featuresText),
          images
        };
      })
      .filter(
        (
          model
        ): model is {
          name: string;
          description: string | null;
          rooms: number | null;
          features: string[];
          images: string[];
        } => Boolean(model)
      );
  }

  private normalizeHouseModels(models?: AdminProjectDetails['houseModels'] | null): HouseModelDraft[] {
    if (!models?.length) {
      return [];
    }
    return models.map((model) => {
      const images = Array.isArray(model.images)
        ? model.images
        : model.image
          ? [model.image]
          : [];
      const features = Array.isArray(model.features) ? model.features : [];
      const rooms =
        model.rooms !== undefined && model.rooms !== null ? String(model.rooms) : '';
      return {
        name: model.name ?? '',
        description: model.description ?? '',
        rooms,
        featuresText: features.join('\n'),
        images: images.filter(Boolean),
        newImageUrl: ''
      };
    });
  }

  private splitLines(value: string): string[] {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  previewImages(value: string): string[] {
    return this.splitLines(value).slice(0, 12);
  }

  private joinLines(values?: string[] | null): string {
    return values?.length ? values.join('\n') : '';
  }

  private nullIfEmpty(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private extractIframeSrc(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    if (!trimmed.toLowerCase().includes('<iframe')) {
      return trimmed;
    }
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match?.[1]?.trim() ?? '';
  }

  private toVideoEmbedUrl(url?: string | null): string | null {
    if (!url) {
      return null;
    }
    const trimmed = url.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.includes('<iframe')) {
      const match = trimmed.match(/src=["']([^"']+)["']/i);
      return match?.[1]?.trim() ?? null;
    }

    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.replace(/^www\./, '');

      if (host === 'youtu.be') {
        const id = parsed.pathname.replace('/', '');
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }

      if (host === 'youtube.com' || host === 'm.youtube.com') {
        const id = parsed.searchParams.get('v')
          || parsed.pathname.split('/').find((part) => part && part !== 'watch' && part !== 'embed' && part !== 'shorts')
          || '';
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }

      if (host === 'vimeo.com') {
        const id = parsed.pathname.split('/').filter(Boolean)[0];
        return id ? `https://player.vimeo.com/video/${id}` : null;
      }

      if (host === 'player.vimeo.com') {
        const id = parsed.pathname.split('/').filter(Boolean).pop();
        return id ? `https://player.vimeo.com/video/${id}` : null;
      }
    } catch {
      return null;
    }

    return null;
  }

  private parseHousePlans(text: string) {
    return this.splitLines(text)
      .map((line) => line.split('|').map((part) => part.trim()))
      .filter((parts) => parts[0])
      .map((parts) => ({
        name: parts[0] ?? '',
        ambientes: Number(parts[1] ?? 0),
        totalArea: parts[2] ?? '',
        coveredArea: parts[3] ?? '',
        image: parts[4] ?? ''
      }));
  }

  private parseLots(text: string) {
    const allowed = new Set(['Disponible', 'Reservado', 'Vendido']);
    return this.splitLines(text)
      .map((line) => line.split('|').map((part) => part.trim()))
      .filter((parts) => parts[0])
      .map((parts) => ({
        id: parts[0] ?? '',
        area: parts[1] ?? '',
        status: allowed.has(parts[2]) ? (parts[2] as 'Disponible' | 'Reservado' | 'Vendido') : 'Disponible'
      }));
  }

  private resolveYear(value: string, fallbackDate?: string | null): number | null {
    const trimmed = value?.trim();
    if (trimmed) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    if (fallbackDate) {
      const match = fallbackDate.match(/^(\d{4})/);
      if (match?.[1]) {
        const year = Number(match[1]);
        return Number.isFinite(year) ? year : null;
      }
    }

    return null;
  }

  private buildDetailsPayload(): AdminProjectDetails | null {
    const amenities = this.splitLines(this.detailsDraft.amenitiesText);
    const bannerImages = this.splitLines(this.detailsDraft.bannerImagesText);
    const gallery = this.splitLines(this.detailsDraft.galleryText);
    const enjoyAreas = this.splitLines(this.detailsDraft.enjoyAreasText);
    const houseModels = this.buildHouseModelsPayload();
    const housePlans = this.parseHousePlans(this.detailsDraft.housePlansText);
    const lots = this.parseLots(this.detailsDraft.lotsText);
    const mapUrl = this.extractIframeSrc(this.detailsDraft.mapUrl);
    const embedInput = this.extractIframeSrc(this.detailsDraft.mapEmbedUrl);
    const mapEmbedUrl = embedInput || this.buildEmbedUrlFromMapUrl(mapUrl);
    const publicScope = this.nullIfEmpty(this.detailsDraft.publicScope);
    const publicType = this.nullIfEmpty(this.detailsDraft.publicType);
    const publicClassification = this.nullIfEmpty(this.detailsDraft.publicClassification);
    const publicCategory =
      this.detailsDraft.publicScope === 'Edificaciones'
        ? this.nullIfEmpty(this.detailsDraft.publicCategory)
        : null;
    const startYear = this.resolveYear(this.detailsDraft.startYear, this.draft.startDate);
    const deliveryYear = this.resolveYear(this.detailsDraft.deliveryYear, this.draft.endDate);

    return {
      shortDesc: this.nullIfEmpty(this.detailsDraft.shortDesc),
      location: this.nullIfEmpty(this.detailsDraft.location),
      promoter: this.nullIfEmpty(this.detailsDraft.promoter),
      publicScope,
      publicStatus: publicScope,
      publicType,
      publicClassification,
      publicCategory,
      landArea: this.nullIfEmpty(this.detailsDraft.landArea),
      units: this.detailsDraft.units ? Number(this.detailsDraft.units) : null,
      amenities,
      startYear,
      deliveryYear,
      autocadUrl: this.nullIfEmpty(this.detailsDraft.autocadUrl),
      mapUrl: this.nullIfEmpty(mapUrl),
      mapEmbedUrl: this.nullIfEmpty(mapEmbedUrl),
      masterplanImage: this.nullIfEmpty(this.detailsDraft.masterplanImage),
      bannerImages,
      gallery,
      enjoyAreas,
      houseModels,
      housePlans,
      lots
    };
  }

  syncMapEmbedUrl() {
    const mapUrl = this.extractIframeSrc(this.detailsDraft.mapUrl);
    const embed = this.buildEmbedUrlFromMapUrl(mapUrl);
    if (embed) {
      this.detailsDraft.mapEmbedUrl = embed;
    }
  }

  private buildEmbedUrlFromMapUrl(mapUrl?: string | null): string {
    if (!mapUrl) {
      return '';
    }

    const trimmed = mapUrl.trim();
    if (!trimmed) {
      return '';
    }

    if (trimmed.toLowerCase().includes('<iframe')) {
      const match = trimmed.match(/src=["']([^"']+)["']/i);
      if (match?.[1]) {
        mapUrl = match[1].trim();
      }
    }

    try {
      const url = new URL(mapUrl);
      if (url.hostname.includes('google.com') && url.pathname.includes('/maps/embed')) {
        return url.toString();
      }
      if (url.hostname.includes('google.com')) {
        const placeMatch = url.pathname.match(/\/place\/([^/]+)/i);
        if (placeMatch?.[1]) {
          return `https://www.google.com/maps?q=${encodeURIComponent(
            decodeURIComponent(placeMatch[1])
          )}&output=embed`;
        }

        const query = url.searchParams.get('q');
        if (query) {
          return `https://www.google.com/maps?q=${encodeURIComponent(
            query
          )}&output=embed`;
        }
      }

      if (url.hostname.includes('maps.app.goo.gl') || url.hostname.includes('goo.gl')) {
        return `https://www.google.com/maps?q=${encodeURIComponent(
          mapUrl
        )}&output=embed`;
      }
    } catch {
      return '';
    }

    return '';
  }

  private showToast(message: string) {
    this.successMessage = message;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => {
      this.successMessage = '';
      this.toastTimer = null;
      this.cdr.detectChanges();
    }, 3000);
    this.cdr.detectChanges();
  }

  private applyDetailsToDraft(details?: AdminProjectDetails | null) {
    this.detailsDraft = {
      shortDesc: details?.shortDesc ?? '',
      location: details?.location ?? '',
      promoter: details?.promoter ?? '',
      publicScope: details?.publicScope ?? details?.publicStatus ?? '',
      publicType: details?.publicType ?? '',
      publicClassification: details?.publicClassification ?? '',
      publicCategory: details?.publicCategory ?? '',
      landArea: details?.landArea ?? '',
      units: details?.units !== undefined && details?.units !== null ? String(details.units) : '',
      amenitiesText: this.joinLines(details?.amenities),
      startYear: details?.startYear !== undefined && details?.startYear !== null ? String(details.startYear) : '',
      deliveryYear: details?.deliveryYear !== undefined && details?.deliveryYear !== null ? String(details.deliveryYear) : '',
      autocadUrl: details?.autocadUrl ?? '',
      mapUrl: details?.mapUrl ?? '',
      mapEmbedUrl: details?.mapEmbedUrl ?? '',
      masterplanImage: details?.masterplanImage ?? '',
      bannerImagesText: this.joinLines(details?.bannerImages),
      galleryText: this.joinLines(details?.gallery),
      enjoyAreasText: this.joinLines(details?.enjoyAreas),
      housePlansText: details?.housePlans?.length
        ? details.housePlans
            .map((p) => `${p.name} | ${p.ambientes} | ${p.totalArea} | ${p.coveredArea} | ${p.image}`)
            .join('\n')
        : '',
      lotsText: details?.lots?.length
        ? details.lots.map((l) => `${l.id} | ${l.area} | ${l.status}`).join('\n')
        : ''
    };
    this.houseModels = this.normalizeHouseModels(details?.houseModels);
    this.activeHouseModelIndex = 0;
    this.activeHouseImageIndex = 0;
  }
}
