import { Box3, Mesh, Vector3, Texture, MeshStandardMaterial } from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

import type { GLTF } from "three/examples/jsm/Addons.js";

export class GLTFModel {
    private readonly url: string;
    private gltf?: GLTF;

    public get object() { return this.gltf?.scene }
    public get animations() { return this.gltf?.animations }

    public readonly whenLoaded: Promise<GLTFModel>;
    private readonly actionQueue: (() => void)[] = [];

    private startLoad?: () => void;
    private rejectLoad?: (reason?: any) => void;

    constructor(url: string) {
        this.url = url;

        const { promise, resolve, reject } = Promise.withResolvers<void>();
        this.whenLoaded = promise
            .then(() => new GLTFLoader().loadAsync(this.url))
            .then(gltf => this.gltf = gltf)
            .then(() => this.clearActionQueue())
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

    public scaleIntoBox(boxSize: number | { x?: number; y?: number; z?: number } = 1): this {
        if (!this.object) return this.enqueueAction(() => this.scaleIntoBox(boxSize));

        if (typeof boxSize === "number")
            boxSize = { x: boxSize, y: boxSize, z: boxSize };

        const box = new Box3().setFromObject(this.object);
        const size = box.getSize(new Vector3());

        const minScale = Math.min(
            (boxSize.x ?? Infinity) / size.x,
            (boxSize.y ?? Infinity) / size.y,
            (boxSize.z ?? Infinity) / size.z
        );

        if (minScale !== Infinity)
            this.object.scale.setScalar(minScale);

        return this;
    }

    public centerAtOrigin(): this {
        if (!this.object) return this.enqueueAction(() => this.centerAtOrigin());

        const box = new Box3().setFromObject(this.object);
        const center = box.getCenter(new Vector3());
        this.object.position.sub(center);

        return this;
    }

    public move(offset: { x?: number; y?: number; z?: number }, flipZ: boolean = true): this {
        if (!this.object) return this.enqueueAction(() => this.move(offset, flipZ));

        const zFactor = flipZ ? -1 : 1;

        this.object.position.add(new Vector3(
            offset.x ?? 0,
            offset.y ?? 0,
            (offset.z ?? 0) * zFactor
        ));

        return this;
    }

    public setOrigin(origin: { x: number; y: number; z: number }): this {
        if (!this.object) return this.enqueueAction(() => this.setOrigin(origin));

        this.object.position.set(origin.x, origin.y, origin.z);

        return this;
    }

    public rotate(angleInRadians: number, axis: "x" | "y" | "z" | { x: number; y: number; z: number }, origin: "origin" | { x: number; y: number; z: number } = "origin"): this {
        if (!this.object) return this.enqueueAction(() => this.rotate(angleInRadians, axis, origin));

        let originVec: Vector3 | null = null;
        if (origin !== "origin")
            originVec = new Vector3(origin.x, origin.y, origin.z);

        if (originVec)
            this.object.position.sub(originVec);

        switch (axis) {
            case "x":
                this.object.rotateX(angleInRadians);
                break;
            case "y":
                this.object.rotateY(angleInRadians);
                break;
            case "z":
                this.object.rotateZ(angleInRadians);
                break;
            default:
                this.object.rotateOnAxis(
                    new Vector3(
                        axis.x ?? 0,
                        axis.y ?? 0,
                        axis.z ?? 0
                    ).normalize(),
                    angleInRadians
                );
        }

        if (originVec)
            this.object.position.add(originVec);

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

    public changeMaterialMap(materialName: string, texture: Texture): this {
        if (!this.object) return this.enqueueAction(() => this.changeMaterialMap(materialName, texture));

        this.object.traverse(child => {
            if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
                const material = child.material;

                if (material.name === materialName) {
                    material.map = texture;
                    material.needsUpdate = true;
                }
            }
        });

        return this;
    }
}
