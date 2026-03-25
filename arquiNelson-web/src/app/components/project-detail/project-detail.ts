import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PublicProjectsService, PublicProject } from '../../services/public-projects';
import { ProjectService, ProjectData } from '../../services/project';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  formatProjectLabel,
  formatProjectTypeLabel
} from '../../admin/project-classifications';

type HousePlan = {
  name: string;
  ambientes: number;
  totalArea: string;
  coveredArea: string;
  image: string;
};

type HouseModelView = {
  name: string;
  description: string;
  rooms: number | null;
  features: string[];
  images: string[];
};

type DearFlipWindow = Window & Record<string, unknown>;

@Component({
  selector: 'app-project-detail',
  imports: [CommonModule],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.scss',
  host: {
    ngSkipHydration: 'true',
  }
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  readonly fallbackImage = '/LOGO.jpg';
  readonly defaultBrochurePdfUrl = '/flipbook/Popeye.pdf';
  project: PublicProject | ProjectData | undefined;
  bannerImages: string[] = [];
  currentBannerIndex = 0;
  pendingBannerIndex: number | null = null;
  bannerDirection: 'next' | 'prev' = 'next';
  bannerAnimating = false;
  bannerAnimationVariant = false;
  housePlans: HousePlan[] = [];
  filteredPlans: HousePlan[] = [];
  planOptions: number[] = [];
  selectedAmbientes = 0;
  currentPlanIndex = 0;
  houseModels: HouseModelView[] = [];
  activeHouseModelIndex = 0;
  activeHouseImageIndex = 0;
  mapEmbedSafeUrl: SafeResourceUrl | null = null;
  autocadEmbedSafeUrl: SafeResourceUrl | null = null;
  fichaExpanded = false;
  flipbookLoading = false;
  flipbookError = '';
  flipbookMounted = false;
  dearFlipBookId = '';
  private sub?: Subscription;
  private bannerTimer?: ReturnType<typeof setInterval>;
  private bannerAnimationTimer?: ReturnType<typeof setTimeout>;
  private flipbookInitTimer?: ReturnType<typeof setTimeout>;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly brochureByProject = new Map<string, { pdf: string }>([
    ['FUNDO BELLACA', { pdf: this.defaultBrochurePdfUrl }],
    ['fundo-bellaca', { pdf: this.defaultBrochurePdfUrl }],
  ]);
  private flipbookRenderToken = 0;
  private activeDearFlipBookId = '';

  constructor(
    private route: ActivatedRoute,
    private projectService: PublicProjectsService,
    private legacyProjectService: ProjectService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit() {
    this.sub = this.route.paramMap.subscribe(async (params) => {
      this.destroyFlipbook();
      const rawId = params.get('id');
      this.project = undefined;
      if (rawId) {
        const id = Number(rawId);
        if (Number.isFinite(id)) {
          const project = await this.projectService.getProjectById(id);
          if (project) {
            if (!project.image) {
              project.image = this.fallbackImage;
            }
            if (!project.thumbImage) {
              project.thumbImage = project.image || this.fallbackImage;
            }
          }
          this.project = project ?? undefined;
        } else {
          const legacy = this.legacyProjectService.getProjectById(rawId) ?? undefined;
          if (legacy) {
            legacy.image = legacy.image || this.fallbackImage;
            legacy.thumbImage = legacy.thumbImage || legacy.image || this.fallbackImage;
          }
          this.project = legacy;
        }
      }
      this.setupBanner();
      this.setupHousePlans();
      this.setupHouseModels();
      this.setupAutocad();
      this.setupMap();
      this.cdr.detectChanges();
      this.deferFlipbookInit();
    });
  }

  get currentBannerImage(): string | null {
    return this.bannerImages.length ? this.bannerImages[this.currentBannerIndex] : null;
  }

  get pendingBannerImage(): string | null {
    if (this.pendingBannerIndex === null || !this.bannerImages.length) {
      return null;
    }
    return this.bannerImages[this.pendingBannerIndex] ?? null;
  }

  get brochurePdfUrl(): string | null {
    if (!this.project) {
      return null;
    }
    const direct = this.project.brochurePdfUrl?.trim();
    if (direct) {
      return direct;
    }
    return this.getBrochureOverride()?.pdf ?? null;
  }

  get hasFlipbook(): boolean {
    return !!this.brochurePdfUrl;
  }

  nextBanner() {
    if (!this.bannerImages.length) {
      return;
    }
    this.changeBanner((this.currentBannerIndex + 1) % this.bannerImages.length, 'next');
  }

  prevBanner() {
    if (!this.bannerImages.length) {
      return;
    }
    this.changeBanner(
      (this.currentBannerIndex - 1 + this.bannerImages.length) % this.bannerImages.length,
      'prev'
    );
  }

  reloadFlipbook() {
    if (!this.hasFlipbook) {
      return;
    }
    this.deferFlipbookInit();
  }

  goToBanner(index: number) {
    if (index >= 0 && index < this.bannerImages.length) {
      const direction = index >= this.currentBannerIndex ? 'next' : 'prev';
      this.changeBanner(index, direction);
    }
  }

  get activeHouseModel(): HouseModelView | null {
    if (!this.houseModels.length) {
      return null;
    }
    return this.houseModels[this.activeHouseModelIndex] ?? this.houseModels[0];
  }

  get activeHouseImage(): string | null {
    const model = this.activeHouseModel;
    if (!model) {
      return null;
    }
    if (!model.images.length) {
      return this.fallbackImage;
    }
    return model.images[this.activeHouseImageIndex] ?? model.images[0];
  }

  selectHouseModel(index: number) {
    if (index < 0 || index >= this.houseModels.length) {
      return;
    }
    this.activeHouseModelIndex = index;
    this.activeHouseImageIndex = 0;
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

  get currentPlan(): HousePlan | null {
    return this.filteredPlans.length ? this.filteredPlans[this.currentPlanIndex] : null;
  }

  nextPlan() {
    if (!this.filteredPlans.length) {
      return;
    }
    this.currentPlanIndex = (this.currentPlanIndex + 1) % this.filteredPlans.length;
  }

  prevPlan() {
    if (!this.filteredPlans.length) {
      return;
    }
    this.currentPlanIndex =
      (this.currentPlanIndex - 1 + this.filteredPlans.length) % this.filteredPlans.length;
  }

  goToPlan(index: number) {
    if (index >= 0 && index < this.filteredPlans.length) {
      this.currentPlanIndex = index;
    }
  }

  onAmbientesChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedAmbientes = Number(value);
    this.applyPlanFilter();
  }

  toggleFicha() {
    this.fichaExpanded = !this.fichaExpanded;
  }

  formatFichaLabel(value?: string | null): string {
    if (!value) {
      return '';
    }
    return formatProjectLabel(value);
  }

  formatFichaType(value?: string | null): string {
    if (!value) {
      return '';
    }
    return formatProjectTypeLabel(value);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.destroyFlipbook();
    if (this.flipbookInitTimer) {
      clearTimeout(this.flipbookInitTimer);
    }
    if (this.bannerTimer) {
      clearInterval(this.bannerTimer);
    }
    if (this.bannerAnimationTimer) {
      clearTimeout(this.bannerAnimationTimer);
    }
  }

  private setupBanner() {
    if (this.bannerTimer) {
      clearInterval(this.bannerTimer);
    }

    if (this.project) {
      const bannerImageSource =
        'bannerImages' in this.project && Array.isArray(this.project.bannerImages)
          ? this.project.bannerImages
          : [];
      const bannerImages = bannerImageSource.length ? bannerImageSource : [];
      const gallery = this.project.gallery?.length ? this.project.gallery : [];
      this.bannerImages = bannerImages.length
        ? bannerImages
        : gallery.length
          ? gallery
          : [this.project.image];
    } else {
      this.bannerImages = [];
    }

    this.currentBannerIndex = 0;
    this.pendingBannerIndex = null;
    this.bannerAnimating = false;
    if (this.bannerImages.length > 1) {
      this.bannerTimer = setInterval(() => this.nextBanner(), 6000);
    }
  }

  private deferFlipbookInit() {
    if (!this.isBrowser) {
      return;
    }
    this.destroyFlipbook(false);
    if (!this.hasFlipbook) {
      this.resetFlipbookState();
      return;
    }

    this.flipbookLoading = true;
    this.flipbookError = '';
    this.flipbookMounted = false;
    this.dearFlipBookId = '';
    const renderToken = ++this.flipbookRenderToken;

    this.cdr.detectChanges();

    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.ngZone.run(() => {
            if (renderToken !== this.flipbookRenderToken || !this.hasFlipbook) {
              return;
            }
            const bookId = this.buildDearFlipBookId(renderToken);
            this.dearFlipBookId = bookId;
            this.activeDearFlipBookId = bookId;
            this.configureDearFlipOptions(bookId);
            this.flipbookMounted = true;
            this.cdr.detectChanges();
            this.queueDearFlipInit(renderToken, bookId);
          });
        });
      });
    });
  }

  private queueDearFlipInit(renderToken: number, bookId: string, attempt = 0) {
    if (this.flipbookInitTimer) {
      clearTimeout(this.flipbookInitTimer);
    }

    this.flipbookInitTimer = setTimeout(() => {
      this.initializeDearFlip(renderToken, bookId, attempt);
    }, attempt === 0 ? 0 : 120);
  }

  private initializeDearFlip(renderToken: number, bookId: string, attempt = 0) {
    if (!this.isBrowser || renderToken !== this.flipbookRenderToken || !this.hasFlipbook) {
      return;
    }

    const bookElement = document.getElementById(bookId);
    const dflipWindow = this.getDearFlipWindow();
    const dflip = dflipWindow.DFLIP;

    if (!bookElement || !dflip?.parseBooks) {
      if (attempt < 20) {
        this.queueDearFlipInit(renderToken, bookId, attempt + 1);
        return;
      }
      this.failFlipbookLoad('No se pudo iniciar DearFlip.');
      return;
    }

    dflipWindow.dFlipLocation = '/dflip/';
    this.configureDearFlipDefaults(dflip);
    const wrapper = bookElement.closest('.dflip-books');
    wrapper?.removeAttribute('df-parsed');
    wrapper?.removeAttribute('parsed');
    bookElement.removeAttribute('df-parsed');
    bookElement.removeAttribute('parsed');
    dflip.parseBooks();

    this.waitForDearFlip(renderToken, bookId);
  }

  private waitForDearFlip(renderToken: number, bookId: string, attempt = 0) {
    if (!this.isBrowser || renderToken !== this.flipbookRenderToken) {
      return;
    }

    const bookElement = document.getElementById(bookId);
    const instance = this.getDearFlipInstance(bookId);
    const isReady = !!instance && !!bookElement?.querySelector('.df-container, .df-ui-wrapper, canvas');

    if (isReady) {
      this.flipbookLoading = false;
      this.flipbookError = '';
      this.cdr.detectChanges();
      return;
    }

    if (attempt >= 60) {
      this.failFlipbookLoad('No se pudo cargar el brochure interactivo.');
      return;
    }

    this.queueDearFlipWait(renderToken, bookId, attempt + 1);
  }

  private queueDearFlipWait(renderToken: number, bookId: string, attempt: number) {
    if (this.flipbookInitTimer) {
      clearTimeout(this.flipbookInitTimer);
    }

    this.flipbookInitTimer = setTimeout(() => {
      this.waitForDearFlip(renderToken, bookId, attempt);
    }, 160);
  }

  private configureDearFlipOptions(bookId: string) {
    const pdfUrl = this.brochurePdfUrl;
    if (!pdfUrl || !this.isBrowser) {
      return;
    }

    const dflipWindow = this.getDearFlipWindow();
    dflipWindow.dFlipLocation = '/dflip/';
    dflipWindow[`option_${bookId}`] = {
      source: pdfUrl,
      webgl: true,
      webglShadow: true,
      hard: 'none',
      height: this.getDearFlipHeight(),
      enableDownload: true,
      autoEnableOutline: false,
      autoEnableThumbnail: false,
      search: false,
      scrollWheel: false,
      openPage: 1,
      duration: 1220,
      stiffness: 1.45,
      pageMode: 2,
      singlePageMode: 2,
      backgroundColor: '#f3efe6',
      paddingTop: 18,
      paddingRight: 18,
      paddingBottom: 18,
      paddingLeft: 18,
    };
  }

  private configureDearFlipDefaults(dflip?: DearFlipGlobal) {
    if (!dflip?.defaults) {
      return;
    }

    dflip.defaults.mockupjsSrc = '/dflip/js/libs/mockup.min.js';
    dflip.defaults.threejsSrc = '/dflip/js/libs/three.min.js';
    dflip.defaults.pdfjsSrc = '/dflip/js/libs/pdf.min.js';
    dflip.defaults.pdfjsWorkerSrc = '/dflip/js/libs/pdf.worker.min.js';
    dflip.defaults.pdfjsCompatibilitySrc = '/dflip/js/libs/compatibility.js';
    dflip.defaults.soundFile = '/dflip/sound/turn2.mp3';
    dflip.defaults.imagesLocation = '/dflip/images';
    dflip.defaults.imageResourcesPath = '/dflip/images/pdfjs/';
    dflip.defaults.cMapUrl = '/dflip/js/libs/cmaps/';
  }

  private getDearFlipHeight() {
    const viewportHeight = this.isBrowser ? window.innerHeight : 900;
    const viewportWidth = this.isBrowser ? window.innerWidth : 1440;
    const compactHeight = viewportWidth <= 768 ? viewportHeight * 0.62 : viewportHeight * 0.76;
    return Math.max(440, Math.min(860, Math.round(compactHeight)));
  }

  private buildDearFlipBookId(renderToken: number) {
    const source = String(this.project?.id ?? this.project?.title ?? 'brochure')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `df-book-${source || 'project'}-${renderToken}`;
  }

  private getDearFlipInstance(bookId: string): DearFlipInstance | null {
    if (!this.isBrowser || !bookId) {
      return null;
    }

    const dflipWindow = this.getDearFlipWindow();
    const instance = dflipWindow[bookId];
    if (instance && typeof instance === 'object') {
      return instance as DearFlipInstance;
    }

    return null;
  }

  private failFlipbookLoad(message: string) {
    console.error('[ProjectDetail] No se pudo inicializar DearFlip.');
    this.flipbookLoading = false;
    this.flipbookError = message;
    this.cdr.detectChanges();
  }

  private destroyFlipbook(resetState = true) {
    if (this.flipbookInitTimer) {
      clearTimeout(this.flipbookInitTimer);
      this.flipbookInitTimer = undefined;
    }
    this.flipbookRenderToken += 1;
    const activeId = this.activeDearFlipBookId;
    const dflipWindow = this.isBrowser ? this.getDearFlipWindow() : null;
    const instance = activeId && dflipWindow ? this.getDearFlipInstance(activeId) : null;
    instance?.dispose?.();
    if (activeId && dflipWindow) {
      delete dflipWindow[activeId];
      delete dflipWindow[`option_${activeId}`];
    }
    this.activeDearFlipBookId = '';
    if (resetState) {
      this.resetFlipbookState();
    }
  }

  private getBrochureOverride() {
    if (!this.project) {
      return null;
    }
    const titleKey = this.project.title.trim().toUpperCase();
    const idKey = String(this.project.id).trim();
    return this.brochureByProject.get(titleKey)
      ?? this.brochureByProject.get(idKey)
      ?? null;
  }

  private resetFlipbookState() {
    this.flipbookLoading = false;
    this.flipbookError = '';
    this.flipbookMounted = false;
    this.dearFlipBookId = '';
  }

  private getDearFlipWindow(): DearFlipWindow {
    return window as unknown as DearFlipWindow;
  }

  private changeBanner(targetIndex: number, direction: 'next' | 'prev') {
    if (!this.bannerImages.length || targetIndex === this.currentBannerIndex) {
      return;
    }

    if (this.bannerAnimating && this.pendingBannerIndex !== null) {
      this.finishBannerAnimation(true);
    }

    if (this.bannerAnimationTimer) {
      clearTimeout(this.bannerAnimationTimer);
    }

    this.pendingBannerIndex = targetIndex;
    this.bannerDirection = direction;
    this.bannerAnimationVariant = !this.bannerAnimationVariant;
    this.bannerAnimating = true;

    this.bannerAnimationTimer = setTimeout(() => {
      this.finishBannerAnimation(true);
    }, 520);
  }

  private finishBannerAnimation(applyPending: boolean) {
    if (this.bannerAnimationTimer) {
      clearTimeout(this.bannerAnimationTimer);
      this.bannerAnimationTimer = undefined;
    }

    if (applyPending && this.pendingBannerIndex !== null) {
      this.currentBannerIndex = this.pendingBannerIndex;
    }

    this.pendingBannerIndex = null;
    this.bannerAnimating = false;
    this.cdr.detectChanges();
  }

  private setupHousePlans() {
    if (this.project?.housePlans?.length) {
      this.housePlans = [...this.project.housePlans];
      const unique = Array.from(new Set(this.housePlans.map((plan) => plan.ambientes)));
      this.planOptions = unique.sort((a, b) => a - b);
      this.selectedAmbientes = 0;
      this.applyPlanFilter();
      return;
    }

    this.housePlans = [];
    this.filteredPlans = [];
    this.planOptions = [];
    this.selectedAmbientes = 0;
    this.currentPlanIndex = 0;
  }

  private setupHouseModels() {
    this.houseModels = this.normalizeHouseModels(this.project?.houseModels);
    this.activeHouseModelIndex = 0;
    this.activeHouseImageIndex = 0;
  }

  private normalizeHouseModels(
    models?: PublicProject['houseModels'] | ProjectData['houseModels'] | null
  ): HouseModelView[] {
    if (!models?.length) {
      return [];
    }
    return models
      .map((model) => {
        const name = model.name?.trim() ?? '';
        if (!name) {
          return null;
        }
        const imageList = Array.isArray((model as any).images) ? (model as any).images : [];
        const images =
          imageList.length > 0
            ? imageList
            : model.image
              ? [model.image]
              : [];
        const roomsRaw = (model as any).rooms;
        const rooms =
          roomsRaw === undefined || roomsRaw === null || roomsRaw === ''
            ? null
            : Number(roomsRaw);
        return {
          name,
          description: model.description ?? '',
          rooms: Number.isFinite(rooms) ? rooms : null,
          features: Array.isArray((model as any).features) ? (model as any).features : [],
          images: images.filter(Boolean)
        };
      })
      .filter(Boolean) as HouseModelView[];
  }

  private applyPlanFilter() {
    if (!this.housePlans.length) {
      this.filteredPlans = [];
      this.currentPlanIndex = 0;
      return;
    }

    if (this.selectedAmbientes) {
      this.filteredPlans = this.housePlans.filter(
        (plan) => plan.ambientes === this.selectedAmbientes
      );
    } else {
      this.filteredPlans = [...this.housePlans];
    }

    this.currentPlanIndex = 0;
  }

  private setupMap() {
    if (!this.project) {
      this.mapEmbedSafeUrl = null;
      return;
    }

    const embedUrl =
      this.extractIframeSrc(this.project.mapEmbedUrl) ||
      this.buildEmbedUrlFromMapUrl(this.project.mapUrl);

    if (embedUrl) {
      this.mapEmbedSafeUrl =
        this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
      return;
    }

    this.mapEmbedSafeUrl = null;
  }

  private setupAutocad() {
    if (!this.project?.autocad360Url) {
      this.autocadEmbedSafeUrl = null;
      return;
    }

    const embedUrl = this.extractIframeSrc(this.project.autocad360Url);
    this.autocadEmbedSafeUrl = embedUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl)
      : null;
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

  private extractIframeSrc(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (!trimmed.toLowerCase().includes('<iframe')) {
      return trimmed;
    }
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match?.[1]?.trim() ?? null;
  }

  private buildEmbedUrlFromMapUrl(mapUrl?: string | null): string | null {
    if (!mapUrl) {
      return null;
    }

    const trimmed = mapUrl.trim();
    if (!trimmed) {
      return null;
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
      return null;
    }

    return null;
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
}
