import { AfterViewInit, ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AdminDataService,
  AdminProjectDetail,
  AdminProjectDetails,
  AdminProjectImage
} from '../../services/admin-data';
import {
  EDIFICACIONES_DATA,
  HABILITACIONES_DATA,
  PUBLIC_SCOPE_OPTIONS
} from '../project-classifications';

type ProjectImageView = AdminProjectImage & {
  draft: {
    fileUrl: string;
    title: string;
    altText: string;
    isCover: boolean;
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
  selector: 'app-admin-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-project-detail.component.html',
  styleUrls: ['./admin-project-detail.component.scss']
})
export class AdminProjectDetailComponent implements OnInit, AfterViewInit {
  project: AdminProjectDetail | null = null;
  images: ProjectImageView[] = [];
  loading = false;
  saving = false;
  uploading = false;
  imageUploadStates: Record<number, boolean> = {};
  error = '';
  successMessage = '';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private loaded = false;
  private readonly isBrowser: boolean;

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

  houseModels: HouseModelDraft[] = [];
  activeHouseModelIndex = 0;
  activeHouseImageIndex = 0;

  portfolioDraft = {
    enabled: false,
    titleOverride: '',
    sortOrder: 0,
    isVisible: true
  };

  publicScopeOptions = PUBLIC_SCOPE_OPTIONS;
  private readonly edificacionesData = EDIFICACIONES_DATA;
  private readonly habilitacionesData = HABILITACIONES_DATA;

  constructor(
    private route: ActivatedRoute,
    private data: AdminDataService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get publicTypeOptions(): string[] {
    const scope = this.detailsDraft.publicScope;
    if (scope === 'Edificaciones') {
      return Object.keys(this.edificacionesData);
    }
    if (scope === 'Habilitaciones') {
      return Object.keys(this.habilitacionesData);
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
      const typeData = this.edificacionesData[type];
      return typeData ? Object.keys(typeData) : [];
    }
    if (scope === 'Habilitaciones') {
      return this.habilitacionesData[type] ?? [];
    }
    return [];
  }

  get publicCategoryOptions(): string[] {
    if (this.detailsDraft.publicScope !== 'Edificaciones') {
      return [];
    }
    const typeData = this.edificacionesData[this.detailsDraft.publicType];
    if (!typeData) {
      return [];
    }
    return typeData[this.detailsDraft.publicClassification] ?? [];
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

  ngOnInit() {
    this.tryLoad();
  }

  ngAfterViewInit() {
    this.tryLoad();
  }

  private async tryLoad() {
    if (!this.isBrowser || this.loaded) {
      return;
    }
    this.loaded = true;
    await this.loadProject();
    this.cdr.detectChanges();
  }

  async loadProject() {
    const projectId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(projectId)) {
      this.error = 'Proyecto invalido.';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      const project = await this.data.getProjectDetail(projectId);
      if (!project) {
        this.error = 'No se encontro el proyecto.';
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
      this.portfolioDraft = {
        enabled: !!project.portfolioEntry,
        titleOverride: project.portfolioEntry?.titleOverride ?? '',
        sortOrder: project.portfolioEntry?.sortOrder ?? 0,
        isVisible: project.portfolioEntry?.isVisible ?? true
      };
    } catch {
      this.error = 'No se pudo cargar el proyecto.';
    } finally {
      this.loading = false;
    }
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
    try {
      const result = await this.data.updateProject(this.project.id, {
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
      await this.loadProject();
      this.showToast('Proyecto actualizado.');
    } finally {
      this.saving = false;
    }
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

  async uploadImageDraft(event: Event) {
    if (!this.project) {
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

  async uploadImageForExisting(image: ProjectImageView, event: Event) {
    if (!this.project) {
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
      this.showToast('Portafolio actualizado.');
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
    this.showToast('Portafolio actualizado.');
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
      startYear: this.detailsDraft.startYear ? Number(this.detailsDraft.startYear) : null,
      deliveryYear: this.detailsDraft.deliveryYear ? Number(this.detailsDraft.deliveryYear) : null,
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
}
