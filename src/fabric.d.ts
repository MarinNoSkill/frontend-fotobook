declare module 'fabric' {
  export class Canvas {
    constructor(el: HTMLCanvasElement, options?: any);
    add(...objects: any[]): void;
    remove(...objects: any[]): void;
    clear(): void;
    renderAll(): void;
    setZoom(zoom: number): void;
    getObjects(): any[];
    setActiveObject(obj: any): void;
    dispose(): void;
    on(event: string | string[], callback: (e: any) => void): void;
  }

  export class Rect {
    constructor(options?: any);
  }

  export class Image {
    constructor(element?: HTMLImageElement | string, options?: any);
    clone(callback: (cloned: any) => void): void;
    getSrc?(): string;
  }
}
