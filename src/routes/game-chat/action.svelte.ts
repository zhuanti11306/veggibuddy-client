import type { Action } from "svelte/action";

import { ffmpeg, setupFFmpeg } from "$lib/utils/ffmpeg";
import { convert } from "$lib/utils/ffmpeg/webm-to-mp3";

import { WaveformDrawer } from "$lib/utils/waveform";
import { addAnimationLoop, clearAnimationLoop } from "$lib/utils/animation";

import { CommunicationManager, game, interact, type PetFaceCategory, type ConversationService } from "$lib/services";

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
        // 定義時間格式化函式
        const formatTime = (totalSeconds: number) => {
            const s = Math.max(0, totalSeconds);
            const minutes = Math.floor(s / 60).toString().padStart(2, "0");
            const seconds = (s % 60).toString().padStart(2, "0");
            return `${minutes} : ${seconds}`;
        };

        // 根據錄音機目前的狀態回傳對應文字
        // 注意：這裡是 Getter，執行時 recorder 已經被定義，所以可以安全存取
        switch (recorder.state) {
            case RecordingState.Processing:
                return "思考中...";
            
            case RecordingState.Failed:
                return "發生錯誤";

            case RecordingState.Ungranted:
                return "等待授權";

            case RecordingState.Recording:
            case RecordingState.Paused:
                return formatTime(this.seconds);

            case RecordingState.Ready:
            default:
                // 保留給開啟了但沒錄音的時候
                return "-- : --";
        }
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

export const enum FeedbackMode {
    Voice = "voice", // 人聲
    Sound = "sound" // 音效
}

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
    },

    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    initialize,

    mode: FeedbackMode.Voice,

    toggleMode() {
        switch (this.mode) {
            case FeedbackMode.Voice:
                this.mode = FeedbackMode.Sound;
                if (conversation)
                    conversation.autoPlay = false;
                break;
            case FeedbackMode.Sound:
                this.mode = FeedbackMode.Voice;
                if (conversation)
                    conversation.autoPlay = true;
                break;
        }
    }
});

let stream: MediaStream | null = null;
let conversation: ConversationService | null = null;
let drawer: WaveformDrawer | null = null;

async function initialize() {
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
        .then(stream => ({ stream, result: <const>InitializeResult.Success }))
        .catch(error => ({ error, result: <const>InitializeResult.Ungranted }));

    const getConversationTask = CommunicationManager.getConversation().waitForReady()
        .then(conversation => ({ conversation, result: <const>InitializeResult.Success }))
        .catch(error => ({ error, result: <const>InitializeResult.Failed }));

    const setupFFmpegTask = ffmpeg.loaded ? Promise.resolve({ result: <const>InitializeResult.Success }) : setupFFmpeg()
        .then(success => ({ result: success ? <const>InitializeResult.Success : <const>InitializeResult.Failed }))
        .catch(error => ({ error, result: <const>InitializeResult.Failed }));

    recorder.initializing = true;

    const results = await Promise.all([getMediaTask, getConversationTask, setupFFmpegTask]);
    const [getMediaResult, getConversationResult] = results;

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
    conversation.autoPlay = recorder.mode === FeedbackMode.Voice;
}

function startRecording() {
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

function stopRecording(send: boolean = true) {
    // 檢查基本狀態
    if (recorder.state !== RecordingState.Recording && recorder.state !== RecordingState.Paused)
        return;

    // 如果不傳送或沒有實例，直接停止並重置
    if (!recorder.instance || !send) {
        // 安全停止，移除事件監聽以防觸發 onstop
        if (recorder.instance) {
            recorder.instance.onstop = null;
            recorder.instance.ondataavailable = null;
            recorder.instance.stop();
        }
        recorder.instance = null;

        recorder.state = RecordingState.Ready;

        drawer?.setBarColor("gray");
        timer.stop();
        timer.seconds = -1;

        return;
    }

    // 設定停止後的處理邏輯
    recorder.instance.onstop = async () => {
        // 【檢查點 1】如果實例已被清除（代表頁面已卸載），直接結束
        if (!recorder.instance) return;

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

        // 【檢查點 2】轉檔耗時，轉完再次檢查是否已被卸載
        if (!recorder.instance) return;

        if (!(output instanceof Uint8Array)) {
            console.error("[ERR] (FFMPEG) Conversion failed, output is not Uint8Array.");
            recorder.state = RecordingState.Ready;
            return;
        }

        const mp3Blob = new Blob([output], { type: 'audio/mpeg' });

        // 發送音訊並取得播放 Promise
        const { emotion, played: promisePlayed } = await conversation?.sendAudioAndWait(mp3Blob);

        // 【檢查點 3】網路請求耗時，回來後再次檢查
        if (!recorder.instance) return;

        // 設定表情
        interact.setFace(emotion as PetFaceCategory);

        // 播放聲音或動畫
        if (recorder.mode === FeedbackMode.Voice) {
            // 等待聲音播放完畢
            await promisePlayed;
        } else {
            const iter = Math.random() < 0.5 ? 2 : 3;
            for (let i = 0; i < iter; i++) {
                // 【檢查點 4】在迴圈動畫中，每次都要檢查
                if (!recorder.instance) break; 
                await interact.makeSound(undefined, 0, true);
            }
        }

        // 【檢查點 5】最後確認
        if (!recorder.instance) return;

        game.earnCurrency("CHAT");

        recorder.instance = null;
        recorder.state = RecordingState.Ready;

        // interact.setFace(interact.PetFaceCategory.neutral);
    };

    // 觸發停止，開始執行上面的 async 流程
    recorder.instance.stop();

    drawer?.setBarColor("gray");
    timer.stop();

    recorder.state = RecordingState.Processing;
}

function pauseRecording() {
    if (recorder.state !== RecordingState.Recording)
        return;

    if (!recorder.instance)
        return;

    recorder.instance.pause();

    recorder.state = RecordingState.Paused;
    drawer?.setBarColor("gray");
    timer.pause();
}

function resumeRecording() {
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
            // 1. 清理 DOM 觀察與動畫
            observer.unobserve(canvas);
            waveformDrawer.destroy();
            clearAnimationLoop(animation);

            // 2. 停止並重置 Timer
            timer.stop();

            if (conversation) {
                conversation.autoPlay = false;
            }

            // 3. 強制中斷錄音流程
            if (recorder.instance) {
                // 移除回調，防止非同步邏輯（如 onstop）在卸載後繼續執行
                recorder.instance.onstop = null;
                recorder.instance.ondataavailable = null;
                
                // 停止硬體錄音
                recorder.instance.stop();
                
                // 清空實例，這會作為信號讓 stopRecording 中的 await 檢查點攔截後續操作
                recorder.instance = null;
            }

            // 4. 重置狀態機，確保下次進入時重新授權/初始化
            recorder.state = RecordingState.Ungranted;
            recorder.initializing = false;

            // 5. 確保表情重置 (視需求，如果頁面切換後 interact 實例還在)
            interact.setFace(interact.PetFaceCategory.neutral);
        }
    };
}