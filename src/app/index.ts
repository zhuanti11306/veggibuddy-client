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
import { Container, ContainerStyle } from "@/core/component/container";
import { ComponentGeometry } from "@/core/component/component-2d";
import { Label } from "@/core/component/label";
import { BoxLayoutAlignment, BoxLayoutAxis, BoxLayoutJustify } from "@/core/component/box-layout";
import { OptionalStyle } from "@/core/component/styled-component";
import { ImageSource } from "@/utilities/style/url";

import backGroundImage from "./background-test.png?url";

class App extends Container {

    private static readonly screenResolutionBuffer = new BufferedStruct("screen-resolution", { resolution: StructType.Vector.vec2 });
    private static readonly screenBindGroup = getLayout(Layout.Screen).createBindGroup({ resolution: { buffer: App.screenResolutionBuffer } });

    private gestureTarget: GestureTarget;
    private newCanvasSize: { width: number, height: number } = { width: 0, height: 0 };

    public override geometry: ComponentGeometry;

    constructor() {
        const horizontal = (style?: Exclude<OptionalStyle<ContainerStyle>, "layout">) => ({
            layout: <const>{
                type: "box",
                axis: BoxLayoutAxis.horizontal,
                align: BoxLayoutAlignment.stretch,
                justify: BoxLayoutJustify.spaceBetween
            },

            ...style
        });

        const vertical = (style?: Exclude<OptionalStyle<ContainerStyle>, "layout">) => ({
            layout: <const>{
                type: "box",
                axis: BoxLayoutAxis.vertical,
                align: BoxLayoutAlignment.stretch,
                justify: BoxLayoutJustify.spaceBetween
            },

            ...style
        });

        const backgound = new ImageSource(backGroundImage);
        backgound.load().then(
            () => this.redraw(),
            () => this.setStyle({ background: { color: "white" }})
        );

        super(horizontal({ background: { image: backgound, color: "white" } }), [
            new Container(vertical(), [
                new Label("Top Left"),
                new Label("Bottom Left")
            ]),
            new Container(vertical(), [
                new Label("Top Right"),
                new Label("Bottom Right")
            ])
        ]);

        this.gestureTarget = new GestureTarget(canvas);

        this.geometry = {
            size: { width: canvas.width, height: canvas.height },
            position: { x: 0, y: 0 }
        };

        canvas.addEventListener("resize", () => {
            const { width, height } = canvas;

            console.log("[DBG] App resized:", width, height);

            this.newCanvasSize = { width, height };
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

    public override update(deltatime: number): void {

        // 更新畫布大小
        if (this.newCanvasSize.width !== 0 && this.newCanvasSize.height !== 0) {
            const { width, height } = this.newCanvasSize;

            canvas.width = width;
            canvas.height = height;

            // 更新幾何體大小
            const geometry = structuredClone(this.geometry);
            geometry.size = { width, height };
            this.setGeometry(geometry);

            // 更新屏幕解析度緩衝區
            App.screenResolutionBuffer.set("resolution", vector(width, height));

            this.newCanvasSize = { width: 0, height: 0 }; // 重置新大小
        }

        super.update(deltatime);
    }

    public override render(): void {
        // 渲染介面

        beginPass({
            label: RenderPass.component2D,
            colorAttachments: ["canvas"],
            defaultBindGroups: [App.screenBindGroup],
        });

        super.render();

        endPass();
    }

    // 重寫 Component2D、Container 方法

    public override getGeometry(): ComponentGeometry {
        return this.geometry;
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