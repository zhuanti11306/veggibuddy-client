import { getCurrentPass, draw } from "@/core/render/render";
import { Layout } from "@/core/render/layout";

import { Drawable } from "@/core/component";

import { vector } from "@/utilities/render/vector";
import { identity, matrix } from "@/utilities/render/matrix";

import { VertexArray, VertexDescriptor, VertexValues } from "@/utilities/render/vertex-array";
import * as VertexType from "@/utilities/render/vertex-property-type";

import { BufferedStruct } from "@/utilities/render/struct";
import * as StructType from "@/utilities/render/struct-property-type";

import { BindGroupLayout } from "@/utilities/render/bind-group";
import { Pipeline } from "@/utilities/render/pipeline";
import { ShaderModule } from "@/utilities/render/shader-module";

import shaderRaw from "./triangle.wgsl?raw";

const triangleLayout = new BindGroupLayout("triangle", {
    entries: [
        {
            category: "buffer",
            type: "uniform",
            key: "screenUniform",
            visibility: GPUShaderStage.VERTEX
        }
    ] as const
});

const triangleUniform = new BufferedStruct("triangle", {
    transform: StructType.Matrix.mat2x2,
}, {
    transform: identity(2)
});

const triangleBindGroup = triangleLayout.createBindGroup({
    screenUniform: {
        buffer: triangleUniform
    }
});

const triangleVertexDescription = {
    position: VertexType.Vector.float32x2,
    color: VertexType.Vector.unorm8x4,
} satisfies VertexDescriptor;

const triangleVertexData: VertexValues<typeof triangleVertexDescription>[] = [
    {
        position: vector(0, 1),
        color: vector(1, 1, 0, 1)
    },
    {
        position: vector(-Math.sqrt(3) / 2, -0.5),
        color: vector(1, 0, 1, 1)
    },
    {
        position: vector(Math.sqrt(3) / 2, -0.5),
        color: vector(0, 1, 1, 1)
    }
];

triangleVertexData[0].position.scaleWith(0.75);
triangleVertexData[1].position.scaleWith(0.75);
triangleVertexData[2].position.scaleWith(0.75);

const vertexArray = new VertexArray("Test Triangle", triangleVertexDescription, triangleVertexData);
const vertexView = vertexArray.getBufferLayout();

console.log('[DBG]', vertexView); // [DBG] 顯示頂點資料
// console.log('[DBG]', shaderRaw); // [DBG] 顯示 shader 原始碼

// import { add } from "@/utilities/render/vector";
// const debug_v = triangleVertexData.reduce((sum, { position: current }) => add(sum, current), vector(0, 0));
// console.log(debug_v.data); // [DBG] 顯示向量和

export const triangle = new class Triangle implements Drawable {

    private shaderModule: ShaderModule = new ShaderModule("Test Triangle Shader", shaderRaw);

    private pipeline: Pipeline = new Pipeline("Test Triangle", {
        layout: [Layout.Screen, triangleLayout],
        vertex: [triangleVertexDescription],
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


    private rotation: number = 0;


    public update(deltatime: number): void {
        this.rotation = (this.rotation + deltatime / 1000 * 45) % 360;
        const radian = this.rotation * Math.PI / 180;

        const rotationMatrix = matrix(2, 2, [
            Math.cos(radian), Math.sin(radian),
            -Math.sin(radian), Math.cos(radian)
        ]);

        triangleUniform.set("transform", rotationMatrix);
    }

    public render() {
        const currentPass = getCurrentPass();
        if (currentPass?.label !== "test")
            return; // 只在測試階段渲染

        draw({
            pipeline: this.pipeline,
            buffer: vertexView,
            bindGroups: [
                null, // screenUniform,
                triangleBindGroup
            ]
        });
    }
}