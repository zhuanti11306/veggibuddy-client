import { vector } from "@/utilities/render/vector";
import { VertexArray, VertexDescriptor } from "@/utilities/render/vertex-array";
import * as VertexType from "@/utilities/render/vertex-property-type";

export const DefaultVertexDescriptor = {
    position: VertexType.Vector.float32x2,
} satisfies VertexDescriptor;

export const fullScreenVertex = VertexArray.createRegisteredVertexArray("quadrilateral", DefaultVertexDescriptor, [
    // 第一個三角形
    { position: vector(-1, -1) },
    { position: vector(1, -1) },
    { position: vector(-1, 1) },
    // 第二個三角形
    { position: vector(1, -1) },
    { position: vector(1, 1) },
    { position: vector(-1, 1) }
]);

export const fullscreenTriangleVertex = VertexArray.createRegisteredVertexArray("fullscreen-triangle", DefaultVertexDescriptor, [
    { position: vector(-1, -1) },
    { position: vector(-1, 3) },
    { position: vector(3, -1) }
]);