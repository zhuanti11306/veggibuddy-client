<script lang="ts">
    import { assets } from "$lib/services";
    import { action, capture, cleanupFunction, registerPetSetup } from "./action.svelte";

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

        container-type: inline-size;
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

    video{
        display: none;
        visibility: hidden;
    }
    
    .button {
        display: block;
        width: 5rem;
        height: 5rem;
        padding: 0;
        position: absolute;

        background-color: transparent;
        border: 0;

        cursor: pointer;
        pointer-events: all;

        rotate: 90deg;

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
            top: .5rem;
        }

        &.right {
            left: .5rem;
            bottom: .5rem;
        }
    }
</style>

<div class="container" use:action>
    <video autoplay playsinline muted></video>
    <canvas id="video"></canvas>
    <canvas id="pet"></canvas>

    <button type="button" class="button left" onclick={() => (cleanupFunction.call?.(), history.back())}>
        <img src={assets.uiAssets.backToGame.src} alt="返回" draggable="false">
        <span class="label">返回</span>
    </button>
    
    {#if cleanupFunction.call}
        <button type="button" class="button right" onclick={() => cleanupFunction.call?.()}>
            <img src={assets.uiAssets.reset.src} alt="取消" draggable="false">
            <span class="label">取消</span>
        </button>
    {:else}
        <button type="button" class="button right" onclick={() => capture()}>
            <img src={assets.uiAssets.camera.src} alt="拍攝" draggable="false">
            <span class="label">拍攝</span>
        </button>
    {/if}
</div>