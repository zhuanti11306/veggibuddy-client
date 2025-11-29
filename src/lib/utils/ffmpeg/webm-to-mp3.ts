import { clearFFmpegContent, ffmpeg } from ".";

const FFMPEG_INPUT_FILE = "input.webm";
const FFMPEG_OUTPUT_FILE = "output.mp3";

export async function convert(inputData: Blob, signal?: AbortSignal): Promise<Uint8Array<ArrayBuffer> | null> {
    if (ffmpeg.loaded === false) {
        console.error("[ERR] (FFMPEG) FFmpeg is not loaded");
        return null;
    }

    // 寫入輸入檔案
    await ffmpeg.writeFile(FFMPEG_INPUT_FILE, new Uint8Array(await inputData.arrayBuffer()), { signal });

    // 執行轉檔指令
    await ffmpeg.exec(["-i", FFMPEG_INPUT_FILE, FFMPEG_OUTPUT_FILE], -1, { signal });

    // 讀取輸出檔案
    const output = await ffmpeg.readFile(FFMPEG_OUTPUT_FILE, "binary", { signal });

    await clearDummies();

    if (output instanceof Uint8Array)
        return output as Uint8Array<ArrayBuffer>;

    console.error("[ERR] (FFMPEG) Failed to convert WebM to MP3: output is not Uint8Array");
    return null;
}

export async function clearDummies() {
    return clearFFmpegContent([FFMPEG_INPUT_FILE, FFMPEG_OUTPUT_FILE]);
}