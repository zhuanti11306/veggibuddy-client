import { FFmpeg } from "@ffmpeg/ffmpeg";

// 使用本地檔案以避免跨域問題，下載自：
// https://www.jsdelivr.com/package/npm/@ffmpeg/core-mt
// https://registry.npmjs.org/@ffmpeg/core-mt/-/core-mt-0.12.10.tgz
import ffmpegCore from "$assets/ffmpeg/ffmpeg-core?url";
import ffmpegWorker from "$assets/ffmpeg/ffmpeg-core.worker?url";
import ffmpegWasm from "$assets/ffmpeg/ffmpeg-core.wasm?url";

export const ffmpeg = new FFmpeg();

export async function setupFFmpeg() {
    if (ffmpeg.loaded)
        return true;

    return ffmpeg.load({
        coreURL: ffmpegCore,
        workerURL: ffmpegWorker,
        wasmURL: ffmpegWasm,
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
    await Promise.all(files.map(file => ffmpeg.deleteFile(file))).catch(error => {
        console.error("[ERR] (FFMPEG) Failed to clear FFmpeg files:", error);
    });
}