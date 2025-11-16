<script lang="ts">
    import { action, initialize, pauseRecording, recorder, resumeRecording, startRecording, stopRecording, timer } from "./action.svelte";
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
</style>

<div class="container">
    <div class="canvas-container">
        <div class="timer">{recorder.state === recorder.FAILED ? "出現未知錯誤" : timer.formatted}</div>
        <canvas use:action></canvas>
    </div>

    {#if recorder.state === recorder.UNGRANTED}
        <div class="button-list">
            <button class="button" onclick={() => history.back()}>返回</button>
            <button class="button" disabled={recorder.initializing} onclick={initialize}>開始錄音</button>
        </div>
    {:else if recorder.state === recorder.READY}
        <div class="button-list">
            <button class="button" onclick={() => history.back()}>返回</button>
            <button class="button" onclick={startRecording}>開始</button>
        </div>
    {:else if recorder.state === recorder.RECORDING}
        <div class="button-list">
            <button class="button" onclick={() => pauseRecording()}>暫停</button>
            <button class="button" onclick={() => stopRecording(true)}>送出</button>
        </div>
    {:else if recorder.state === recorder.PAUSED}
        <div class="button-list">
            <button class="button" onclick={() => resumeRecording()}>繼續</button>
            <button class="button" onclick={() => stopRecording(false)}>終止</button>
            <button class="button" onclick={() => stopRecording(true)}>送出</button>
        </div>
    {:else if recorder.state === recorder.PROCESSING || recorder.state === recorder.FAILED}
        <div class="button-list">
            <button class="button" onclick={() => history.back()}>返回</button>
            <button class="button" disabled>開始錄音</button>
        </div>
    {/if}
</div>