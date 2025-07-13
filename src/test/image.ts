import { Drawable } from "@/core/component";
import { draw } from "@/core/render/render";

import shaderRaw from "./image.wgsl?raw";
import { ShaderModule } from "@/utilities/render/shader-module";
import { Pipeline } from "@/utilities/render/pipeline";
import { DefaultVertexDescriptor } from "@/core/render/vertex";
import { createURLTexture } from "@/utilities/render/texture";
import { BindGroupLayout } from "@/utilities/render/bind-group";
import { getSampler, Sampler } from "@/core/render/sampler";

const imageTexture = createURLTexture("", {
    url: "https://webgpufundamentals.org/webgpu/lessons/resources/kiana.png",
    size: [128, 128],
    flipY: true
});

const textureLayout = new BindGroupLayout("Test Image Layout", {
    entries: [
        {
            key: "texture",
            category: "texture",
            visibility: GPUShaderStage.FRAGMENT,
        },
        {
            key: "sampler",
            category: "sampler",
            type: "filtering",
            visibility: GPUShaderStage.FRAGMENT,
        }
    ] as const
});

const textureGroup = textureLayout.createBindGroup({
    sampler: getSampler(Sampler.Nearest),
    texture: imageTexture
});

setTimeout(() => {console.log("[DBG] Image Start Load"), imageTexture.load()}, 1000);
// 延遲載入圖片，以檢視圖片前後是否符合預期
let debug_imageHasLoaded = false;

export const image = new class implements Drawable {
    private shaderModule: ShaderModule = new ShaderModule("Test Image Shader", shaderRaw);
    private pipeline: Pipeline = new Pipeline("Test Image", {
        vertex: [DefaultVertexDescriptor],
        layout: [textureLayout],
        shader: {
            vertex: {
                module: this.shaderModule,
                entryPoint: "vertex_main"
            },
            fragment: {
                module: this.shaderModule,
                entryPoint: "fragment_main"
            }
        }
    });

    public render() {
        if (imageTexture.isLoaded !== debug_imageHasLoaded) {
            debug_imageHasLoaded = imageTexture.isLoaded;
            console.log("[DBG] Image loaded: ", imageTexture.isLoaded);
        }

        draw({
            pipeline: this.pipeline,
            buffer: "fullscreen-triangle",
            bindGroups: [textureGroup],
        });
    }
}