import { Drawable } from "./drawable";

import { Pipeline } from "@/utilities/render/pipeline";
import { vector } from "@/utilities/render/vector";
import { BindGroup, BindGroupLayout } from "@/utilities/render/bind-group";
import { ShaderModule } from "@/utilities/render/shader-module";
import { BufferedStruct } from "@/utilities/render/struct";
import { createCanvasTexture, Texture2D } from "@/utilities/render/texture";
import * as StructType from "@/utilities/render/struct-property-type";

import { draw, getCurrentPass } from "@/core/render/render";
import { getSampler, Sampler } from "@/core/render/sampler";
import { DefaultVertexDescriptor } from "@/core/render/vertex";
import { Layout } from "@/core/render/layout";

import shaderRaw from "./component-2d.wgsl?raw";
import { RenderPass } from "../render/render-pass";

export interface ComponentSize {
    width: number;
    height: number;
}

export interface ComponentPosition {
    x: number;
    y: number;
}

export interface ComponentGeometry {
    size: ComponentSize;
    position: ComponentPosition;
}

const componentBindGroupLayout = new BindGroupLayout("component-2d-layout", {
    entries: <const>[
        {
            key: "geometry",
            category: "buffer",
            type: "uniform",
            visibility: GPUShaderStage.VERTEX
        },
        {
            key: "texture",
            category: "texture",
            visibility: GPUShaderStage.FRAGMENT
        },
        {
            key: "sampler",
            category: "sampler",
            type: "filtering",
            visibility: GPUShaderStage.FRAGMENT
        }
    ]
});

const componentShaderModule = new ShaderModule("component-2d-shader", shaderRaw);

export const componentPipeline = new Pipeline("component-2d-pipeline", {
    layout: [Layout.Screen, componentBindGroupLayout],
    vertex: [DefaultVertexDescriptor],
    shader: {
        vertex: {
            module: componentShaderModule,
            entryPoint: "vertex_main"
        },
        fragment: {
            module: componentShaderModule,
            entryPoint: "fragment_main"
        }
    }
});

export abstract class Component2D implements Drawable {

    public static readonly CANVAS_SCALE_FACTOR: number = 1; // 預設畫布縮放因子

    /**
     * The geometry of the component, which includes its size and position.
     * This is set for rendering purposes and is used to determine how the component should be drawn on the screen.
     */
    protected geometry: ComponentGeometry | null = null;
    protected parent: Component2D | null = null;

    private readonly uniformBuffer: BufferedStruct<{
        size: StructType.Vector.vec2; // Size of the component
        position: StructType.Vector.vec2; // Position of the component
    }>;

    private readonly uniformBindGroup: BindGroup;

    /**
     * 用於渲染組件外觀的畫布。
     */
    protected readonly canvas: OffscreenCanvas;
    /**
     * 用於渲染組件外觀的 2D 繪圖上下文。  
     * 需注意，不應該改變此上下文的大小與縮放比例，因為這會影響到渲染結果。
     */
    protected readonly context: OffscreenCanvasRenderingContext2D;

    protected readonly texture: Texture2D;


    protected isVisible: boolean = true;
    // protected isDirty: boolean = true; // Indicates if the component needs to be updated or rendered
    protected isGeometryDirty: boolean = true; // 是否需要更新幾何體
    protected isAppearanceDirty: boolean = true; // 是否需要更新外觀

    constructor() {
        this.canvas = new OffscreenCanvas(256, 256);
        this.context = this.canvas.getContext("2d")!;

        this.context.imageSmoothingEnabled = true; // 啟用圖像平滑
        this.context.imageSmoothingQuality = "high"; // 設定圖像平滑質量為高

        this.texture = createCanvasTexture("component-2d-texture", this.canvas);

        this.uniformBuffer = new BufferedStruct("component-2d-uniform", {
            size: StructType.Vector.vec2,
            position: StructType.Vector.vec2
        });

        this.uniformBindGroup = new BindGroup("component-2d-uniform-bind-group", {
            layout: componentBindGroupLayout,
            entries: {
                geometry: this.uniformBuffer,
                texture: this.texture,
                sampler: getSampler(Sampler.Nearest)
            }
        });
    }

