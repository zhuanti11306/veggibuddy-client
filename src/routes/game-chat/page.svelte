<script lang="ts">
    import { addAnimationLoop, clearAnimationLoop } from "$lib/utils/animation";
    import { isFFmpegLoaded, setupFFmpeg } from "$lib/utils/ffmpeg";
    import { clearDummies, convert } from "$lib/utils/ffmpeg/webm-to-mp3";
    import { WaveformDrawer } from "$lib/utils/waveform";
    import { onDestroy, onMount } from "svelte";

    let canvas: HTMLCanvasElement | null = null;
    let stream: MediaStream | null = null;
    let drawObject: { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D, drawer: WaveformDrawer } | null = null;

    $effect(() => {
        if (drawObject) return;

        if (!canvas) return;

        const canvasEnsured = canvas;
        const context = canvas.getContext("2d");
        if (!context) return;

        drawObject = { canvas, context, drawer: new WaveformDrawer(canvas, context, { barColor: "gray", barWidth: 5, barGap: 5 }) };
        
        
        const observer = new ResizeObserver(() => {
            const width = canvasEnsured.clientWidth ?? 0;
            const height = canvasEnsured.clientHeight ?? 0;

            canvasEnsured.width = width * devicePixelRatio;
            canvasEnsured.height = height * devicePixelRatio;

            canvasEnsured.style.width = `${width}px`;
            canvasEnsured.style.height = `${height}px`;
        });

        observer.observe(canvas);
        return () => observer.disconnect();
    });

    let isStartDrawing = false;

    $effect(() => {
        if (isStartDrawing) return;

        if (!drawObject) return;
        
        const { drawer } = drawObject;
        const loop = () => drawer.draw();
        
        addAnimationLoop(loop);
        isStartDrawing = true;

        return () => clearAnimationLoop(loop);
    });

    let currentState: number = $state(0); // 0 - 無權限, 1 - 未開始, 2 - 錄音中, 3 - 暫停, 4 - 等待處理
    let timer: number = $state(-1); // 錄音計時器
    let timerInterval: ReturnType<typeof setInterval> | null = null;
    let loading: string | false = $state(false);

    async function gainMediaAccess() {
        if (!("mediaDevices" in navigator))
            return console.warn("[WRN] (Media) Media Devices API not supported.");

        if (loading || !drawObject)
            return;

        console.log("[DBG] Attempting to gain media access...");
        if (currentState !== 0)
            return;

        loading = "正在請求麥克風存取權限...";

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream = mediaStream;

            const { drawer } = drawObject;
            drawer.setStream(mediaStream);
        } catch (err) {
            console.error("[ERR] (Media) Failed to get media access:", err);
        } finally {
            loading = false;
        }

        if (!isFFmpegLoaded()) {

            loading = "正在載入錄音處理模組...";
            console.log("[DBG] Loading FFMPEG...");

            try {
                await setupFFmpeg();
            } catch (err) {
                console.error("[ERR] (FFMPEG) Failed to load FFmpeg:", err);
            } finally {
                loading = false;
            }
        }

        console.log("[DBG] Media access granted.");
        
        currentState = 1;
    }

    let recorder: MediaRecorder | null = null;
    let firstChunk: Blob | null = null;
    let recordedChunks: Blob[] = [];

    function startRecording() {
        if (currentState !== 1) return;

        if (!stream) return;

        if (!recorder) {
            recorder = new MediaRecorder(stream);
        }
        
        
        recorder.ondataavailable = (event) => {
            if (!firstChunk)
                firstChunk = event.data;
            recordedChunks.push(event.data);
        };

        recorder.start(16);

        currentState = 2;
        drawObject?.drawer.setBarColor("red");
        timer = 0;
        timerInterval = setInterval(() => timer += 1, 1000);
    }

    function pauseRecording() {
        if (currentState !== 2) return;

        if (!recorder) return;

        recorder.pause();

        currentState = 3;
        drawObject?.drawer.setBarColor("gray");

        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }
    
    function resumeRecording() {
        if (currentState !== 3) return;

        if (!recorder) return;

        recorder.resume();

        currentState = 2;
        drawObject?.drawer.setBarColor("red");

        if (!timerInterval) {
            timerInterval = setInterval(() => timer += 1, 1000);
        }
    }

    function stopRecording(send: boolean = true) {
        if (currentState !== 2 && currentState !== 3) return;

        if (!recorder) return;

        const recorderEnsured = recorder;

        recorder.onstop = async () => {
            if (send) {
                const completeBlob = new Blob(recordedChunks, { type: 'audio/webm' });

                const output = await convert(completeBlob);
                console.log("[DBG] Converted output:", output);
            }

            recordedChunks = [firstChunk!];
            recorderEnsured.onstop = null;
            recorderEnsured.ondataavailable = null;
        }

        recorder.stop();

        currentState = 4;
        drawObject?.drawer.setBarColor("gray");

        timer = -1;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function formatTime(sec: number): string {
        if (sec < 0) return "-- : --";
        const minutes = Math.floor(sec / 60).toString().padStart(2, '0');
        const seconds = (sec % 60).toString().padStart(2, '0');
        return `${minutes} : ${seconds}`;
    }

    onMount(() => {
        gainMediaAccess();
    });

    onDestroy(() => {
        if (drawObject) {
            drawObject.drawer.destroy();
        }

        clearDummies();
    });

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
        <div class="timer">{formatTime(timer)}</div>
        <canvas bind:this={canvas}></canvas>
    </div>
    {#if currentState === 0}
        <div class="button-list">
            <button class="button" onclick={() => history.back()}>返回</button>
            <button class="button" onclick={gainMediaAccess}>開始錄音</button>
        </div>
    {:else if currentState === 1}
        <div class="button-list">
            <button class="button" onclick={() => history.back()}>返回</button>
            <button class="button" onclick={startRecording}>開始</button>
        </div>
    {:else if currentState === 2}
        <div class="button-list">
            <button class="button" onclick={() => pauseRecording()}>暫停</button>
            <button class="button" onclick={() => stopRecording(true)}>送出</button>
        </div>
    {:else if currentState === 3}
        <div class="button-list">
            <button class="button" onclick={() => resumeRecording()}>繼續</button>
            <button class="button" onclick={() => stopRecording(false)}>終止</button>
            <button class="button" onclick={() => stopRecording(true)}>送出</button>
        </div>
    {:else if currentState === 4}
        <div class="button-list">
            <button class="button" onclick={() => history.back()}>返回</button>
            <button class="button" disabled>開始錄音</button>
        </div>
    {/if}
</div>