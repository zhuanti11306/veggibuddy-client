import { streamPipeable, type SideEffectProcessor, type StreamPipeable, type PipeTransformer } from "./pipeable";

const TIME_SLICE_MS = 16; // 約每秒 60 次

export interface PipeableMediaStream extends StreamPipeable<Blob> {
    start: () => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
}

export function createPipeableMediaStream(stream: MediaStream): PipeableMediaStream {

    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

    const pipeable = streamPipeable<Blob>(onData => {

        recorder.addEventListener("dataavailable", event => {
            onData(event.data);
        });
    }) as PipeableMediaStream;

    pipeable.start = () => recorder.start(TIME_SLICE_MS);
    pipeable.stop = () => recorder.stop();
    pipeable.pause = () => recorder.pause();
    pipeable.resume = () => recorder.resume();

    return pipeable;
}

export interface MediaBufferTransformer extends PipeTransformer<Blob, Blob | null> {
    flushToNext: () => void;
}

export function createMediaBufferTransformer(timeoutMs: number): MediaBufferTransformer {
    let firstChunk: Blob; // 提供標頭資訊供格式轉換
    let buffer: Blob[] = [];
    let lastTime: number = Date.now();

    let flushNext = false;

    function transformer(chunk: Blob) {
        if (!firstChunk)
            firstChunk = chunk;

        buffer.push(chunk);

        const now = Date.now();
        if (now - lastTime >= timeoutMs || flushNext) {
            lastTime = now;
            flushNext = false;

            const result = new Blob([...buffer], { type: firstChunk.type });
            buffer = [firstChunk]; // 保留標頭資訊

            return result;
        } else {
            return null;
        }
    }

    transformer.flushToNext = () => {
        flushNext = true;
    };

    return transformer;
}