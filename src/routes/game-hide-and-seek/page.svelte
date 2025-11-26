<!-- <script lang="ts">
    import { assets } from "$lib/services";
    import { action, capture, registerPetSetup } from "./action.svelte";

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

    .container-rotated {
        width: 100cqh;
        height: 100cqw;

        transform: rotate(90deg) translateY(-100%);
        transform-origin: top left;

        position: absolute;
        top: 0;
        left: 0;
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
        width: 4.5rem;
        height: 5rem;
        padding: 0;
        position: relative;

        background-color: transparent;
        border: 0;

        cursor: pointer;
        pointer-events: all;

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
    }
</style>

<div class="container">
    
    <div class="container-rotated" use:action>
        <video autoplay playsinline muted></video>
        <canvas id="background"></canvas>
        <canvas id="pet"></canvas>
        
        <button type="button" class="button" onclick={capture}>
            <img src={assets.uiAssets.settings.src} alt="拍攝" draggable="false">
            <span class="label">拍攝</span>
        </button>
    </div>
</div> -->

<script lang="ts">
    import { assets } from "$lib/services";
    import { action, capture, registerPetSetup } from "./action.svelte";

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
/* 
    video {
        display: block;
        width: 100cqh !important;
        height: 100cqw !important;
        object-fit: cover;
        position: absolute;
        top: 0;
        left: 0;
        z-index: -2;
    } */

    video{
        display: none;
        visibility: hidden;
    }
    
    .button {
        display: block;
        width: 5rem;
        height: 5rem;
        padding: 0;
        position: relative;

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
    }
</style>

<div class="container" use:action>
    <video autoplay playsinline muted></video>
    <canvas id="video"></canvas>
    <canvas id="pet"></canvas>
    
    <button type="button" class="button" onclick={capture}>
        <img src={assets.uiAssets.settings.src} alt="拍攝" draggable="false">
        <span class="label">拍攝</span>
    </button>
</div>