// 建立 WebGPU 上下文

import { delay } from "@/utilities/proxy";

const webgpu = {
    isInitialized: false,
    preferredFormat: null! as GPUTextureFormat,
    adapterProxy: delay<GPUAdapter>("WebGPU not initialized"),
    deviceProxy: delay<GPUDevice>("WebGPU not initialized"),
    canvasProxy: delay<HTMLCanvasElement>("WebGPU not initialized"),
    contextProxy: delay<GPUCanvasContext>("WebGPU not initialized"),
};

export async function initContext(canvas: HTMLCanvasElement) {
    if (webgpu.isInitialized)
        return;

    if (!navigator.gpu)
        throw new Error('WebGPU not supported');

    const adapter = await navigator.gpu.requestAdapter();
    if (adapter === null)
        throw new Error('WebGPU not supported');

    const device = await adapter.requestDevice();
    if (device === null)
        throw new Error('WebGPU not supported');

    const context = canvas.getContext('webgpu');
    if (context === null)
        throw new Error('WebGPU not supported');

    const preferredFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format: preferredFormat });
    
    webgpu.isInitialized = true;
    webgpu.adapterProxy.set(adapter);
    webgpu.deviceProxy.set(device);
    webgpu.contextProxy.set(context);

    webgpu.preferredFormat = preferredFormat;

    const observer = new ResizeObserver(() => {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        context.configure({ device, format: preferredFormat });
        canvas.dispatchEvent(new Event('resize')); // Dispatch resize event
    });
    
    observer.observe(canvas);
    webgpu.canvasProxy.set(canvas);
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

export const { proxy: adapter } = webgpu.adapterProxy;
export const { proxy: device } = webgpu.deviceProxy;
export const { proxy: canvas } = webgpu.canvasProxy;
export const { proxy: context } = webgpu.contextProxy;

export function isInitialized() {
    return webgpu.isInitialized;
}

export function getPreferredFormat() {
    if (!webgpu.isInitialized)
        throw new Error("WebGPU not initialized");
    return webgpu.preferredFormat;
}

export function createCanvasView() {
    if (!webgpu.isInitialized)
        throw new Error("WebGPU not initialized");
    return context.getCurrentTexture().createView();
}