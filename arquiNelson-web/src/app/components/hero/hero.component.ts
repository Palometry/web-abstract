import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

type HeroVideo = {
  src: string;
  label: string;
  projectPath?: string;
};

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss']
})
export class HeroComponent implements AfterViewInit, OnDestroy {
  @ViewChild('heroVideo') private heroVideo?: ElementRef<HTMLVideoElement>;

  videos: HeroVideo[] = [
    { src: '/videos/erni.mp4', label: 'Video de portada Erni' },
    { src: '/videos/gym.mp4', label: 'Video de portada Gym' },
    { src: '/videos/hd.mp4', label: 'Video de portada HD' },
    { src: '/videos/kr.mp4', label: 'Video de portada KR' },
    { src: '/videos/kr2.mp4', label: 'Video de portada KR 2' },
    {
      src: '/videos/papa-pelacho.mp4',
      label: 'Video de portada Papa Pelacho',
      projectPath: '/project/2',
    },
    { src: '/videos/video.mp4', label: 'Video de portada VIDEO' },
  ];
  activeVideoIndex = 0;
  progressValues: number[] = this.videos.map(() => 0);
  private readonly isBrowser: boolean;

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    this.syncVideoPlayback();
  }

  ngOnDestroy(): void {
    this.stopVideoPlayback();
  }

  get activeVideo(): HeroVideo {
    return this.videos[this.activeVideoIndex];
  }

  get activeVideoHasProject(): boolean {
    return !!this.activeVideo.projectPath;
  }

  onLoadedMetadata(): void {
    const video = this.getVideoElement();
    if (!video) {
      return;
    }

    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }

  onTimeUpdate(): void {
    const video = this.getVideoElement();
    if (!video || !video.duration) {
      return;
    }

    this.progressValues = this.progressValues.map((value, index) =>
      index === this.activeVideoIndex ? (video.currentTime / video.duration) * 100 : value
    );
    this.cdr.detectChanges();
  }

  onVideoEnded(): void {
    this.selectVideo((this.activeVideoIndex + 1) % this.videos.length);
  }

  selectVideo(index: number): void {
    if (index < 0 || index >= this.videos.length || index === this.activeVideoIndex) {
      return;
    }

    this.activeVideoIndex = index;
    this.progressValues = this.progressValues.map(() => 0);
    this.cdr.detectChanges();
    this.syncVideoPlayback();
  }

  goToActiveProject(): void {
    if (!this.activeVideo.projectPath) {
      return;
    }

    void this.router.navigateByUrl(this.activeVideo.projectPath);
  }

  private syncVideoPlayback(): void {
    if (!this.isBrowser) {
      return;
    }

    const video = this.getVideoElement();
    if (!video) {
      return;
    }

    requestAnimationFrame(() => {
      this.stopVideoPlayback();
      video.load();
      video.currentTime = 0;
      void video.play().catch(() => undefined);
    });
  }

  private getVideoElement(): HTMLVideoElement | null {
    const element = this.heroVideo?.nativeElement;
    if (!element || typeof element.play !== 'function' || typeof element.pause !== 'function') {
      return null;
    }

    return element;
  }

  private stopVideoPlayback(): void {
    const video = this.getVideoElement();
    if (!video) {
      return;
    }

    video.pause();
  }
}
