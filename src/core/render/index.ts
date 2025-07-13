import { initContext } from "./context";

export async function initRenderContext(canvas: HTMLCanvasElement) {
    await initContext(canvas);
}