
import type { AllowDimension } from "./dimension";
import { vector, Vector } from "./vector";

import { VerticesView } from "./vertices-view";

import * as VertexType from "./vertex-property-type";
import type { ScalarType, VectorType } from "./vertex-property-type";

export type VertexDescriptor = {
    [key: string]: VertexType.Scalar | VertexType.Vector | undefined;
}

export type VertexValues<Descriptor extends VertexDescriptor = VertexDescriptor> = {
    [Key in keyof Descriptor]:
    Descriptor[Key] extends VertexType.Scalar ? ScalarType<Descriptor[Key]> :
    Descriptor[Key] extends VertexType.Vector ? VectorType<Descriptor[Key]> :
    never;
}

export type VertexBufferLayout = {
    count: number,
    stepMode: GPUVertexStepMode,
    vertices: (VertexBufferLayoutVertices & { view: VerticesView })[],
    indices?: {
        type: VertexType.Index,
        view: VerticesView
    }
}

export type VertexBufferLayoutVertices<Descriptor extends VertexDescriptor = VertexDescriptor> = {
    stride: number,
    attributes: VertexAttributeMap<Descriptor>,
}

export type VertexAttributeMap<Descriptor extends VertexDescriptor> = { [Key in keyof Descriptor]: VertexAttribute };

export type VertexAttribute = { shaderLocation: number, offset: number, format: (VertexType.Scalar | VertexType.Vector) };

export class VertexArray<Descriptor extends VertexDescriptor = VertexDescriptor> {

    public static readonly registeredVertexArrays: Map<string, VertexArray> = new Map();

    public static createRegisteredVertexArray<Descriptor extends VertexDescriptor>(name: string, descriptor: Descriptor, data: VertexValues<Descriptor>[] | number = [], indices?: number[]): VertexArray<Descriptor> {
        if (VertexArray.registeredVertexArrays.has(name))
            throw new Error(`VertexArray with name ${name} is already registered.`);
        const vertexArray = new VertexArray(name, descriptor, data, indices);
        VertexArray.registeredVertexArrays.set(name, vertexArray);
        return vertexArray;
    }

    public static registerVertexArray<Descriptor extends VertexDescriptor>(name: string, vertexArray: VertexArray<Descriptor>): void {
        if (VertexArray.registeredVertexArrays.has(name))
            throw new Error(`VertexArray with name ${name} is already registered.`);
        VertexArray.registeredVertexArrays.set(name, vertexArray);
    }

    public static getVertexArray<Descriptor extends VertexDescriptor>(name: string): VertexArray<Descriptor> {
        const vertexArray = VertexArray.registeredVertexArrays.get(name);
        if (!vertexArray)
            throw new Error(`VertexArray with name ${name} is not registered.`);
        return vertexArray as VertexArray<Descriptor>;
    }

    public descriptor: Descriptor;
    protected data: VertexValues<Descriptor>[];

    protected indices: { view: VerticesView, type: VertexType.Index } | null = null;

    public readonly label: string;
    public readonly mode: GPUVertexStepMode = "vertex";
    public get vertexCount(): number { return this.data.length; }

    private registeredViews: Map<string | number, VertexBufferLayout> = new Map();

    constructor(label: string, descriptor: Descriptor, data: VertexValues<Descriptor>[] | number = [], indices?: number[]) {
        this.label = label;
        this.descriptor = descriptor;
        this.data = typeof data === "number"
            ? Array(data).fill(VertexArray.getDefaultVertexData(descriptor))
            : Array.from(data);

        if (indices) {
            const maxIndex = Math.max(...indices);
            if (maxIndex >= this.vertexCount)
                throw new RangeError("Index Out Of Range");

            const indexSize = maxIndex > 0xFFFF ? 4 : 2;
            const buffer = new ArrayBuffer(indexSize * indices.length);

            const { view } = this.indices = { view: new VerticesView(buffer), type: null! };

            if (indexSize <= 2) {
                view.setUnsignedShortIntegerArray(0, indices as number[]);
                this.indices.type = VertexType.Index.uint16;
            } else if (indexSize <= 4) {
                view.setUnsignedIntegerArray(0, indices as number[]);
                this.indices.type = VertexType.Index.uint32;
            }
        }
    }

