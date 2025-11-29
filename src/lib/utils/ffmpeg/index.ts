import { isDev } from "$lib/config";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

export const ffmpeg = new FFmpeg();

if (isDev) {
    ffmpeg.on("log", event => {
        console.log(`[DBG] (FFMPEG) [${event.type}] ${event.message}`);
    })
}

const ffmpegConfig = { // 直接使用 CDN，可以利用 Blob URL 避免跨域問題
    coreURL: await toBlobURL("https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js", "text/javascript"),
    wasmURL: await toBlobURL("https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm", "application/wasm")
};

export async function setupFFmpeg() {
    if (ffmpeg.loaded)
        return true;

    return ffmpeg.load(ffmpegConfig)
        .then(() => true)
        .catch((err) => {
            console.error("[ERR] (FFMPEG) Failed to load FFmpeg:", err);
            return false;
        });
}

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