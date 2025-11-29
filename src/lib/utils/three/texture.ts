import { LinearSRGBColorSpace, SRGBColorSpace, Texture, TextureLoader } from "three";

export class TextureAsset {
    private readonly url: string;
    private asset?: Texture;

    public get texture() { return this.asset; }

    public readonly whenLoaded: Promise<TextureAsset>;
    private readonly actionQueue: (() => void)[] = [];

    private startLoad?: () => void;
    private rejectLoad?: (reason?: any) => void;

    constructor(url: string) {
        this.url = url;

        const { promise, resolve, reject } = Promise.withResolvers<void>();
        this.whenLoaded = promise
            .then(() => new TextureLoader().loadAsync(this.url))
            .then(texture => this.asset = texture)
            .then(() => this.clearActionQueue());
        this.startLoad = resolve;
        this.rejectLoad = reject;
    }

    private clearActionQueue(): this {
        this.actionQueue.forEach(action => action());
        this.actionQueue.length = 0;
        return this;
    }

    private enqueueAction(action: () => void): this {
        this.actionQueue.push(action);
        return this;
    }

    public async load(): Promise<void> {
        this.startLoad?.();
        
        this.startLoad = undefined;
        this.rejectLoad = undefined;
        
        await this.whenLoaded;
    }

    public toggleFlipY(flipY?: boolean): this {
        if (!this.texture) return this.enqueueAction(() => this.toggleFlipY(flipY));

        this.texture.flipY = flipY ?? !this.texture.flipY;
        this.texture.needsUpdate = true;
        return this;
    }

    public setTextureColorSpace(colorspace?: "srgb" | "linear"): this {
        if (!this.texture) return this.enqueueAction(() => this.setTextureColorSpace(colorspace));

        this.texture.colorSpace = colorspace === "srgb" ? SRGBColorSpace : LinearSRGBColorSpace;
        this.texture.needsUpdate = true;
        return this;
    }
}