    /**
     * 取得 VertexArray 中指定的頂點資料。
     * 
     * 需要注意的是，如果欲更新頂點資料，應該取得頂點的複製，並使用 set 方法。
     * @see VertexArray.set
     * 
     * @param index 頂點索引。
     * @param clone 是否複製資料，預設為 false。
     * 
     * @returns 指定索引的頂點資料。
     * @throws {RangeError} 當索引超出範圍時拋出錯誤。
     */
    public get(index: number, clone: boolean = false): VertexValues<Descriptor> {
        if (index < 0 || index >= this.vertexCount)
            throw new RangeError("Index Out Of Range");

        const vertex = this.data[index];
        if (!clone)
            // Proxy 無法保護深層資料
            // return new Proxy(vertex, { set() { throw new Error("Cannot modify VertexArray data directly.") } }); 
            return vertex;

        const cloneObject = {} as VertexValues<Descriptor>;

        for (const key in this.descriptor) {
            const value = vertex[key];

            if (typeof value === "number") {
                cloneObject[key] = value as VertexValues<Descriptor>[keyof Descriptor];
            } else if (value instanceof Vector) {
                cloneObject[key] = value.clone() as VertexValues<Descriptor>[keyof Descriptor];
            }
        }

        return cloneObject;
    }

    /**
     * 設定 VertexArray 中指定的頂點資料。
     * 
     * @param index 頂點索引。
     * @param newValue 新的頂點資料。
     */
    public set(index: number, newValue: VertexValues<Descriptor>) {
        if (index < 0 || index >= this.vertexCount)
            throw new RangeError("Index Out Of Range");

        const oldValue = this.data[index];
        this.data[index] = newValue;

        const hasChanged = [];
        for (const key in this.descriptor) {
            if (oldValue[key] !== newValue[key]) {
                hasChanged.push(key);
            }
        }

        for (const { vertices } of this.registeredViews.values()) {
            for (const { attributes, stride, view } of vertices) {
                const vertexPosition = index * stride;
                const vertex = this.data[index];

                for (const propertyKey of hasChanged) {

                    const attribute = attributes[propertyKey];
                    if (!attribute)
                        continue;

                    const propertyPosition = vertexPosition + attribute.offset;
                    const propertyValue = vertex[propertyKey];
                    const propertyType = this.descriptor[propertyKey];

                    this.writeProperty(view, propertyPosition, propertyType, propertyValue);
                }
            }
        }
    }

    /**
     * 取得 VertexArray 的 VerticesView，用於繪製。
     * 取得 VerticesView 時，會一併將 VertexArray 資料寫入。
     * 
     * @param bufferAttributeList 過濾器，若不提供，則會取得所有資料。
     * @returns VerticesView
     */
    public getBufferLayout<Attribute extends (keyof Descriptor)[]>(...bufferAttributeList: Attribute[]): VertexBufferLayout {

        if (bufferAttributeList.length === 0)
            bufferAttributeList = [Array.from(Object.keys(this.descriptor)) as Attribute];

        const layout: VertexBufferLayout = {
            count: this.vertexCount,
            vertices: [],
            stepMode: this.mode
        };

        let shaderLocation = 0;
        for (const attributeNames of bufferAttributeList) {
            const { stride, attributes, nextLocation } = VertexArray.getStrideAndAttributes(this.descriptor, shaderLocation, attributeNames);
            shaderLocation = nextLocation; // 更新 shaderLocation

            const buffer = new ArrayBuffer(this.vertexCount * stride);
            const view = new VerticesView(buffer);

            const vertexBufferInfo = { view, attributes, stride };
            this.writeVertexArray(view, stride, attributes);

            layout.vertices.push(vertexBufferInfo);
        }

        if (this.indices)
            layout.indices = this.indices;

        return layout;
    }

    /**
     * 取得註冊的 VerticesView，當 VertexArray 被更新時，將會自動更新。
     * 若不存在，將自動建立一個新的 VerticesView。
     * 
     * 若已存在，則 properties 會被忽略。
     * 
     * @returns VerticesView
     * @see VertexArray.getBufferLayout
     */
    public getRegisteredLayout(key: string | number, ...attributeNames: (keyof Descriptor)[]): VertexBufferLayout {
        if (this.registeredViews.has(key))
            return this.registeredViews.get(key)!;

        const layout = attributeNames.length ? this.getBufferLayout(attributeNames) : this.getBufferLayout();
        this.registeredViews.set(key, layout);

        return layout;
    }

    /**
     * 取消註冊 VertiesView。
     * 
     * @param key 註冊的 VerticesView 的 key。
     * @returns 是否成功取消註冊。
     */
    public unregisterView(key: string | number): boolean {
        return this.registeredViews.delete(key);
    }

    /**
     * 將 VertexArray 中每一個頂點資料寫入 VerticesView。
     */
    private writeVertexArray(view: VerticesView, stride: number, attributes: VertexAttributeMap<Descriptor>): VerticesView {

        for (let index = 0; index < this.vertexCount; index++) {
            const vertexPosition = index * stride;
            const vertex = this.data[index];

            for (const propertyKey in this.descriptor) {

                const attribute = attributes[propertyKey];
                if (!attribute)
                    continue;

                const propertyOffset = attribute.offset;
                const propertyPosition = vertexPosition + propertyOffset;
                const propertyValue = vertex[propertyKey];
                const propertyType = this.descriptor[propertyKey];

                this.writeProperty(view, propertyPosition, propertyType, propertyValue);
            }
        }

        return view;
    }

