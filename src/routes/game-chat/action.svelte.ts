import type { Action } from "svelte/action";

import { ffmpeg, setupFFmpeg } from "$lib/utils/ffmpeg";
import { convert } from "$lib/utils/ffmpeg/webm-to-mp3";

import { WaveformDrawer } from "$lib/utils/waveform";
import { addAnimationLoop, clearAnimationLoop } from "$lib/utils/animation";

import { game, type ConversationService } from "$lib/services";

import { resetConrols } from "$routes/game";

const enum InitializeResult {
    Success = 0, // 成功
    Ungranted = 1, // 使用者未授權，普通情況
    Failed = 2 // 非常嚴重
}

const enum RecordingState {
    Ready,
    Recording,
    Paused,
    Processing,
    Ungranted,
    Failed
}

export const timer = $state({
    seconds: -1,
    interval: null as ReturnType<typeof setInterval> | null,

    get formatted() {
        if (this.seconds < 0) return "-- : --";
        const minutes = Math.floor(this.seconds / 60).toString().padStart(2, "0");
        const seconds = (this.seconds % 60).toString().padStart(2, "0");
        return `${minutes} : ${seconds}`;
    },

    start() {
        this.resume();
        this.seconds = 0;
    },

    stop() {
        this.pause();
        this.seconds = -1;
    },

    resume() {
        if (this.interval) return;
        this.interval = setInterval(() => this.seconds += 1, 1000);
    },

    pause() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
});

const recorderChunks: Blob[] = [];

export const recorder = $state({
    state: RecordingState.Ungranted,
    initializing: false,

    recorderInstance: null as MediaRecorder | null,

    READY: RecordingState.Ready,
    RECORDING: RecordingState.Recording,
    PAUSED: RecordingState.Paused,
    PROCESSING: RecordingState.Processing,
    UNGRANTED: RecordingState.Ungranted,
    FAILED: RecordingState.Failed,

    get instance() {
        return this.recorderInstance;
    },

    set instance(value: MediaRecorder | null) {
        if (!value) {
            if (this.recorderInstance) {
                this.recorderInstance.onstop = null;
                this.recorderInstance.ondataavailable = null;
                this.recorderInstance.stop();
            }

            return;
        }

        recorderChunks.length = 0;
        this.recorderInstance = value;

        value.ondataavailable = (event) => {
            recorderChunks.push(event.data);
        };
    },

    get blob() {
        return new Blob(recorderChunks, { type: 'audio/webm' });
    }
});

let stream: MediaStream | null = null;
let conversation: ConversationService | null = null;
let drawer: WaveformDrawer | null = null;

export async function initialize() {
    if (recorder.state !== RecordingState.Ungranted)
        return;

    if (recorder.initializing)
        return;

    if (!("mediaDevices" in navigator)) {
        console.warn("[WRN] (Media) Media Devices API not supported.");
        recorder.state = RecordingState.Failed;
        return;
    }

    const getMediaTask = navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => ({ stream, result: <const> InitializeResult.Success }))
        .catch(error => ({ error, result: <const> InitializeResult.Ungranted }));

    const getConversationTask = game.getConversation().waitForReady()
        .then(conversation => ({ conversation, result: <const> InitializeResult.Success }))
        .catch(error => ({ error, result: <const> InitializeResult.Failed }));

    const setupFFmpegTask = ffmpeg.loaded ? Promise.resolve({ result: <const> InitializeResult.Success }) : setupFFmpeg()
        .then(success => ({ result: success ? <const> InitializeResult.Success : <const> InitializeResult.Failed }))
        .catch(error => ({ error, result: <const> InitializeResult.Failed }));

    recorder.initializing = true;

    const results = await Promise.all([getMediaTask, getConversationTask, setupFFmpegTask]);
    const [getMediaResult, getConversationResult] = results;

    console.log("[DBG] (Media) Initialization results:", results);

    const resultFlag = results.reduce((flag, curr) => Math.max(curr.result, flag), InitializeResult.Success); // 取最嚴重的結果
    
    switch (resultFlag) {
        case InitializeResult.Success: // 全部成功
            stream = (getMediaResult as { stream: MediaStream }).stream;
            initConversation((getConversationResult as { conversation: ConversationService }).conversation);
            recorder.state = RecordingState.Ready;

            drawer?.setStream(stream);
            break;
        case InitializeResult.Ungranted: // 使用者未授權
            recorder.state = RecordingState.Ungranted;
            break;
        case InitializeResult.Failed: // 非常嚴重的錯誤
            recorder.state = RecordingState.Failed;
            break;
    }

    recorder.initializing = false;
}