    public getPreferredSize(): ComponentSize {
        return { width: 256, height: 256 }; // 預設大小
    };
    public getMinSize(): ComponentSize {
        return { width: 0, height: 0 };
    };
    public getMaxSize(): ComponentSize {
        return { width: Infinity, height: Infinity };
    };

    public setParent(parent: Component2D | null): void {
        this.parent = parent;
    }

    public setGeometry(geometry: ComponentGeometry | null): void {
        if (!geometry && !this.geometry)
            return; // 如果沒有幾何體，則不需要更新

        if (!geometry) {
            this.geometry = null; // 清除幾何體
            this.isGeometryDirty = true;
            return;
        }

        geometry = structuredClone(geometry); // 確保 geometry 是一個新的物件

        if (!this.geometry) {
            this.geometry = geometry;
            this.isGeometryDirty = true;
            return;
        }

        if (
            this.geometry.size.width !== geometry.size.width ||
            this.geometry.size.height !== geometry.size.height
        ) {
            this.geometry = geometry;
            this.isGeometryDirty = true;
            this.redraw() // 標誌外觀需要重繪
        } else if (
            this.geometry.position.x !== geometry.position.x ||
            this.geometry.position.y !== geometry.position.y
        ) {
            this.geometry.position = geometry.position;
            this.isGeometryDirty = true;
        }
    }

    public getGeometry(): ComponentGeometry | null {
        return this.geometry;
    }

    protected redraw(): void {
        // this.isDirty = true; // Mark the component as dirty to trigger an update
        this.isAppearanceDirty = true; // 標誌外觀需要重繪
    }

    public update(_deltatime: number): void {

        if (!this.isGeometryDirty && !this.isAppearanceDirty)
            return; // 不需要更新，直接返回

        if (this.isGeometryDirty) {
            this.updateGeometry();
            this.isGeometryDirty = false; // 重置幾何體重繪標誌
        }

        if (this.isAppearanceDirty) {
            this.drawAppearance(); // 重繪外觀

            // 更新紋理
            this.texture.setSource(this.canvas);

            this.isAppearanceDirty = false; // 重置外觀重繪標誌
        }
    }

    protected updateGeometry(): void {
        if (!this.geometry)
            return; // No geometry set, nothing to update

        const { size, position } = this.geometry;

        // Update the offscreen canvas size
        this.canvas.width = size.width * Component2D.CANVAS_SCALE_FACTOR;
        this.canvas.height = size.height * Component2D.CANVAS_SCALE_FACTOR;

        // 更新紋理大小
        this.texture.setSize({ width: this.canvas.width, height: this.canvas.height });
        this.uniformBindGroup.destroy(); // 銷毀舊的綁定組以強迫載入新的紋理

        // Update the geometry buffer
        this.uniformBuffer.set("position", vector(position.x, position.y));
        this.uniformBuffer.set("size", vector(size.width, size.height));
    }

    protected drawAppearance(): void {
        // 此方法應該被子類別實現以繪製外觀
        this.context.setTransform(1, 0, 0, 1, 0, 0); // 重置變換
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height); // 清理畫布
        this.context.setTransform( // 設定畫布縮放
            Component2D.CANVAS_SCALE_FACTOR, 0, 0,
            Component2D.CANVAS_SCALE_FACTOR, 0, 0
        ); 
    }

    public render(): void {

        if (getCurrentPass()?.label != RenderPass.component2D)
            return; // Only render in the specific pass

        if (!this.geometry)
            return; // No geometry set, nothing to render

        draw({
            pipeline: componentPipeline,
            buffer: "quadrilateral",
            bindGroups: [
                null, // screenUniform,
                this.uniformBindGroup // component uniform
            ]
        });
    }
}