    /** 將單一屬性值寫入 VerticesView */
    private writeProperty(view: VerticesView, propertyPosition: number, propertyType: VertexType.Scalar | VertexType.Vector | undefined, propertyValue: VertexValues<Descriptor>[keyof Descriptor]): number {
        switch (propertyType) {
            case undefined:
                return 0; // 忽略未定義的屬性

            case VertexType.Scalar.sint:
                return view.setSignedInteger(propertyPosition, propertyValue as number);
            case VertexType.Scalar.uint:
                return view.setUnsignedInteger(propertyPosition, propertyValue as number);
            case VertexType.Scalar.float:
                return view.setFloatNumber(propertyPosition, propertyValue as number);

            case VertexType.Vector.sint8x2:
            // case VertexType.Vector.sint8x3:
            case VertexType.Vector.sint8x4:
                return view.setSignedByteVector(propertyPosition, propertyValue as Vector<AllowDimension>);

            case VertexType.Vector.uint8x2:
            // case VertexType.Vector.uint8x3:
            case VertexType.Vector.uint8x4:
                return view.setUnsignedByteVector(propertyPosition, propertyValue as Vector<AllowDimension>);

            case VertexType.Vector.sint16x2:
            // case VertexType.Vector.sint16x3:
            case VertexType.Vector.sint16x4:
                return view.setSignedShortIntegerVector(propertyPosition, propertyValue as Vector<AllowDimension>);

            case VertexType.Vector.uint16x2:
            // case VertexType.Vector.uint16x3:
            case VertexType.Vector.uint16x4:
                return view.setUnsignedShortIntegerVector(propertyPosition, propertyValue as Vector<AllowDimension>);

            case VertexType.Vector.sint32x2:
            case VertexType.Vector.sint32x3:
            case VertexType.Vector.sint32x4:
                return view.setSignedIntegerVector(propertyPosition, propertyValue as Vector<AllowDimension>);

            case VertexType.Vector.uint32x2:
            case VertexType.Vector.uint32x3:
            case VertexType.Vector.uint32x4:
                return view.setUnsignedIntegerVector(propertyPosition, propertyValue as Vector<AllowDimension>);

            case VertexType.Vector.float16x2:
            // case VertexType.Vector.float16x3:
            case VertexType.Vector.float16x4:
                return view.setHalfPrecisionVector(propertyPosition, propertyValue as Vector<AllowDimension>);

            case VertexType.Vector.float32x2:
            // case VertexType.Vector.float32x3:
            case VertexType.Vector.float32x4:
                return view.setSinglePrecisionVector(propertyPosition, propertyValue as Vector<AllowDimension>);

            case VertexType.Vector.snorm8x2:
            // case VertexType.Vector.snorm8x3:
            case VertexType.Vector.snorm8x4:
                return view.setNormalizedSignedByteVector(propertyPosition, propertyValue as Vector<AllowDimension>);

            case VertexType.Vector.unorm8x2:
            // case VertexType.Vector.unorm8x3:
            case VertexType.Vector.unorm8x4:
                return view.setNormalizedUnsignedByteVector(propertyPosition, propertyValue as Vector<AllowDimension>);

            case VertexType.Vector.snorm16x2:
            // case VertexType.Vector.snorm16x3:
            case VertexType.Vector.snorm16x4:
                return view.setNormalizedSignedShortIntegerVector(propertyPosition, propertyValue as Vector<AllowDimension>);

            case VertexType.Vector.unorm16x2:
            // case VertexType.Vector.unorm16x3:
            case VertexType.Vector.unorm16x4:
                return view.setNormalizedUnsignedShortIntegerVector(propertyPosition, propertyValue as Vector<AllowDimension>);

            default:
                throw new Error("Invalid Data Type");
        }
    }

