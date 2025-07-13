import { delay } from "@/utilities/proxy";
import { GestureTarget } from "@/utilities/gesture";

import { BufferedStruct } from "@/utilities/render/struct";
import * as StructType from "@/utilities/render/struct-property-type";
import { vector } from "@/utilities/render/vector";

import { getLayout, Layout } from "@/core/render/layout";
import { canvas, isInitialized } from "@/core/render/context";
import { beginPass, endPass } from "@/core/render/render";
import { RenderPass } from "@/core/render/render-pass";

// import type { Drawable } from "@/core/component";
import { Container } from "@/core/component/container";
import { ComponentGeometry } from "@/core/component/component-2d";

class App extends Container {

    private static readonly screenResolutionBuffer = new BufferedStruct("screen-resolution", { resolution: StructType.Vector.vec2 });
    private static readonly screenBindGroup = getLayout(Layout.Screen).createBindGroup({ resolution: { buffer: App.screenResolutionBuffer } });

    private gestureTarget: GestureTarget;

    public override geometry: ComponentGeometry;

    constructor() {
        super();

        this.gestureTarget = new GestureTarget(canvas);

        this.geometry = {
            size: { width: canvas.width, height: canvas.height },
            position: { x: 0, y: 0 }
        };

        canvas.addEventListener("resize", () => {
            const { width, height } = canvas;

            console.log("[DBG] App resized:", width, height);
            
            // 更新版面
            this.setGeometry({
                size: { width, height },
                position: { x: 0, y: 0 }
            });

            // 更新 Buffer 中的解析度
            App.screenResolutionBuffer.set(
                "resolution", 
                vector(canvas.width, canvas.height)
            )
        });
    }
    
    // 實作 EventTarget 接口

    public addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void {
        this.gestureTarget.addEventListener(type, callback, options);
    }
    public dispatchEvent(event: Event): boolean {
        return this.gestureTarget.dispatchEvent(event);
    }
    public removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void {
        this.gestureTarget.removeEventListener(type, callback, options);
    }

    // 重寫 Drawable 方法

    public override render(): void {
        // 渲染介面

        beginPass({
            label: RenderPass.component2D,
            colorAttachments: ["canvas"],
            defaultBindGroups: [App.screenBindGroup]
        });

        super.render();

        endPass();
    }

    public override update(deltatime: number): void {
        super.update(deltatime);
    }

    // 重寫 Component2D、Container 方法

    public override getGeometry(): ComponentGeometry {
        return this.geometry;
    }

    public override drawAppearance(): void {
        super.drawAppearance(); // 清理畫布

        console.log("[DBG] Drawing App appearance...");

        const { width, height } = this.getGeometry().size;

        this.context.fillStyle = "magenta"; // 設定背景顏色
        this.context.fillRect(0, 0, width, height); // 填充背景

        this.context.fillStyle = "cyan";
        this.context.fillRect(0, 0, width / 2, height / 2); // 在左上角填充藍色矩形

        this.context.fillStyle = "yellow";
        this.context.fillRect(width / 2, height / 2, width / 2, height / 2); // 在右下角填充綠色矩形

        this.context.fillStyle = "white";
        this.context.beginPath();
        this.context.arc(width / 2, height / 2, 50, 0, Math.PI * 2); // 在中心繪製白色圓形
        this.context.fill(); // 填充圓形
    }

}

const appProxy = delay<App>("App not initialized");
const { proxy: app } = appProxy;

function initApp() {
    if (appProxy.value !== null)
        throw new Error("App already initialized");

    if (!isInitialized())
        throw new Error("Render context not initialized");

    const appInstance = new App();
    appProxy.set(appInstance);

    return app;
}

export { app, initApp };
export type { App };