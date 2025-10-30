import { Box3, Mesh, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

import type { GLTF } from "three/examples/jsm/Addons.js";

export class GLTFModel {
    private gltf?: GLTF;

    public get object() { return this.gltf?.scene }
    public get animations() { return this.gltf?.animations }

    public readonly whenLoaded: Promise<GLTFModel>;
    private readonly actionQueue: (() => void)[] = [];

    constructor(modelUrl: string) {
        const loader = new GLTFLoader();
        this.whenLoaded = loader.loadAsync(modelUrl)
            .then(gltf => this.gltf = gltf)
            .then(() => this.clearActionQueue());
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

    public scaleIntoBox(boxSize: number = 1): this {
        if (!this.object) return this.enqueueAction(() => this.scaleIntoBox(boxSize));

        const box = new Box3().setFromObject(this.object);
        const size = box.getSize(new Vector3());

        const maxDimension = Math.max(size.x, size.y, size.z);
        const scale = boxSize / maxDimension;

        this.object.scale.setScalar(scale);

        return this;
    }

    public centerAtOrigin(): this {
        if (!this.object) return this.enqueueAction(() => this.centerAtOrigin());

        const box = new Box3().setFromObject(this.object);
        const center = box.getCenter(new Vector3());
        this.object.position.sub(center);

        return this;
    }

    public applyShadown(cast: boolean = true, receive: boolean = true): this {
        if (!this.object) return this.enqueueAction(() => this.applyShadown(cast, receive));

        this.object.traverse(child => {
            if (child instanceof Mesh) {
                child.castShadow = cast;
                child.receiveShadow = receive;
            }
        });

        return this;
    }
}