function initConversation(service: ConversationService) {
    conversation = service;
}

export function startRecording() {
    if (recorder.state !== RecordingState.Ready)
        return;

    if (!stream)
        return;

    recorder.instance = new MediaRecorder(stream);
    recorder.instance.start();

    drawer?.setBarColor("red");
    timer.seconds = 0;
    timer.interval = setInterval(() => timer.seconds += 1, 1000);

    recorder.state = RecordingState.Recording;
}

export function stopRecording(send: boolean = true) {
    if (recorder.state !== RecordingState.Recording && recorder.state !== RecordingState.Paused)
        return;

    if (!recorder.instance || !send) {

        recorder?.instance?.stop();
        recorder.instance = null;
        
        recorder.state = RecordingState.Ready;
        
        drawer?.setBarColor("gray");
        timer.stop();
        timer.seconds = -1;
        
        return;
    } 

    recorder.instance.onstop = async () => {
        if (!conversation) {
            recorder.state = RecordingState.Ready;
            recorder.instance = null;
            return;
        }

        const output = await convert(recorder.blob).catch(err => {
            console.error("[ERR] (FFMPEG) Conversion failed:", err);
            recorder.state = RecordingState.Ready;
            return null;
        });

        if (!(output instanceof Uint8Array)) {
            console.error("[ERR] (FFMPEG) Conversion failed, output is not Uint8Array.");
            recorder.state = RecordingState.Ready;
            return;
        }

        const mp3Blob = new Blob([output], { type: 'audio/mpeg' });

        await conversation?.sendAudioAndWait(mp3Blob, "played");

        recorder.instance = null;
        recorder.state = RecordingState.Ready;
    };

    recorder.instance.stop();

    drawer?.setBarColor("gray");
    timer.stop();

    recorder.state = RecordingState.Processing;
}

export function pauseRecording() {
    if (recorder.state !== RecordingState.Recording)
        return;

    if (!recorder.instance)
        return;

    recorder.instance.pause();

    recorder.state = RecordingState.Paused;
    drawer?.setBarColor("gray");
    timer.pause();
}

export function resumeRecording() {
    if (recorder.state !== RecordingState.Paused)
        return;

    if (!recorder.instance)
        return;

    recorder.instance.resume();

    recorder.state = RecordingState.Recording;
    drawer?.setBarColor("red");
    timer.resume();
}

const drawerInitialConfig = { barColor: "gray", barWidth: 5, barGap: 5 };

export const action: Action<HTMLCanvasElement> = function (canvas) {

    // 調整畫布大小
    
    const observer = new ResizeObserver(() => {
        const width = canvas.clientWidth ?? 0;
        const height = canvas.clientHeight ?? 0;
        
        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;
        
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
    });
    
    observer.observe(canvas);
    
    // 動畫循環
    
    const waveformDrawer = drawer = new WaveformDrawer(canvas, canvas.getContext("2d")!, drawerInitialConfig);
    const animation = () => waveformDrawer.draw();
    addAnimationLoop(animation);

    // 初始化
    recorder.state = RecordingState.Ungranted; // 重設狀態
    initialize(); // 嘗試初始化

    resetConrols(true); // 重置控制器

    return {
        destroy() {
            observer.disconnect();
            waveformDrawer.destroy();
            clearAnimationLoop(animation);
        }
    };
}