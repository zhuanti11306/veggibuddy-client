import type { Vector } from "./vector";
import type { AllowDimension } from "./dimension";

const enum ScalarDataType {
    sint32 = "sint32",
    uint32 = "uint32",
    float32 = "float32",

    // Aliases
    sint = sint32,
    uint = uint32,
    float = float32,

    int = sint,
}

const enum VectorScalarType {
    sint8 = "sint8",
    uint8 = "uint8",

    sint16 = "sint16",
    uint16 = "uint16",
    float16 = "float16",

    sint32 = ScalarDataType.sint32,
    uint32 = ScalarDataType.uint32,
    float32 = ScalarDataType.float32,

    // Aliases
    sint = sint32,
    uint = uint32,
    float = float32,

    int = sint,
}

// 歸一化向量，利用整數表示浮點數
// 有號表示 -1.0 ~ 1.0，無號表示 0.0 ~ 1.0。
const enum VectorNormalizedType {
    unorm8 = "unorm8",
    snorm8 = "snorm8",
    unorm16 = "unorm16",
    snorm16 = "snorm16"
}

const enum VectorSize {
    vec2 = "x2",
    vec3 = "x3",
    vec4 = "x4"
}

const enum VectorDataType {
    // 8-bit
    uint8x2 = VectorScalarType.uint8 + VectorSize.vec2,
    uint8x4 = VectorScalarType.uint8 + VectorSize.vec4,
    sint8x2 = VectorScalarType.sint8 + VectorSize.vec2,
    sint8x4 = VectorScalarType.sint8 + VectorSize.vec4,

    unorm8x2 = VectorNormalizedType.unorm8 + VectorSize.vec2,
    unorm8x4 = VectorNormalizedType.unorm8 + VectorSize.vec4,
    snorm8x2 = VectorNormalizedType.snorm8 + VectorSize.vec2,
    snorm8x4 = VectorNormalizedType.snorm8 + VectorSize.vec4,
    // 16-bit
    uint16x2 = VectorScalarType.uint16 + VectorSize.vec2,
    uint16x4 = VectorScalarType.uint16 + VectorSize.vec4,
    sint16x2 = VectorScalarType.sint16 + VectorSize.vec2,
    sint16x4 = VectorScalarType.sint16 + VectorSize.vec4,

    unorm16x2 = VectorNormalizedType.unorm16 + VectorSize.vec2,
    unorm16x4 = VectorNormalizedType.unorm16 + VectorSize.vec4,
    snorm16x2 = VectorNormalizedType.snorm16 + VectorSize.vec2,
    snorm16x4 = VectorNormalizedType.snorm16 + VectorSize.vec4,

    float16x2 = VectorScalarType.float16 + VectorSize.vec2,
    float16x4 = VectorScalarType.float16 + VectorSize.vec4,
    // 32-bit
    uint32x2 = VectorScalarType.uint32 + VectorSize.vec2,
    uint32x3 = VectorScalarType.uint32 + VectorSize.vec3,
    uint32x4 = VectorScalarType.uint32 + VectorSize.vec4,

    sint32x2 = VectorScalarType.sint32 + VectorSize.vec2,
    sint32x3 = VectorScalarType.sint32 + VectorSize.vec3,
    sint32x4 = VectorScalarType.sint32 + VectorSize.vec4,

    float32x2 = VectorScalarType.float32 + VectorSize.vec2,
    float32x3 = VectorScalarType.float32 + VectorSize.vec3,
    float32x4 = VectorScalarType.float32 + VectorSize.vec4,

    // // Extended - These vector types not supported by WebGPU are implemented as 4D vectors.
    // // 8-bit
    // uint8x3 = VectorScalarType.uint8 + VectorSize.vec3,
    // sint8x3 = VectorScalarType.sint8 + VectorSize.vec3,

    // unorm8x3 = VectorNormalizedType.unorm8 + VectorSize.vec3,
    // snorm8x3 = VectorNormalizedType.snorm8 + VectorSize.vec3,
    // // 16-bit
    // uint16x3 = VectorScalarType.uint16 + VectorSize.vec3,
    // sint16x3 = VectorScalarType.sint16 + VectorSize.vec3,

    // unorm16x3 = VectorNormalizedType.unorm16 + VectorSize.vec3,
    // snorm16x3 = VectorNormalizedType.snorm16 + VectorSize.vec3,

    // float16x3 = VectorScalarType.float16 + VectorSize.vec3,

    // Aliases
    uintx2 = uint32x2,
    uintx3 = uint32x3,
    uintx4 = uint32x4,

    sintx2 = sint32x2,
    sintx3 = sint32x3,
    sintx4 = sint32x4,

    floatx2 = float32x2,
    floatx3 = float32x3,
    floatx4 = float32x4,

    intx2 = sintx2,
    intx3 = sintx3,
    intx4 = sintx4
}


type ScalarType<Key extends string> = Key extends ScalarDataType ? number : never;
type VectorType<Key extends string> = Key extends `${VectorScalarType | VectorNormalizedType}x${infer Dimension extends AllowDimension}` ? Vector<Dimension> : never;

export type { ScalarType, VectorType };
export { ScalarDataType as Scalar, VectorDataType as Vector };

const enum IndexType {
    uint16 = "uint16",
    uint32 = "uint32"
}

export { IndexType as Index };