

import type { Action } from "svelte/action";

import { GLTFModel } from "$lib/utils/three/gltf-model";

import PetModel from "$assets/pet/test.glb?url";

export const petModel =
    new GLTFModel(PetModel)
        .centerAtOrigin()
        .scaleIntoBox(5)
        .applyShadown();

export const three: Action<HTMLElement> = function (container) {
    const canvas = container.querySelector("canvas");
    if (!canvas)
        throw new Error("Canvas element not found in the container.");


}