import { Deque } from "../collections";

export interface TextureDescriptor {
    size: { width: number, height: number };

    /**
     * The format of the texture data.
     *  
     * @default "rgba8unorm" 
     **/
    format?: GPUTextureFormat;

    /**
     * The usage of the texture.
     **/
    usage?: GPUTextureUsageFlags;

    /**
     * The source of the texture data.
     * Can be a function that returns a promise of the texture data.
     **/
    source: TextureSource | (() => TextureSource | Promise<TextureSource>);

    flipY?: boolean;
}

export type TextureSource = ImageBitmap | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | OffscreenCanvas | ArrayBuffer;

export abstract class Texture {
    private static readonly destructionQueue: Deque<GPUTexture> = new Deque();

    private currentGPUTask: Map<GPUTexture, Promise<unknown>> = new Map();

    protected texture: GPUTexture | null = null;
    protected textureView: GPUTextureView | null = null;
    protected accessDevice: GPUDevice | null = null;

    constructor() {
        console.log(`[DBG] Texture Current GPUTask initialized:`, this.currentGPUTask);
    }

    public static destroyTextures(): void {
        if (this.destructionQueue.isEmpty()) return;

        console.log("[DBG] Destroying textures:", this.destructionQueue.length);

        while (this.destructionQueue.length > 0) {
            const texture = this.destructionQueue.pop();
            if (texture) {
                texture.destroy();
            }
        }
    }

    public abstract load(): Promise<void>;
    public abstract createGPUTexture(device: GPUDevice): GPUTexture;

    protected setCurrentGPUTask(task: Promise<unknown>): void {
        if (!this.texture)
            return;

        const existingTask = this.getCurrentGPUTask(this.texture);
        this.currentGPUTask.set(this.texture, existingTask.then(() => task));
    }

    protected getCurrentGPUTask(texture: GPUTexture): Promise<unknown> {
        const currentTask = this.currentGPUTask.get(texture);
        if (currentTask)
            return currentTask;
        const newTask = Promise.resolve();
        this.currentGPUTask.set(texture, newTask);
        return newTask;
    }

    protected clearCurrentGPUTask(texture: GPUTexture): void {
        this.currentGPUTask.delete(texture);
    }

    public getGPUTexture(device: GPUDevice): GPUTexture {
        if (this.accessDevice !== device) {
            if (!this.accessDevice) {
                this.accessDevice = device;
            } else {
                throw new Error(`Texture is already used by another device.`);
            }
        }

        return this.texture ??= this.createGPUTexture(device);
    };


    public getGPUTextureView(device: GPUDevice, renderTask: Promise<unknown>): GPUTextureView {
        this.setCurrentGPUTask(renderTask);
        return this.textureView ??= this.getGPUTexture(device).createView();
    };

    public destroyGPUTexture(): void {
        if (this.texture) {
            // 將 GPUTexture 添加到銷毀隊列
            console.log("[DBG] Trying to destroy GPUTexture:", this.texture.label);

            const textureToDestroy = this.texture;
            const gpuTask = this.getCurrentGPUTask(textureToDestroy);

            this.destroyGPUTextureAfterPromise(gpuTask, textureToDestroy);

            this.texture = null;
        }

        if (this.textureView) {
            this.textureView = null;
        }
    }

    private destroyGPUTextureAfterPromise(promise: Promise<unknown>, texture: GPUTexture): Promise<void> {
        return promise.then(() => {
            const currentPromise = this.getCurrentGPUTask(texture);
            if (currentPromise === promise) {
                Texture.destructionQueue.push(texture);
                this.clearCurrentGPUTask(texture);
            } else {
                this.destroyGPUTextureAfterPromise(currentPromise!, texture);
            }
        });
    }
}

export class Texture2D extends Texture {

    private static readonly DEFAULT_FORMAT: GPUTextureFormat = "rgba8unorm";

    public readonly label: string;
    public readonly descriptor: TextureDescriptor;

    public readonly format: GPUTextureFormat;
    public readonly usage: GPUTextureUsageFlags;
    public readonly flipY: boolean;

    private readonly size: { width: number, height: number };

    public isLoaded: boolean = false;
    private source: TextureSource | null;
    private loadSource: () => TextureSource | Promise<TextureSource>;

    constructor(label: string, descriptor: TextureDescriptor) {
        super();

        this.label = label;
        this.descriptor = descriptor;

        const { size, format = Texture2D.DEFAULT_FORMAT, usage = 0, source } = descriptor;

        this.size = size;

        this.format = format;
        this.usage = usage;

        this.flipY = descriptor.flipY ?? false;

        if (source instanceof Function) {
            this.loadSource = source;
            this.source = null; // 初始時 source 為 null，等到 load 時才會載入
        } else {
            this.loadSource = () => Promise.resolve(source);
            this.source = source;
            this.isLoaded = true;
        }
    }

    public getSize(): { width: number, height: number } {
        return this.size;
    }

    public setSize(size: { width: number, height: number }): void {
        if (this.isLoaded)
            this.unload();
        this.size.width = size.width;
        this.size.height = size.height;
    }

    public getSource(): TextureSource | null {
        return this.source;
    }