    /** 計算頂點資料的步輻及屬性的偏移量 */
    public static getStrideAndAttributes<Descriptor extends VertexDescriptor>(descriptor: Descriptor, startLocation: number = 0, properties?: (keyof Descriptor)[]): { stride: number, attributes: VertexAttributeMap<Descriptor>, nextLocation: number } {
        const attributes = {} as VertexAttributeMap<Descriptor>;
        let stride = 0;

        let index = startLocation; // shaderLocation
        for (const [key, format] of Object.entries(descriptor)) {

            if (properties && !properties.includes(key as keyof Descriptor))
                continue;

            if (format === undefined)
                continue;

            attributes[key as keyof Descriptor] = { shaderLocation: index++, offset: stride, format };

            switch (format) {
                case VertexType.Vector.sint8x2:
                case VertexType.Vector.uint8x2:
                case VertexType.Vector.snorm8x2:
                case VertexType.Vector.unorm8x2:
                    stride += 2;
                    break;

                // case VertexType.Vector.sint8x3:
                // case VertexType.Vector.uint8x3:
                // case VertexType.Vector.snorm8x3:
                // case VertexType.Vector.unorm8x3:
                case VertexType.Vector.sint8x4:
                case VertexType.Vector.uint8x4:
                case VertexType.Vector.snorm8x4:
                case VertexType.Vector.unorm8x4:
                case VertexType.Vector.sint16x2:
                case VertexType.Vector.uint16x2:
                case VertexType.Vector.snorm16x2:
                case VertexType.Vector.unorm16x2:
                case VertexType.Vector.float16x2:
                case VertexType.Scalar.sint32:
                case VertexType.Scalar.uint32:
                case VertexType.Scalar.float:
                    stride += 4;
                    break;

                // case VertexType.Vector.sint16x3:
                // case VertexType.Vector.uint16x3:
                // case VertexType.Vector.snorm16x3:
                // case VertexType.Vector.unorm16x3:
                // case VertexType.Vector.float16x3:
                case VertexType.Vector.sint16x4:
                case VertexType.Vector.uint16x4:
                case VertexType.Vector.snorm16x4:
                case VertexType.Vector.unorm16x4:
                case VertexType.Vector.float16x4:
                case VertexType.Vector.sint32x2:
                case VertexType.Vector.uint32x2:
                case VertexType.Vector.float32x2:
                    stride += 8;
                    break;

                case VertexType.Vector.sint32x3:
                case VertexType.Vector.uint32x3:
                case VertexType.Vector.float32x3:
                    stride += 12;
                    break;

                case VertexType.Vector.sint32x4:
                case VertexType.Vector.uint32x4:
                case VertexType.Vector.float32x4:
                    stride += 16;
                    break;
            }

        }

        return { stride, attributes, nextLocation: index };
    }

    /** 取得給定結構描述的預設值 */
    public static getDefaultVertexData<Descriptor extends VertexDescriptor>(descriptor: Descriptor): VertexValues<Descriptor> {
        const data = {} as VertexValues<Descriptor>;

        for (const key in descriptor) {

            switch (descriptor[key]) {
                case VertexType.Scalar.sint:
                case VertexType.Scalar.uint:
                case VertexType.Scalar.float:
                    data[key] = 0 as VertexValues<Descriptor>[keyof Descriptor];
                    break;
                case VertexType.Vector.sint8x2:
                case VertexType.Vector.sint16x2:
                case VertexType.Vector.sint32x2:
                case VertexType.Vector.uint8x2:
                case VertexType.Vector.uint16x2:
                case VertexType.Vector.uint32x2:
                case VertexType.Vector.snorm8x2:
                case VertexType.Vector.snorm16x2:
                case VertexType.Vector.unorm8x2:
                case VertexType.Vector.unorm16x2:
                case VertexType.Vector.float16x2:
                case VertexType.Vector.float32x2:
                    data[key] = vector(0, 0) as VertexValues<Descriptor>[keyof Descriptor];
                    break;

                // case VertexType.Vector.sint8x3:
                // case VertexType.Vector.sint16x3:
                case VertexType.Vector.sint32x3:
                // case VertexType.Vector.uint8x3:
                // case VertexType.Vector.uint16x3:
                case VertexType.Vector.uint32x3:
                // case VertexType.Vector.snorm8x3:
                // case VertexType.Vector.snorm16x3:
                // case VertexType.Vector.unorm8x3:
                // case VertexType.Vector.unorm16x3:
                // case VertexType.Vector.float16x3:
                case VertexType.Vector.float32x3:
                    data[key] = vector(0, 0, 0) as VertexValues<Descriptor>[keyof Descriptor];
                    break;

                case VertexType.Vector.sint8x4:
                case VertexType.Vector.sint16x4:
                case VertexType.Vector.sint32x4:
                case VertexType.Vector.uint8x4:
                case VertexType.Vector.uint16x4:
                case VertexType.Vector.uint32x4:
                case VertexType.Vector.snorm8x4:
                case VertexType.Vector.snorm16x4:
                case VertexType.Vector.unorm8x4:
                case VertexType.Vector.unorm16x4:
                case VertexType.Vector.float16x4:
                case VertexType.Vector.float32x4:
                    data[key] = vector(0, 0, 0, 0) as VertexValues<Descriptor>[keyof Descriptor];
                    break;
            }
        }

        return data;
    }
}