// 管理渲染進程

import { createCanvasView, device, getPreferredFormat } from "@/core/render/context";

import { VertexArray, VertexBufferLayout } from "@/utilities/render/vertex-array";

import { Pipeline } from "@/utilities/render/pipeline";
import { BindGroup } from "@/utilities/render/bind-group";

import "./vertex"; // 定義預設頂點：quadrilateral、fullscreen-triangle
import { Texture } from "@/utilities/render/texture";

export type RequestAnimationFrameCallback = (timestamp: number) => void;

export type RenderBuffer = VertexBufferLayout | string;

export interface PassInfo {
    label: string;

    /** @default [null] */
    colorAttachments?: (ColorAttachment | "canvas" | null)[];

    /** @default undefined */
    depthStencilAttachment?: GPURenderPassDepthStencilAttachment;

    defaultBindGroups?: (BindGroup | null)[];
}

export interface ColorAttachment {
    view: GPUTextureView;

    /** @default "load" */
    loadOp?: GPULoadOp;

    /** @default [0.0,0.0,0.0,1.0] */
    clearValue?: GPUColor;

    /** @default "store" */
    storeOp?: GPUStoreOp;

    /** @default getPreferredFormat() */
    format?: GPUTextureFormat;

    /** @default GPUColorWrite.ALL */
    writeMask?: GPUColorWriteFlags;

    /** @default undefined */
    blendMode?: GPUBlendState;
}

export interface RenderInfo {
    pipeline: Pipeline;
    bindGroups?: (BindGroup | null)[];
    buffer: RenderBuffer;
}

export interface PassRenderInfo extends PassInfo {
    renderSteps: RenderInfo[];
}

