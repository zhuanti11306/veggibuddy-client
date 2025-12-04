<script lang="ts">
    import { assets } from "$lib/services";
    import { action, backwardCam, forwardCam, registerPetSetup, resetThrowingBallGame } from "./action.svelte";

    registerPetSetup();
</script>

<style>
    .container {
        width: 100%;
        height: 100%;
        z-index: 1;
        background-color: white;
        overflow: hidden;
        position: relative;
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

    .button {
        display: block;
        width: 4.5rem;
        height: 5rem;
        padding: 0;
        position: relative;

        background-color: transparent;
        border: 0;

        cursor: pointer;
        pointer-events: all;

        position: absolute;
        z-index: 1;
        bottom: .5rem;

        img {
            width: 100%;
            aspect-ratio: 1;
            object-fit: contain;
        }

        .label {
            position: absolute;
            bottom: 0;
            width: 100%;
            left: 0;
            text-align: center;
            font-size: 1.25rem;
            font-weight: bold;
            color: black;
            text-shadow:
                -2px 0px 0 white,
                2px 0px 0 white,
                0px -2px 0 white,
                0px 2px 0 white,
                calc(sqrt(2) * -1px) calc(sqrt(2) * -1px) 0 white,
                calc(sqrt(2) * -1px) calc(sqrt(2) * 1px) 0 white,
                calc(sqrt(2) * 1px) calc(sqrt(2) * -1px) 0 white,
                calc(sqrt(2) * 1px) calc(sqrt(2) * 1px) 0 white;
        }

        &.left {
            left: .5rem;
        }

        &.right {
            right: .5rem;
        }

        &.center-left {
            left: 50%;
            transform: translateX(-100%);
        }

        &.center-right {
            left: 50%;
            transform: translateX(0%);
        }
    }
</style>

<div class="container" use:action>
    <canvas></canvas>

    <button type="button" class="button left" onclick={() => (resetThrowingBallGame(), history.back())}>
        <img src={assets.uiAssets.backToGame.src} alt="返回" draggable="false">
        <span class="label">返回</span>
    </button>

    <button type="button" class="button center-left" use:forwardCam>
        <img src={assets.uiAssets.move.src} alt="前進" draggable="false">
        <span class="label">前進</span>
    </button>

    <button type="button" class="button center-right" use:backwardCam>
        <img src={assets.uiAssets.move.src} alt="後退" draggable="false" style:transform="scaleX(-1)">
        <span class="label">後退</span>
    </button>

    <button type="button" class="button right" onclick={resetThrowingBallGame}>
        <img src={assets.uiAssets.reset.src} alt="重置" draggable="false">
        <span class="label">重置</span>
    </button>
</div>