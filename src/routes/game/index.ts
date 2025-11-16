import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/Addons.js";

import { addAnimationLoop, clearAnimationLoop } from "$lib/utils/animation";

import { getControls, screenEffect } from "./action.svelte";

export { default } from "./page.svelte";

export function showFeedingEffect(): void {
    screenEffect.feeding = .8;
}

export function showUpgradeEffect(): void {
    screenEffect.upgrade = 1.2;
}

export function resetConrols(smooth: boolean = false): void {
    if (!smooth)
        return getControls()?.reset();

    const controls = getControls();
    if (!controls)
        return;
    
    startResetConrolsAnimate(controls, 600);
}

function startResetConrolsAnimate(controls: OrbitControls, duration: number) {
    
    const initialTime = performance.now();
    
    const initalPosition = controls.object.position.clone();
    const targetPosition = controls.position0.clone();

    function animate(_deltaTime: unknown, time: number) {
        const elapsed = time - initialTime;
        const t = Math.min(elapsed / duration, 1);

        initalPosition.lerp(targetPosition, t);
        controls.object.position.copy(initalPosition);

        controls.update();

        if (t >= 1)
            clearAnimationLoop(animate);
    };

    addAnimationLoop(animate);
    return animate;
}
