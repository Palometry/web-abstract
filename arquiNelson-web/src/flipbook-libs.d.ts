declare global {
  interface DearFlipInstance {
    dispose?: () => void;
    resize?: () => void;
  }

  interface DearFlipGlobal {
    parseBooks?: () => void;
    defaults?: {
      mockupjsSrc?: string;
      threejsSrc?: string;
      pdfjsSrc?: string;
      pdfjsWorkerSrc?: string;
      pdfjsCompatibilitySrc?: string;
      soundFile?: string;
      imagesLocation?: string;
      imageResourcesPath?: string;
      cMapUrl?: string;
    };
  }

  interface Window {
    DFLIP?: DearFlipGlobal;
    dFlipLocation?: string;
  }
}

export {};