    public setSource(source: TextureSource | (() => TextureSource | Promise<TextureSource>)): void {
        if (this.isLoaded)
            this.unload();

        if (typeof source === "function") {
            this.loadSource = source;
            this.source = null; // 如果是函數，則在 load 時載入
        } else {
            // 如果是直接的 source，則立即設定
            this.loadSource = () => Promise.resolve(source);
            this.source = source;
            this.isLoaded = true;
        }
    }

    public async load(): Promise<void> {
        if (!this.source) {
            this.source = await this.loadSource();
            this.isLoaded = true;
            this.writeTexture(); // 載入後嘗試寫入 GPUTexture
        }
    }

    public unload(): void {
        this.source = null;
        this.isLoaded = false;
        this.destroyGPUTexture();
    }

    public createGPUTexture(device: GPUDevice): GPUTexture {

        const gpuTexture = device.createTexture({
            label: this.label,
            size: this.size,
            dimension: "2d",
            format: this.format,
            usage: this.usage,
        });

        this.texture = gpuTexture;
        this.writeTexture();

        return gpuTexture;
    }

    /** 嘗試將 source 寫入 GPUTexture */
    private writeTexture() {

        const source = this.source;
        const texture = this.texture;
        const device = this.accessDevice;

        if (!source || !texture || !device)
            return;

        if (source instanceof ArrayBuffer) {
            const bytesPerPixel = Texture2D.getBytesPerPixel(this.format);
            const bytesPerRow = this.size.width * bytesPerPixel;
            // Ensure bytesPerRow is a multiple of 256 for optimal performance
            const alignedBytesPerRow = Math.ceil(bytesPerRow / 256) * 256;

            device.queue.writeTexture(
                { texture }, source,
                { offset: 0, bytesPerRow: alignedBytesPerRow, rowsPerImage: this.size.height },
                this.size
            );
        } else {
            device.queue.copyExternalImageToTexture(
                { source, flipY: this.flipY }, { texture }, this.size
            );
        }

        console.log(`[DBG] Texture ${this.label} written to GPUTexture with size:`, this.size);

        this.setCurrentGPUTask(device.queue.onSubmittedWorkDone());
    }

    private static getBytesPerPixel(format: GPUTextureFormat): number {
        // This can be a simple lookup or a more complex function
        // based on the texture formats you plan to support.
        if (format.endsWith("8unorm") || format.endsWith("8snorm") || format.endsWith("8uint") || format.endsWith("8sint")) {
            if (format.startsWith("rgba")) return 4;
            if (format.startsWith("rg")) return 2;
            return 1;
        }
        if (format.endsWith("16float") || format.endsWith("16uint") || format.endsWith("16sint")) {
            if (format.startsWith("rgba")) return 8;
            if (format.startsWith("rg")) return 4;
            return 2;
        }
        if (format.endsWith("32float") || format.endsWith("32uint") || format.endsWith("32sint")) {
            if (format.startsWith("rgba")) return 16;
            if (format.startsWith("rg")) return 8;
            return 4;
        }
        // Add other formats as needed, e.g., depth formats
        throw new Error(`Unsupported texture format for ArrayBuffer source: ${format}`);
    }
}

interface URLImageTextureProps {
    url: string;
    size: [number, number];

    /** @default "rgba8unorm" */
    format?: GPUTextureFormat;

    /**
     * The usage of the texture.
     * Will automatically add GPUTextureUsage.COPY_DST and GPUTextureUsage.RENDER_ATTACHMENT because `copyExternalImageToTexture` requires these usages.
     *  
     * @default GPUTextureUsage.TEXTURE_BINDING
     **/
    usage?: GPUTextureUsageFlags;

    /** @default false */
    flipY?: boolean;
}

export function createURLTexture(label: string, props: URLImageTextureProps): Texture2D {
    const { url, size, format, usage = GPUTextureUsage.TEXTURE_BINDING, flipY } = props;

    const bitmapOptions: ImageBitmapOptions = {
        resizeWidth: size[0],
        resizeHeight: size[1],
        resizeQuality: "high"
    };

    return new Texture2D(label, {
        size: { width: size[0], height: size[1] },
        format, usage: usage | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT, flipY,

        source: async () => {
            const bolb = await fetch(url).then(res => res.blob());
            return createImageBitmap(bolb, bitmapOptions);
        }
    });
}

interface CanvasTextureProps {
    format?: GPUTextureFormat;

    /**
     * The usage of the texture.
     * Will automatically add GPUTextureUsage.COPY_DST and GPUTextureUsage.RENDER_ATTACHMENT because `copyExternalImageToTexture` requires these usages.
     *  
     * @default GPUTextureUsage.TEXTURE_BINDING
     **/
    usage?: GPUTextureUsageFlags;

    /** @default false */
    flipY?: boolean;
}

export function createCanvasTexture(label: string, canvas: HTMLCanvasElement | OffscreenCanvas, props?: CanvasTextureProps): Texture2D {
    const size = { width: canvas.width, height: canvas.height };
    const { format, usage = GPUTextureUsage.TEXTURE_BINDING, flipY } = props ?? {};

    return new Texture2D(label, {
        size, format, flipY, usage: usage | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        source: () => canvas
    });
}