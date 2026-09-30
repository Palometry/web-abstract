type PannellumViewer = {
  destroy(): void;
  resize(): void;
};

type PannellumApi = {
  viewer(container: HTMLElement | string, config: Record<string, unknown>): PannellumViewer;
};

interface Window {
  pannellum?: PannellumApi;
}
