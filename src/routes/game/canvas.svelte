<script lang="ts">
    import { assets, game, model } from "$lib/services";
    import { startRandomEventLoop, stopRandomEventLoop } from "$lib/services/interact";
    import type { Action } from "svelte/action";
    import { Raycaster, Vector2 } from "three";
    import type { OrbitControls } from "three/examples/jsm/Addons.js";

    const { children } = $props();

    const epsilon = 8; // pixels
    const longPressDuration = 1200; // milliseconds


    let controls: OrbitControls;

    let pressPosition = $state({ oriX: 0, oriY: 0, curX: 0, curY: 0, ptrX: 0, ptrY: 0 });
    let longpressProgress = $state(0);
    let isLongPressActive = $state(0); // 0 = inactive, 1 = detecting, 2 = active

    let pettingProgress = $state(0);

    const petModel = $derived(game.petInfo.isLegal ? assets.petAssets[game.petInfo.type] : null);

    const three: Action<HTMLDivElement> = function (container) {

        const canvas = container.querySelector("canvas");
        if (!canvas)
            throw new Error("Canvas element not found");

        const { dispose, controls: orbitControls } = model.createRenderer(container, canvas);

        controls = orbitControls;
        controls.enabled = false;
        

        let startTime: number | null = null;
        let detectLongPress: ReturnType<typeof setInterval> | null = null;

        function onpointerdown(event: PointerEvent) {
            pressPosition.oriX = pressPosition.curX = event.offsetX;
            pressPosition.oriY = pressPosition.curY = event.offsetY;

            longpressProgress = 0;
            startTime = performance.now();
            isLongPressActive = 1;

            detectLongPress = setInterval(() => {
                if (startTime === null) return clearInterval(detectLongPress!);
                const elapsed = performance.now() - startTime;
                
                if ((longpressProgress = Math.min(elapsed / longPressDuration, 1)) >= 1) {
                    isLongPressActive = 2;
                    clearInterval(detectLongPress!);
                }
            });
        }

        function onpointerup(_event: PointerEvent) {
            isLongPressActive = 0;
            detectLongPress && clearInterval(detectLongPress);
        }
        
        const raycaster = new Raycaster();
        let petDistanceSum = 0;

        function onpointermove(event: PointerEvent) {
            const lastX = pressPosition.curX;
            const lastY = pressPosition.curY;

            pressPosition.curX = event.offsetX;
            pressPosition.curY = event.offsetY;

            pressPosition.ptrX = event.offsetX / container.clientWidth * 2 - 1;
            pressPosition.ptrY = -(event.offsetY / container.clientHeight) * 2 + 1;

            if (pressPosition && Math.hypot(event.offsetX - pressPosition.oriX, event.offsetY - pressPosition.oriY) > epsilon) {
                detectLongPress && clearInterval(detectLongPress);

                if (isLongPressActive == 1)
                    isLongPressActive = 0;
            }

            // Petting detection

            if (isLongPressActive != 2) return;

            if (!petModel?.model?.object) return;

            raycaster.setFromCamera(new Vector2(pressPosition.ptrX, pressPosition.ptrY), model.camera);
            const intersects = raycaster.intersectObjects([petModel.model.object], true);

            if (!intersects.length) return;

            petDistanceSum += Math.hypot(pressPosition.curX - lastX, pressPosition.curY - lastY);

            if (petDistanceSum >= 50) {
                petDistanceSum = 0;
                pettingProgress += 1;
                
                if (pettingProgress >= 20) {
                    pettingProgress = 0;
                    // Trigger pet interaction
                    // e.g., interact.petAt(pressPosition.currentX, pressPosition.currentY);

                    console.log("Pet interaction triggered");
                }
            }
        }

        canvas.addEventListener("pointerdown", onpointerdown);
        canvas.addEventListener("pointerup", onpointerup);
        canvas.addEventListener("pointermove", onpointermove);

        return {
            destroy() {
                dispose();

                canvas.removeEventListener("pointerdown", onpointerdown);
                canvas.removeEventListener("pointerup", onpointerup);
                canvas.removeEventListener("pointermove", onpointermove);
            }
        }
    }

    $effect(() => {
        if (isLongPressActive == 2) {
            controls.enabled = false;
        } else {
            controls.enabled = true;
        }
    });


    $effect(() => {
        startRandomEventLoop();
        return () => stopRandomEventLoop();
    });

    $inspect({ pettingProgress });
</script>

<style>
    .container {
        width: 100%;
        height: 100%;
        z-index: 1;
        background-color: white;
        overflow: hidden;
    }

    canvas {
        display: block;
        width: 100% !important;
        height: 100% !important;
        position: absolute;
        top: 0;
        left: 0;
        z-index: -1;
    }

    .tracing-pointer {
        position: absolute;
        transform: translate(-50%, -50%);

        z-index: 1;
        pointer-events: none;

        transition: opacity 0.25s;
    }

    .longpress-progress {
        position: absolute;
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background-image: conic-gradient(
            rgba(255, 180, 0, 0.6), 
            rgba(255, 180, 0, 0.9) calc(var(--progress, 0) * 1%), 
            rgba(0, 0, 0, 0.2) 0%
        );
    }

    .hand {

    }
</style>

<div class="container" use:three>
    <canvas></canvas>

    <div class="longpress-progress tracing-pointer" 
        style:opacity="{isLongPressActive == 1 && longpressProgress > 0.05 ? 1 : 0}"
        style:--progress="{longpressProgress * 100}"
        style:left="{pressPosition?.oriX}px"
        style:top="{pressPosition?.oriY}px"
    ></div>

    <img src="" alt="" class="hand tracing-pointer"
        style:opacity="{isLongPressActive == 2 ? 1 : 0}"
        style:left="{pressPosition?.curX}px"
        style:top="{pressPosition?.curY}px"
    />

    {@render children?.()}
</div>