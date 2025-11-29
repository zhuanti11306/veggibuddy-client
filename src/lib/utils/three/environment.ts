import { EquirectangularReflectionMapping, Texture } from "three";
import { EXRLoader, HDRLoader } from "three/examples/jsm/Addons.js";

export class Environment {
    private readonly url: string;
    private texture?: Texture;

    public get envMap() { return this.texture; }

    public readonly whenLoaded: Promise<Environment>;
    private readonly actionQueue: (() => void)[] = [];

    private startLoad?: () => void;
    private rejectLoad?: (reason?: any) => void;

    constructor(url: string, type: "hdr" | "exr" = "hdr") {
        this.url = url;

        const { promise, resolve, reject } = Promise.withResolvers<void>();

        this.whenLoaded = promise
            .then(() => Environment.load(this.url, type))
            .then(texture => {
                texture.mapping = EquirectangularReflectionMapping;
                this.texture = texture;
                return this;
            });

        this.startLoad = resolve;
        this.rejectLoad = reject;
    }

    public async load(): Promise<void> {
        this.startLoad?.();

        this.startLoad = undefined;
        this.rejectLoad = undefined;
        
        await this.whenLoaded;
    }
    
    private static load(url: string, type: "hdr" | "exr") {
        let loader;

        switch (type) {
            case "hdr": loader = new HDRLoader(); break;
            case "exr": loader = new EXRLoader(); break;
        }

        return loader.loadAsync(url);
    }
}