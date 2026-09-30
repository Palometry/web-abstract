import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-panorama-viewer',
  templateUrl: './panorama-viewer.component.html',
  styleUrl: './panorama-viewer.component.scss',
})
export class PanoramaViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) src = '';
  @Input() label = 'Vista panoramica 360';
  @ViewChild('viewer', { static: true }) private viewerElement!: ElementRef<HTMLElement>;

  private viewer?: PannellumViewer;
  private viewReady = false;

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.mountViewer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.viewReady && changes['src']) {
      this.mountViewer();
    }
  }

  ngOnDestroy(): void {
    this.destroyViewer();
  }

  private mountViewer(): void {
    this.destroyViewer();

    if (!this.src || typeof window === 'undefined' || !window.pannellum) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.viewer = window.pannellum?.viewer(this.viewerElement.nativeElement, {
        type: 'equirectangular',
        panorama: this.src,
        autoLoad: true,
        showControls: true,
        showFullscreenCtrl: true,
        showZoomCtrl: true,
        compass: false,
        hfov: 92,
        minHfov: 45,
        maxHfov: 110,
        pitch: -12,
        minPitch: -82,
        maxPitch: 35,
        haov: 360,
        vaov: 128.42,
        vOffset: -25.79,
        backgroundColor: [13, 13, 13],
      });
    });
  }

  private destroyViewer(): void {
    this.viewer?.destroy();
    this.viewer = undefined;
  }
}
