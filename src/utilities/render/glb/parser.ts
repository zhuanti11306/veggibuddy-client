// import { enumerate, zip } from "@/utilities/itertools";

const HEADER_SIZE = 12; // GLB header size in bytes
const CHUNK_HEADER_SIZE = 8; // Chunk header size in bytes

const enum GLBChunkType {
    JSON = 0x4E4F534A,
    BIN = 0x004E4942,
    UNKNOWN = -1
}

const enum SamplerFilter {
    NEAREST = 9728,
    LINEAR = 9729,
    NEAREST_MIPMAP_NEAREST = 9984,
    LINEAR_MIPMAP_NEAREST = 9985,
    NEAREST_MIPMAP_LINEAR = 9986,
    LINEAR_MIPMAP_LINEAR = 9987
}

const enum SamplerWrapMode {
    CLAMP_TO_EDGE = 33071,
    MIRRORED_REPEAT = 33648,
    REPEAT = 10497
}

const enum AccessorComponentType {
    BYTE = 5120,
    UNSIGNED_BYTE = 5121,
    SHORT = 5122,
    UNSIGNED_SHORT = 5123,
    UNSIGNED_INT = 5125,
    FLOAT = 5126
    // DOUBLE = 5130
}

const enum AccessorType {
    SCALAR = "SCALAR",
    VEC2 = "VEC2",
    VEC3 = "VEC3",
    VEC4 = "VEC4",
    MAT2 = "MAT2",
    MAT3 = "MAT3",
    MAT4 = "MAT4"
}

const enum BufferViewTarget {
    ARRAY_BUFFER = 34962, // WebGL2: 34962, WebGL1: 34962
    ELEMENT_ARRAY_BUFFER = 34963 // WebGL2: 34963, WebGL1: 34963
}

type GLTF = {
    asset: {
        version: string;
    },

    buffers?: {
        uri?: string; // Optional URI for external binary data
        byteLength: number; // Length of the buffer in bytes
    }[];

    bufferViews?: {
        buffer: number;
        byteOffset?: number; // Optional byte offset within the buffer
        byteLength: number; // Length of the buffer view in bytes
        byteStride?: number; // Optional byte stride for interleaved data
        target?: BufferViewTarget; // Optional target for the buffer view
    }[];

    accessors?: {
        bufferView?: number;
        byteOffset?: number; 
        componentType: AccessorComponentType;
        normalized?: boolean;
        count: number;
        type: AccessorType;
        max?: number[];
        min?: number[];
        sparse?: {
            count: number;
            indices: {
                bufferView: number;
                byteOffset?: number;
                componentType: AccessorComponentType.UNSIGNED_BYTE | AccessorComponentType.UNSIGNED_SHORT | AccessorComponentType.UNSIGNED_INT;
            };
            values: {
                bufferView: number;
                byteOffset?: number;
            };
        };
    };

    images?: {
        uri?: string; // Optional URI for external image data
        bufferView?: number; // Optional buffer view index for embedded image data
        mimeType?: string; // Optional MIME type of the image
    }[];

    samplers?: {
        magFilter?: SamplerFilter.NEAREST | SamplerFilter.LINEAR,
        minFilter?: SamplerFilter;
        wrapS?: SamplerWrapMode;
        wrapT?: SamplerWrapMode;
    }[];

    textures?: {
        sampler: number; // sampler index
        source: number; // image index
    }[];
}

export class GLBModel {
    public static async fromURL(url: string): Promise<GLBModel> {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`Failed to fetch GLB file from ${url}: ${response.statusText}`);
        
        const arrayBuffer = await response.arrayBuffer();
        return GLBModel.fromArrayBuffer(arrayBuffer);
    }

    public static fromArrayBuffer(arrayBuffer: ArrayBuffer): GLBModel {
        let gltf: GLTF | null = null;
        let binaries: ArrayBuffer[] = [];

        // Validate GLB header
        if (arrayBuffer.byteLength < 12)
            throw new Error("Invalid GLB file: Data too short for header");

        const headerView = new DataView(arrayBuffer, 0, HEADER_SIZE);
        const magic = headerView.getUint32(0, true);
        const version = headerView.getUint32(4, true);
        const length = headerView.getUint32(8, true);

        console.log(arrayBuffer);

        if (magic !== 0x46546C67) // 'glTF' in ASCII
            throw new Error("Invalid GLB format: Invalid magic number");

        if (version !== 2)
            throw new Error(`Unsupported GLB version: ${version}`);

        if (length !== arrayBuffer.byteLength)
            throw new Error(`GLB length mismatch: expected ${length}, got ${arrayBuffer.byteLength}`);

        // Parse chunks
        let offset = HEADER_SIZE; // Start after the header

        while (offset < arrayBuffer.byteLength) {
            if (offset + CHUNK_HEADER_SIZE > arrayBuffer.byteLength)
                throw new Error("Invalid GLB file: Incomplete chunk header");

            const chunkHeaderView = new DataView(arrayBuffer, offset, CHUNK_HEADER_SIZE);
            const chunkLength = chunkHeaderView.getUint32(0, true);
            const chunkType = chunkHeaderView.getUint32(4, true);

            if (chunkLength < 0)
                throw new Error("Invalid GLB file: Negative chunk length");

            const chunkData = arrayBuffer.slice(offset + 8, offset + 8 + chunkLength);

            switch (chunkType) {
                case GLBChunkType.JSON:
                    if (gltf !== null)
                        throw new Error("GLB file contains multiple JSON chunks");
                    gltf = JSON.parse(new TextDecoder().decode(chunkData)) as GLTF;
                    break;
                case GLBChunkType.BIN:
                    binaries.push(chunkData);
                    break;
                default:
                    console.warn(`[DBG] Skipping unknown GLB chunk type: ${chunkType}`);
                    break;
            }

            offset += 8 + chunkLength;
        }

        // Ensure at least one JSON chunk is present
        if (gltf === null)
            throw new Error("GLB file must contain a JSON chunk");

        console.log("[DBG] Parsed GLB Model:", {
            version,
            length,
            jsonChunk: gltf,
            binaryChunks: binaries.map((chunk, index) => ({
                index,
                length: chunk.byteLength
            }))
        });

        // Validate GLTF structure

        if (!gltf.asset || !gltf.asset.version)
            throw new Error("GLB file is missing asset information");

        return null!; // Replace with actual GLBModel construction logic
    }
}
