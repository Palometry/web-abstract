import { ChangeDetectorRef, Component, DestroyRef, HostListener, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AdminDataService,
  AdminProjectDetail,
  AdminProjectDetails,
  AdminProjectImage,
  AdminProjectVideo
} from '../../services/admin-data';
import {
  DEFAULT_PROJECT_CATALOG,
  ProjectCatalog,
  formatCompactProjectLabel,
  formatCompactProjectTypeLabel,
  formatProjectLabel,
  formatProjectTypeLabel,
  isHospedajeType
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

type PendingLocalFile = {
  file: File;
  name: string;
  previewUrl: string;
};

@Component({
  selector: 'app-admin-project-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-project-create.component.html',
  styleUrls: ['./admin-project-create.component.scss']
})
export class AdminProjectCreateComponent implements OnInit, OnDestroy {
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
  private pendingBrochureFile: File | null = null;
  private pendingHeroVideoFile: PendingLocalFile | null = null;
  private pendingCoverFile: PendingLocalFile | null = null;
  private pendingCoverDeletion = false;
  private pendingSingleImages: Record<'masterplanImage', PendingLocalFile | null> = {
    masterplanImage: null
  };
  private pendingListImages: Record<'bannerImagesText' | 'galleryText', PendingLocalFile[]> = {
    bannerImagesText: [],
    galleryText: []
  };

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
    heroVideoUrl: '',
    brochurePdfUrl: '',
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
    isCover: true,
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

  private readonly destroyRef = inject(DestroyRef);
  private catalog: ProjectCatalog = DEFAULT_PROJECT_CATALOG;

  constructor(
    private route: ActivatedRoute,
    private data: AdminDataService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  async ngOnInit() {
    await this.loadCatalog();
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => void this.handleRouteChange(params.get('id')));
  }

  ngOnDestroy() {
    this.clearPendingLocalMediaState();
  }

  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!this.hasPendingLocalChanges) {
      return;
    }
    event.preventDefault();
    event.returnValue = '';
  }

  get isEditMode(): boolean {
    return this.projectId !== null;
  }

  get coverImage(): ProjectImageView | null {
    return this.images.find((image) => image.isCover) ?? this.images[0] ?? null;
  }

  get hasCoverImage(): boolean {
    return !!this.coverPreviewUrl;
  }

  get hasBrochurePdf(): boolean {
    return !!this.detailsDraft.brochurePdfUrl.trim();
  }

  get pendingBrochureName(): string {
    return this.pendingBrochureFile?.name ?? '';
  }

  get heroVideoPreviewUrl(): string {
    return this.pendingHeroVideoFile?.previewUrl ?? this.detailsDraft.heroVideoUrl.trim();
  }

  get pendingHeroVideoName(): string {
    return this.pendingHeroVideoFile?.name ?? '';
  }

  get hasHeroVideo(): boolean {
    return !!this.heroVideoPreviewUrl;
  }

  get coverPreviewUrl(): string {
    return this.pendingCoverFile?.previewUrl ?? this.imageDraft.fileUrl.trim();
  }

  get pendingCoverName(): string {
    return this.pendingCoverFile?.name ?? '';
  }

  get hasPendingLocalChanges(): boolean {
    const currentCoverUrl = this.coverImage?.fileUrl?.trim() ?? '';
    const draftCoverUrl = this.imageDraft.fileUrl.trim();

    return !!(
      this.pendingBrochureFile
      || this.pendingHeroVideoFile
      || this.pendingCoverFile
      || this.pendingCoverDeletion
      || this.pendingSingleImages.masterplanImage
      || this.pendingListImages.bannerImagesText.length
      || this.pendingListImages.galleryText.length
      || draftCoverUrl !== currentCoverUrl
    );
  }

  private async loadCatalog() {
    const catalog = await this.data.getProjectCatalog();
    if (catalog) {
      this.catalog = catalog;
    }
  }

  private async handleRouteChange(rawProjectId: string | null) {
    if (!rawProjectId) {
      this.resetProjectState();
      this.cdr.detectChanges();
      return;
    }

    const projectId = Number(rawProjectId);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      this.resetProjectState();
      this.error = 'Proyecto invalido.';
      this.cdr.detectChanges();
      return;
    }

    this.projectId = projectId;
    await this.loadProject(projectId);
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
    if (isHospedajeType(this.detailsDraft.publicType)) {
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
    if (isHospedajeType(this.detailsDraft.publicType)) {
      return 'Categoría (estrellas)';
    }
    return 'Categoría';
  }

  formatTypeLabel(label: string): string {
    return formatCompactProjectTypeLabel(label);
  }

  formatClassificationLabel(label: string): string {
    return formatCompactProjectLabel(label);
  }

  formatCategoryOptionLabel(label: string): string {
    return formatCompactProjectLabel(label);
  }

  getFullTypeLabel(label: string): string {
    return formatProjectTypeLabel(label);
  }

  getFullClassificationLabel(label: string): string {
    return formatProjectLabel(label);
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
      const brochureReady = await this.preparePendingBrochureUpload();
      if (!brochureReady) {
        return;
      }
      const heroVideoReady = await this.preparePendingHeroVideoUpload();
      if (!heroVideoReady) {
        return;
      }
      const detailImagesReady = await this.preparePendingDetailImageUploads();
      if (!detailImagesReady) {
        return;
      }
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
      const coverReady = await this.commitCoverImageChange(result.id);
      if (!coverReady) {
        return;
      }
      await this.loadProject(result.id);
      this.showToast('Proyecto creado.');
    } finally {
      queueMicrotask(() => {
        this.saving = false;
        this.cdr.detectChanges();
      });
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
      const brochureReady = await this.preparePendingBrochureUpload();
      if (!brochureReady) {
        return;
      }
      const heroVideoReady = await this.preparePendingHeroVideoUpload();
      if (!heroVideoReady) {
        return;
      }
      const detailImagesReady = await this.preparePendingDetailImageUploads();
      if (!detailImagesReady) {
        return;
      }
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
      const coverReady = await this.commitCoverImageChange(this.projectId);
      if (!coverReady) {
        return;
      }
      await this.loadProject(this.projectId);
      this.showToast('Proyecto actualizado.');
    } finally {
      queueMicrotask(() => {
        this.saving = false;
        this.cdr.detectChanges();
      });
    }
  }

  private async loadProject(projectId: number) {
    this.loading = true;
    this.error = '';
    try {
      const project = await this.data.getProjectDetail(projectId);
      if (!project) {
        this.error = 'No se encontro el proyecto.';
        this.resetProjectState(projectId);
        return;
      }
      this.projectId = project.id;
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
      this.syncCoverDraft();
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
    } catch {
      this.error = 'No se pudo cargar el proyecto.';
      this.resetProjectState(projectId);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private resetProjectState(projectId: number | null = null) {
    this.projectId = projectId;
    this.project = null;
    this.images = [];
    this.videos = [];
    this.clearPendingLocalMediaState();
    this.pendingBrochureFile = null;
    this.pendingCoverDeletion = false;
    this.imageDraft = { fileUrl: '', isCover: true, sortOrder: 0 };
    this.videoDraft = { fileUrl: '', title: '', description: '', sortOrder: 0 };
    this.draft = {
      name: '',
      clientName: '',
      address: '',
      description: '',
      status: 'draft',
      startDate: '',
      endDate: ''
    };
    this.applyDetailsToDraft(null);
  }

  private syncCoverDraft() {
    const cover = this.coverImage;
    this.pendingCoverDeletion = false;
    this.imageDraft = cover
      ? {
          fileUrl: this.normalizeSecureUrl(cover.fileUrl),
          isCover: true,
          sortOrder: 0
        }
      : {
          fileUrl: '',
          isCover: true,
          sortOrder: 0
        };
  }

  async saveCoverImage() {
    this.showToast('La portada se guardará cuando guardes el proyecto.');
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
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      if (input) {
        input.value = '';
      }
      return;
    }
    this.ngZone.run(() => {
      this.replacePendingCoverFile(file);
      this.pendingCoverDeletion = false;
      if (input) {
        input.value = '';
      }
      this.showToast('Portada seleccionada. Se guardará cuando guardes el proyecto.');
      this.cdr.detectChanges();
    });
  }

  async uploadBrochurePdf(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.ngZone.run(() => {
      this.pendingBrochureFile = file;
      this.error = '';
      if (input) {
        input.value = '';
      }
      this.showToast('PDF seleccionado. Guarda el proyecto para aplicar el cambio.');
      this.cdr.detectChanges();
    });
  }

  async uploadHeroVideo(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.ngZone.run(() => {
      this.replacePendingHeroVideoFile(file);
      this.error = '';
      if (input) {
        input.value = '';
      }
      this.showToast('Video del banner seleccionado. Se guardará cuando guardes el proyecto.');
      this.cdr.detectChanges();
    });
  }

  async removeBrochurePdf() {
    if (!this.hasBrochurePdf && !this.pendingBrochureFile) {
      return;
    }
    this.pendingBrochureFile = null;
    this.detailsDraft.brochurePdfUrl = '';
    this.cdr.detectChanges();
  }

  removeHeroVideo() {
    if (this.pendingHeroVideoFile) {
      this.revokePendingFile(this.pendingHeroVideoFile);
      this.pendingHeroVideoFile = null;
    }
    this.detailsDraft.heroVideoUrl = '';
    this.cdr.detectChanges();
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

  async deleteCoverImage() {
    if (!this.projectId) {
      return;
    }
    this.error = '';
    const cover = this.coverImage;
    if (!cover) {
      return;
    }
    const confirmed = confirm('Eliminar la imagen de portada?');
    if (!confirmed) {
      return;
    }
    const ok = await this.data.deleteProjectImage(this.projectId, cover.id);
    if (!ok) {
      this.error = 'No se pudo eliminar la imagen de portada.';
      return;
    }
    await this.loadProject(this.projectId);
    this.showToast('Imagen de portada eliminada.');
  }

  async removeCoverImage() {
    if (this.pendingCoverFile) {
      this.revokePendingFile(this.pendingCoverFile);
      this.pendingCoverFile = null;
      this.cdr.detectChanges();
      return;
    }

    const draftUrl = this.imageDraft.fileUrl.trim();
    if (!draftUrl) {
      return;
    }

    const cover = this.coverImage;
    if (cover && cover.fileUrl.trim() === draftUrl) {
      this.pendingCoverDeletion = true;
    }

    this.imageDraft.fileUrl = '';
    this.cdr.detectChanges();
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
    this.ngZone.run(() => {
      if (file && field === 'masterplanImage') {
        this.replacePendingSingleImage(field, file);
      }
      if (input) {
        input.value = '';
      }
      if (file) {
        this.showToast('Imagen seleccionada. Se guardará cuando guardes el proyecto.');
      }
      this.cdr.detectChanges();
    });
    if (!file) {
      return;
    }
  }

  clearDetailImage(field: keyof typeof this.detailsDraft) {
    if (field === 'masterplanImage' && this.pendingSingleImages.masterplanImage) {
      this.revokePendingFile(this.pendingSingleImages.masterplanImage);
      this.pendingSingleImages.masterplanImage = null;
      this.cdr.detectChanges();
      return;
    }
    this.detailsDraft[field] = '' as any;
  }

  async appendDetailImage(event: Event, field: keyof typeof this.detailsDraft) {
    const input = event.target as HTMLInputElement | null;
    const files = Array.from(input?.files ?? []);
    if (!files.length) {
      if (input) {
        input.value = '';
      }
      return;
    }
    this.ngZone.run(() => {
      if (field === 'bannerImagesText' || field === 'galleryText') {
        this.pendingListImages[field].push(...files.map((file) => this.createPendingLocalFile(file)));
      }
      if (input) {
        input.value = '';
      }
      this.showToast('Imágenes seleccionadas. Se guardarán cuando guardes el proyecto.');
      this.cdr.detectChanges();
    });
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

  removePendingDetailListImage(field: 'bannerImagesText' | 'galleryText', index: number) {
    const pending = this.pendingListImages[field];
    if (index < 0 || index >= pending.length) {
      return;
    }
    this.revokePendingFile(pending[index]);
    pending.splice(index, 1);
    this.cdr.detectChanges();
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
    const selected = await this.uploadSelectedFiles(input?.files ?? null, 'No se pudo subir la imagen.');
    const fileUrl = selected.urls[0];
    if (!fileUrl) {
      if (input) {
        input.value = '';
      }
      return;
    }
    this.ngZone.run(() => {
      const line = `Tipo | 0 | Area total | Area techada | ${fileUrl}`;
      this.detailsDraft.housePlansText = this.detailsDraft.housePlansText
        ? `${this.detailsDraft.housePlansText}\n${line}`
        : line;
      if (input) {
        input.value = '';
      }
      this.cdr.detectChanges();
    });
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
    const selected = await this.uploadSelectedFiles(input?.files ?? null, 'No se pudo subir la imagen.');
    if (!selected.urls.length) {
      if (input) {
        input.value = '';
      }
      return;
    }
    this.ngZone.run(() => {
      model.images.push(...selected.urls);
      this.activeHouseImageIndex = 0;
      if (input) {
        input.value = '';
      }
      this.cdr.detectChanges();
    });
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
        images: images.filter(Boolean).map((image) => this.normalizeSecureUrl(image)),
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

  getPendingSingleImagePreview(field: 'masterplanImage'): string | null {
    return this.pendingSingleImages[field]?.previewUrl ?? null;
  }

  getPendingListImagePreviews(field: 'bannerImagesText' | 'galleryText'): string[] {
    return this.pendingListImages[field].map((entry) => entry.previewUrl);
  }

  private joinLines(values?: string[] | null): string {
    return values?.length ? values.join('\n') : '';
  }

  private nullIfEmpty(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeSecureUrl(value?: string | null): string {
    const trimmed = value?.trim() ?? '';
    if (!trimmed || typeof window === 'undefined' || window.location.protocol !== 'https:') {
      return trimmed;
    }

    try {
      const url = new URL(trimmed, window.location.origin);
      if (url.protocol === 'http:') {
        url.protocol = 'https:';
      }
      return url.toString();
    } catch {
      return trimmed;
    }
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
      location: this.nullIfEmpty(this.draft.address),
      promoter: this.nullIfEmpty(this.draft.clientName),
      publicScope,
      publicStatus: publicScope,
      publicType,
      publicClassification,
      publicCategory,
      landArea: this.nullIfEmpty(this.detailsDraft.landArea),
      units:
        String(this.detailsDraft.units ?? '').trim() !== ''
          ? Number(this.detailsDraft.units)
          : null,
      amenities,
      startYear,
      deliveryYear,
      autocadUrl: this.nullIfEmpty(this.detailsDraft.autocadUrl),
      heroVideoUrl: this.nullIfEmpty(this.detailsDraft.heroVideoUrl),
      brochurePdfUrl: this.nullIfEmpty(this.detailsDraft.brochurePdfUrl),
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

  canDeactivate(): boolean {
    if (!this.hasPendingLocalChanges) {
      return true;
    }
    return confirm('Tienes archivos pendientes sin guardar. Si sales ahora, se perderán.');
  }

  private createPendingLocalFile(file: File): PendingLocalFile {
    return {
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file)
    };
  }

  private revokePendingFile(entry: PendingLocalFile | null) {
    if (entry?.previewUrl) {
      URL.revokeObjectURL(entry.previewUrl);
    }
  }

  private replacePendingCoverFile(file: File) {
    this.revokePendingFile(this.pendingCoverFile);
    this.pendingCoverFile = this.createPendingLocalFile(file);
  }

  private replacePendingSingleImage(field: 'masterplanImage', file: File) {
    this.revokePendingFile(this.pendingSingleImages[field]);
    this.pendingSingleImages[field] = this.createPendingLocalFile(file);
  }

  private clearPendingLocalMediaState() {
    this.revokePendingFile(this.pendingHeroVideoFile);
    this.pendingHeroVideoFile = null;
    this.revokePendingFile(this.pendingCoverFile);
    this.pendingCoverFile = null;
    this.pendingCoverDeletion = false;
    this.revokePendingFile(this.pendingSingleImages.masterplanImage);
    this.pendingSingleImages.masterplanImage = null;

    for (const field of ['bannerImagesText', 'galleryText'] as const) {
      for (const entry of this.pendingListImages[field]) {
        this.revokePendingFile(entry);
      }
      this.pendingListImages[field] = [];
    }
  }

  private replacePendingHeroVideoFile(file: File) {
    this.revokePendingFile(this.pendingHeroVideoFile);
    this.pendingHeroVideoFile = this.createPendingLocalFile(file);
  }

  private async uploadSelectedFiles(
    files: FileList | null,
    fallbackError: string
  ): Promise<{ urls: string[]; error?: string }> {
    const selectedFiles = Array.from(files ?? []);
    if (!selectedFiles.length) {
      return { urls: [] };
    }

    this.ngZone.run(() => {
      this.uploading = true;
      this.error = '';
      this.cdr.detectChanges();
    });

    const uploadedUrls: string[] = [];
    let errorMessage = '';

    for (const file of selectedFiles) {
      const result = await this.data.uploadMedia(file, { title: file.name });
      if (!result.ok || !result.fileUrl) {
        errorMessage = uploadedUrls.length
          ? 'Algunos archivos no se pudieron subir.'
          : (result.error ?? fallbackError);
        break;
      }
      uploadedUrls.push(result.fileUrl);
    }

    this.ngZone.run(() => {
      this.uploading = false;
      if (errorMessage) {
        this.error = errorMessage;
      }
      this.cdr.detectChanges();
    });

    return errorMessage ? { urls: uploadedUrls, error: errorMessage } : { urls: uploadedUrls };
  }

  private async preparePendingBrochureUpload(): Promise<boolean> {
    if (!this.pendingBrochureFile) {
      return true;
    }

    this.uploading = true;
    this.error = '';
    this.cdr.detectChanges();

    const file = this.pendingBrochureFile;
    const result = await this.data.uploadMedia(file, { title: file.name });

    this.ngZone.run(() => {
      this.uploading = false;
      if (!result.ok || !result.fileUrl) {
        this.error = result.error ?? 'No se pudo subir el brochure.';
        this.cdr.detectChanges();
        return;
      }

      this.detailsDraft.brochurePdfUrl = result.fileUrl;
      this.pendingBrochureFile = null;
      this.cdr.detectChanges();
    });

    return !!result.ok && !!result.fileUrl;
  }

  private async preparePendingHeroVideoUpload(): Promise<boolean> {
    if (!this.pendingHeroVideoFile) {
      return true;
    }

    this.uploading = true;
    this.error = '';
    this.cdr.detectChanges();

    const file = this.pendingHeroVideoFile.file;
    const result = await this.data.uploadMedia(file, { title: this.pendingHeroVideoFile.name });

    this.ngZone.run(() => {
      this.uploading = false;
      if (!result.ok || !result.fileUrl) {
        this.error = result.error ?? 'No se pudo subir el video del banner.';
        this.cdr.detectChanges();
        return;
      }

      this.detailsDraft.heroVideoUrl = result.fileUrl;
      this.revokePendingFile(this.pendingHeroVideoFile);
      this.pendingHeroVideoFile = null;
      this.cdr.detectChanges();
    });

    return !!result.ok && !!result.fileUrl;
  }

  private async preparePendingDetailImageUploads(): Promise<boolean> {
    const masterplan = this.pendingSingleImages.masterplanImage;
    if (masterplan) {
      const result = await this.data.uploadMedia(masterplan.file, { title: masterplan.name });
      if (!result.ok || !result.fileUrl) {
        this.error = result.error ?? 'No se pudo subir la imagen.';
        this.cdr.detectChanges();
        return false;
      }
      this.detailsDraft.masterplanImage = result.fileUrl;
      this.revokePendingFile(masterplan);
      this.pendingSingleImages.masterplanImage = null;
    }

    for (const field of ['bannerImagesText', 'galleryText'] as const) {
      if (!this.pendingListImages[field].length) {
        continue;
      }

      const current = (this.detailsDraft[field] as unknown as string) || '';
      const currentLines = this.splitLines(current);
      const uploadedUrls: string[] = [];

      while (this.pendingListImages[field].length) {
        const entry = this.pendingListImages[field][0];
        const result = await this.data.uploadMedia(entry.file, { title: entry.name });
        if (!result.ok || !result.fileUrl) {
          this.detailsDraft[field] = [...currentLines, ...uploadedUrls].join('\n') as any;
          this.error = result.error ?? 'No se pudo subir la imagen.';
          this.cdr.detectChanges();
          return false;
        }

        uploadedUrls.push(result.fileUrl);
        this.revokePendingFile(entry);
        this.pendingListImages[field].shift();
      }

      this.detailsDraft[field] = [...currentLines, ...uploadedUrls].join('\n') as any;
    }

    this.cdr.detectChanges();
    return true;
  }

  private async commitCoverImageChange(projectId: number): Promise<boolean> {
    if (this.pendingCoverFile) {
      const result = await this.data.uploadMedia(this.pendingCoverFile.file, {
        title: this.pendingCoverFile.name
      });
      if (!result.ok || !result.fileUrl) {
        this.error = result.error ?? 'No se pudo subir la imagen de portada.';
        this.cdr.detectChanges();
        return false;
      }
      this.imageDraft.fileUrl = result.fileUrl;
      this.revokePendingFile(this.pendingCoverFile);
      this.pendingCoverFile = null;
    }

    const currentCover = this.coverImage;
    const fileUrl = this.imageDraft.fileUrl.trim();

    if (!fileUrl) {
      if (currentCover && this.pendingCoverDeletion) {
        const ok = await this.data.deleteProjectImage(projectId, currentCover.id);
        if (!ok) {
          this.error = 'No se pudo eliminar la imagen de portada.';
          return false;
        }
      }
      this.pendingCoverDeletion = false;
      return true;
    }

    if (currentCover && currentCover.fileUrl.trim() === fileUrl && !this.pendingCoverDeletion) {
      return true;
    }

    const result = currentCover
      ? await this.data.updateProjectImage(projectId, currentCover.id, {
          fileUrl,
          isCover: true,
          sortOrder: 0
        })
      : await this.data.createProjectImage(projectId, {
          fileUrl,
          isCover: true,
          sortOrder: 0
        });

    if (!result.ok) {
      this.error = result.error ?? 'No se pudo guardar la imagen de portada.';
      return false;
    }

    this.pendingCoverDeletion = false;
    return true;
  }

  private applyDetailsToDraft(details?: AdminProjectDetails | null) {
    this.clearPendingLocalMediaState();
    this.pendingBrochureFile = null;
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
      autocadUrl: this.normalizeSecureUrl(details?.autocadUrl ?? ''),
      heroVideoUrl: this.normalizeSecureUrl(details?.heroVideoUrl ?? ''),
      brochurePdfUrl: this.normalizeSecureUrl(details?.brochurePdfUrl ?? ''),
      mapUrl: details?.mapUrl ?? '',
      mapEmbedUrl: details?.mapEmbedUrl ?? '',
      masterplanImage: this.normalizeSecureUrl(details?.masterplanImage ?? ''),
      bannerImagesText: this.joinLines((details?.bannerImages ?? []).map((image) => this.normalizeSecureUrl(image))),
      galleryText: this.joinLines((details?.gallery ?? []).map((image) => this.normalizeSecureUrl(image))),
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
