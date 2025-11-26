<script lang="ts">
    import { fade } from "svelte/transition";
    import { longPress, petting, registerPettingProgressMaxDecay, action, screenEffect, registerPetSetup } from "./action.svelte";
    import { assets } from "$lib/services";
    
    const { children } = $props();

    registerPettingProgressMaxDecay();
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

    .tracing-pointer {
        position: absolute;
        transform: translate(-50%, -50%);

        z-index: 1;
        pointer-events: none;
    }

    .ignore-pointer {
        z-index: 1;
        pointer-events: none;
    }

    .longpress-progress {
        position: absolute;
        width: 5rem;
        height: 5rem;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background-image: conic-gradient(
            rgba(255, 180, 0, 0.6), 
            rgba(255, 180, 0, 0.9) var(--progress, 0%), 
            rgba(0, 0, 0, 0.2) 0%
        );
    }

    .hand {
        width: 5rem;
        height: 5rem;
        }

    .petting-progress-bar {
        position: absolute;
        top: 25%;
        left: 50%;
        transform: translate(-50%, -50%);
        min-width: 50%;
        width: 10rem;
        max-width: 80%;
        height: 1rem;
        background-color: #00000040;
        border-radius: 0.5rem;
        overflow: hidden;

        .fill {
            height: 100%;
            background-color: #ffb400;
            transition: width 0.1s;
        }
    }

    .screen-effect {
        box-shadow: inset 0 0 var(--size, 2rem) .5rem var(--color, white);

        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;

        pointer-events: none;
        z-index: -1;
    }
</style>

<div class="container" use:action>
    <canvas></canvas>

    {#if longPress.state == longPress.DETECTING && longPress.progress > 0.05}
        <div class="longpress-progress tracing-pointer" 
            transition:fade
            style:--progress="{longPress.progress * 100}%"
            style:left="{longPress.pressPosition.x}px"
            style:top="{longPress.pressPosition.y}px"
        ></div>
    {:else if longPress.state == longPress.ACTIVATED}
        <img src={assets.getUIIcon("hand").src} alt="" class="hand tracing-pointer"
            transition:fade
            style:left="{longPress.currentPosition.x}px"
            style:top="{longPress.currentPosition.y}px"
        />
    {/if}

    {#if petting.opacity}
        <div class="petting-progress-bar ignore-pointer"
            transition:fade
            style:opacity="{petting.opacity}"
        >
            <div class="fill" style:width="{petting.progress / petting.progressMax * 100}%"></div>
        </div>
    {/if}

    {#if screenEffect.petting}
        <div class="screen-effect" transition:fade={{ duration: 200 }} 
            style:opacity="{screenEffect.petting}" 
            style:--color="pink" 
            style:--size="3rem"
        ></div>
    {/if}

    {#if screenEffect.upgrade}
        <div class="screen-effect" transition:fade={{ duration: 200 }} 
            style:opacity="{screenEffect.upgrade}"
            style:--color="lime" 
        ></div>
    {/if}

    {#if screenEffect.feeding}
        <div class="screen-effect" transition:fade={{ duration: 200 }} 
            style:opacity="{screenEffect.feeding}"
            style:--color="gold" 
            style:--size="5rem"
        ></div>
    {/if}

    {@render children?.()}
</div>