<script lang="ts">
    import { assets } from "$lib/services";
    import { action, timer, recorder, FeedbackMode } from "./action.svelte";
</script>

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        width: 100%;
        height: 100%;
        padding: 1rem;
    }

    .timer {
        color: red;
        font-weight: bold;
        margin-top: -.5rem;
    }

    .canvas-container {
        width: 100%;
        height: 200px;
        padding: 1rem;
        border: 2px solid red;
        border-radius: .5rem;
        background: #fffc;
        margin-top: auto;

        display: flex;
        flex-direction: column;
        align-items: center;

        canvas {
            width: 100%;
            height: 0;
            flex: 1 1 0;
        }
    }

    .button {
        width: 4rem;
        height: 4rem;
        padding: 0;
        border: 0;
        border-radius: 50%;
    }

    

    .toggler {
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
        bottom: 1rem;
        right: 1rem;

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
            font-size: 1rem;
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
    <div class="canvas-container">
        <div class="timer">{recorder.state === recorder.FAILED ? "出現未知錯誤" : timer.formatted}</div>
        <canvas use:action></canvas>
    </div>

    {#if recorder.state === recorder.UNGRANTED}
        <div class="button-list">
            <button class="button" onclick={() => history.back()}>返回</button>
            <button class="button" disabled={recorder.initializing} onclick={recorder.initialize}>開始錄音</button>
        </div>
    {:else if recorder.state === recorder.READY}
        <div class="button-list">
            <button class="button" onclick={() => history.back()}>返回</button>
            <button class="button" onclick={recorder.startRecording}>開始</button>
        </div>
    {:else if recorder.state === recorder.RECORDING}
        <div class="button-list">
            <button class="button" onclick={() => recorder.pauseRecording()}>暫停</button>
            <button class="button" onclick={() => recorder.stopRecording(true)}>送出</button>
        </div>
    {:else if recorder.state === recorder.PAUSED}
        <div class="button-list">
            <button class="button" onclick={() => recorder.resumeRecording()}>繼續</button>
            <button class="button" onclick={() => recorder.stopRecording(false)}>終止</button>
            <button class="button" onclick={() => recorder.stopRecording(true)}>送出</button>
        </div>
    {:else if recorder.state === recorder.PROCESSING || recorder.state === recorder.FAILED}
        <div class="button-list">
            <button class="button" onclick={() => history.back()}>返回</button>
            <button class="button" disabled>開始錄音</button>
        </div>
    {/if}

    
    <button type="button" class="toggler" onclick={() => recorder.toggleMode()}>
        <img src={assets.uiAssets.chat.src} alt="翻譯機" draggable="false" 
            style:filter={recorder.mode === FeedbackMode.Voice ? "none" : "grayscale(100%)"}>
        <span class="label">
            翻譯：{recorder.mode === FeedbackMode.Voice ? "開" : "關"}
        </span>
    </button>
</div>