const renderer = new class Renderer {

    private loop: RequestAnimationFrameCallback | null = null;
    private loopId: number | null = null;
    private lastStamp: number | null = null;

    private configuringStack: PassRenderInfo[] = [];
    private passQueue: PassRenderInfo[] = [];

    /**
     * 啟動渲染循環
     * @param callback 回調函數，傳入當前與上次調用的時間差 
     */
    public run(callback: (deltatime: number) => void): void {
        this.lastStamp = null;
        this.loop = timestamp => {
            
            const deltatime = this.lastStamp ? timestamp - this.lastStamp : 0;
            this.lastStamp = timestamp;
            
            callback(deltatime); // 執行回調函數
            
            Texture.destroyTextures(); // 清理已銷毀的紋理

            this.render(); // 渲染當前畫面

            this.loopId = requestAnimationFrame(this.loop!);
        };

        this.loopId = requestAnimationFrame(this.loop);
    }

    /** 停止渲染循環 */
    public stop(): void {
        if (this.loopId !== null) {
            cancelAnimationFrame(this.loopId);
            this.loopId = null;
        }

        this.loop = null;
        this.lastStamp = null;
    }

    /** 渲染當前畫面 */
    public render(): void {
        const commandEncoder = device.createCommandEncoder(); // 創建命令編碼器

        for (const passInfo of this.passQueue) {

            if (!passInfo.renderSteps.length) continue; // 如果沒有渲染步驟，則跳過

            // 建立渲染通道
            const renderPass = commandEncoder.beginRenderPass({
                label: passInfo.label,
                colorAttachments: this.getRenderPassColorAttachments(passInfo),
                depthStencilAttachment: passInfo.depthStencilAttachment
            });

            const colorTargetStates = this.getGPUColorTargetStates(passInfo); // 獲取顏色目標狀態

            for (const render of passInfo.renderSteps) {
                renderPass.setPipeline(render.pipeline.getRenderPipeline(device, colorTargetStates)); // 設置渲染管線

                for (let bindGroupIndex = 0; bindGroupIndex < render.pipeline.bindGroupCount; bindGroupIndex++) {
                    const bindGroup = render.bindGroups?.[bindGroupIndex] ?? passInfo.defaultBindGroups?.[bindGroupIndex];
                    if (bindGroup) renderPass.setBindGroup(bindGroupIndex, bindGroup.getGPUBindGroup(device)); // TODO: 動態位置
                }

                const { count, vertices, indices } = typeof render.buffer === "string" ? VertexArray.getVertexArray(render.buffer).getRegisteredLayout(render.buffer) : render.buffer;

                vertices.forEach(({ view }, slot) => renderPass.setVertexBuffer(slot, view.getGPUBuffer(device), 0, view.byteLength));

                if (indices) {
                    renderPass.setIndexBuffer(indices.view.getGPUBuffer(device), indices.type);
                    renderPass.drawIndexed(count);
                } else {
                    renderPass.draw(count);
                }
            }

            renderPass.end();
        }

        device.queue.submit([commandEncoder.finish()]);

        // device.queue.onSubmittedWorkDone().then(() => {
        //     Texture.destroyTextures();
        // }); // 提交命令後清理已銷毀的紋理

        this.configuringStack = []; // 清空配置堆疊
        this.passQueue = []; // 清空渲染隊列
    }

    public beginPass(info: PassInfo): void {
        this.configuringStack.push({ ...info, renderSteps: [] });
    }

    public endPass(): void {
        if (this.configuringStack.length === 0)
            throw new Error("No pass is currently configured.");

        const pass = this.configuringStack.pop()!;
        this.passQueue.push(pass);
    }

    public currentPass(): PassRenderInfo | null {
        if (this.configuringStack.length === 0)
            return null;
        return this.configuringStack.at(-1)!;
    }

    public draw(info: RenderInfo): void {
        // console.log("[DBG]", info);

        if (this.configuringStack.length === 0)
            throw new Error("No pass is currently configured.");

        const pass = this.configuringStack[this.configuringStack.length - 1];
        pass.renderSteps.push(info);
    }

    private getRenderPassColorAttachments(passInfo: PassInfo): (GPURenderPassColorAttachment | null)[] {
        if (!passInfo.colorAttachments) return [null];

        const colorAttachments: (GPURenderPassColorAttachment | null)[] = [];
        for (const attachment of passInfo.colorAttachments) {
            if (attachment === "canvas") {
                colorAttachments.push({
                    view: createCanvasView(),
                    loadOp: "clear",
                    clearValue: [0.0, 0.0, 0.0, 1.0],
                    storeOp: "store",
                });
            } else if (attachment) {
                const loadOp = attachment.loadOp ?? "load";
                const clearValue = attachment.clearValue ?? (loadOp === "clear" ? [0.0, 0.0, 0.0, 1.0] : undefined);
                const storeOp = attachment.storeOp ?? "store";

                colorAttachments.push({ view: attachment.view, loadOp, clearValue, storeOp });
            } else {
                colorAttachments.push(null);
            }
        }

        return colorAttachments;
    }

    private getGPUColorTargetStates(passInfo: PassInfo): (GPUColorTargetState | null)[] {
        if (!passInfo.colorAttachments) return [null];

        const colorTargets: (GPUColorTargetState | null)[] = [];
        for (const attachment of passInfo.colorAttachments) {
            if (attachment === "canvas") {
                colorTargets.push({
                    format: getPreferredFormat(),
                    writeMask: GPUColorWrite.ALL,
                });
            } else if (attachment) {
                colorTargets.push({
                    format: attachment.format ?? getPreferredFormat(),
                    writeMask: attachment.writeMask ?? GPUColorWrite.ALL,
                    blend: attachment.blendMode ?? undefined,
                });
            } else {
                colorTargets.push(null);
            }
        }

        return colorTargets;
    }
}

/**
 * 啟動渲染循環
 * @param callback 回調函數，傳入當前與上次調用的時間差
 */
export const run = renderer.run.bind(renderer);

/** 停止渲染循環 */
export const stop = renderer.stop.bind(renderer);

/** 渲染當前畫面 */
export const render = renderer.render.bind(renderer);

/**
 * 開始渲染通道
 * @param info 渲染通道資訊
 */
export const beginPass = renderer.beginPass.bind(renderer);

/** 結束渲染通道 */
export const endPass = renderer.endPass.bind(renderer);

/**
 * 獲取當前渲染通道
 * @returns 當前渲染通道資訊
 */
export const getCurrentPass = renderer.currentPass.bind(renderer);

/**
 * 繪製當前畫面
 * @param info 繪製資訊
 */
export const draw = renderer.draw.bind(renderer);