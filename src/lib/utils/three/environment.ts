import { EquirectangularReflectionMapping, Texture } from "three";
import { EXRLoader, HDRLoader } from "three/examples/jsm/Addons.js";

export class Environmnet {
    private readonly url: string;
    private texture?: Texture;

    public get envMap() { return this.texture; }

    public readonly whenLoaded: Promise<Environmnet>;
    private readonly actionQueue: (() => void)[] = [];

    private readonly startLoad: () => void;
    private readonly rejectLoad: (reason?: any) => void;

    constructor(url: string, type: "hdr" | "exr" = "hdr") {
        this.url = url;

        const { promise, resolve, reject } = Promise.withResolvers<void>();

        this.whenLoaded = promise
            .then(() => Environmnet.load(this.url, type))
            .then(texture => {
                texture.mapping = EquirectangularReflectionMapping;
                this.texture = texture;
                return this;
            });

        this.startLoad = resolve;
        this.rejectLoad = reject;
    }

    public async load(): Promise<void> {
        this.startLoad();
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