import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

// 使用本地檔案以避免跨域問題，下載自：
// https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/
import ffmpegCore from "$assets/ffmpeg/ffmpeg-core?url";
import ffmpegWasm from "$assets/ffmpeg/ffmpeg-core.wasm?url";

export const ffmpeg = new FFmpeg();

ffmpeg.on("log", event => {
    console.log(`[DBG] (FFMPEG) [${event.type}] ${event.message}`);
})

export async function setupFFmpeg() {
    if (ffmpeg.loaded)
        return true;

    return ffmpeg.load({
        coreURL: await toBlobURL(ffmpegCore, "text/javascript"),
        wasmURL: await toBlobURL(ffmpegWasm, "application/wasm"),
    }).then((isFirst) => {
        if (isFirst)
            console.log("[INF] (FFMPEG) FFmpeg loaded:", isFirst);
        return true;
    }).catch((err) => {
        console.error("[ERR] (FFMPEG) Failed to load FFmpeg:", err);
        return false;
    });
}

// window.ffmpeg = ffmpeg;
// window.setupFFmpeg = setupFFmpeg;

export function isFFmpegLoaded(): boolean {
    return ffmpeg.loaded;
}

export async function clearFFmpegContent(files: string[]) {
    const settledResults = await Promise.allSettled(files.map(file => ffmpeg.deleteFile(file)));
    
    for (const result of settledResults) {
        if (result.status === "rejected") {
            console.warn("[WRN] (FFMPEG) Failed to delete file:", result.reason);
        }
    }
}