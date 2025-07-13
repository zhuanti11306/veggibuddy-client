import { StructedView, StructedViewSupport } from "./structed-view";

import type { ScalarType } from "./scalar";

import type { VectorType } from "./vector";
import { Vector, zero as zeroVector } from "./vector";

import type { MatrixType } from "./matrix";
import { Matrix, zero as zeroMatrix } from "./matrix";
import * as StructType from "./struct-property-type";

export type StructDescriptor = {
    [key: string]: StructType.Scalar | StructType.Vector | StructType.Matrix | StructDescriptor;
}

export type StructValues<Properties extends StructDescriptor> = {
    [Key in keyof Properties]:
    Properties[Key] extends StructType.Scalar ? ScalarType<Properties[Key]> :
    Properties[Key] extends StructType.Vector ? VectorType<Properties[Key]> :
    Properties[Key] extends StructType.Matrix ? MatrixType<Properties[Key]> :
    Properties[Key] extends StructDescriptor ? Struct<Properties[Key]> :
    never;
}

export class Struct<Descriptor extends StructDescriptor> implements StructedViewSupport {
    private descriptor: Descriptor;
    private data: StructValues<Descriptor>;

    protected alignment: number;
    protected size: number;
    protected offsets: { [Key in keyof Descriptor]: number };

    constructor(descriptor: Descriptor, data?: StructValues<Descriptor>) {
        this.descriptor = descriptor;
        this.data = data ?? Struct.getDefaultValue(descriptor);

        // max(AlignOfMember(S,1), ... , AlignOfMember(S,N))
        this.alignment = 0;
        this.size = 0;
        this.offsets = {} as { [Key in keyof Descriptor]: number };
        for (const key in this.descriptor) {
            const value = this.data[key];
            let alignment = 0;
            let size = 0;

            if (typeof value === "number") {
                alignment = 4; // Float32Array.BYTES_PER_ELEMENT, Uint32Array.BYTES_PER_ELEMENT, Int32Array.BYTES_PER_ELEMENT
                size = 4;
            } else if (value instanceof Vector) {
                alignment = value.getAlignment();
                size = value.getSize();
            } else if (value instanceof Matrix) {
                alignment = value.getAlignment();
                size = value.getSize();
            } else if (value instanceof Struct) {
                alignment = value.getAlignment();
                size = value.getSize();
            }

            this.size += (alignment - (this.size % alignment)) % alignment; // 對齊
            this.offsets[key] = this.size; // 儲存偏移量
            this.size += size; // 累加大小
            this.alignment = Math.max(this.alignment, alignment); // 更新對齊
        }

        this.size = Math.ceil(this.size / this.alignment) * this.alignment; // 留白
    }

    /**
     * 取得指定的屬性。
     * @param key 屬性的名稱。
     * @returns 屬性的值。
     */
    public get<Key extends keyof Descriptor>(key: Key): StructValues<Descriptor>[Key] {
        return this.data[key];
    }

    /**
     * 設定指定的屬性。
     * @param key 屬性的名稱。
     * @param value 屬性的值。
     */
    public set<Key extends keyof Descriptor>(key: Key, value: StructValues<Descriptor>[Key]) {
        const currentValue = this.data[key];
        const valueType = this.descriptor[key];

        switch (valueType) {
            case StructType.Scalar.int:
            case StructType.Scalar.uint:
            case StructType.Scalar.float:
                if (currentValue == value) return;
                break;
            case StructType.Vector.vec2:
            case StructType.Vector.vec3:
            case StructType.Vector.vec4:
                if (Vector.isEqual(currentValue as Vector, value as Vector)) return;
                break;
            case StructType.Matrix.mat2x2:
            case StructType.Matrix.mat2x3:
            case StructType.Matrix.mat2x4:
            case StructType.Matrix.mat3x2:
            case StructType.Matrix.mat3x3:
            case StructType.Matrix.mat3x4:
            case StructType.Matrix.mat4x2:
            case StructType.Matrix.mat4x3:
            case StructType.Matrix.mat4x4:
                if (Matrix.isEqual(currentValue as Matrix, value as Matrix)) return;
                break;
        }

        this.data[key] = value;
    }

    /**
     * 取得資料的對齊步長。
     * @returns 資料的對齊步長。
     */
    public getAlignment(): number {
        return this.alignment;
    }

    /**
     * 取得資料的大小。
     * @returns 資料的大小。
     */
    public getSize(): number {
        return this.size;
    }

    /**
     * 將資料寫入指定的位置。
     * @param view 資料寫入的目標。
     * @param offset 資料寫入的位置。
     * @returns 寫入的資料長度。
     */
    public writeStructedView(view: StructedView, offset: number): number {
        for (const key in this.descriptor) {
            const propertyOffset = this.offsets[key] + offset;
            this.writeProperty(view, propertyOffset, key);
        }

        return this.size;
    }

    protected writeProperty(view: StructedView, offset: number, key: keyof Descriptor): void {
        const typeName = this.descriptor[key];
        const value = this.data[key];

        if (typeof value === "number") {
            switch (typeName) {
                case StructType.Scalar.int:
                    view.setSignedInteger(offset, value);
                    break;
                case StructType.Scalar.uint:
                    view.setUnsignedInteger(offset, value);
                    break;
                case StructType.Scalar.float:
                    view.setFloatNumber(offset, value);
                    break;
                default:
                    throw new Error("Invalid Scalar Type");
            }
        } else if (value instanceof Vector) {
            value.writeStructedView(view, offset);
        } else if (value instanceof Matrix) {
            value.writeStructedView(view, offset);
        } else if (value instanceof Struct) {
            value.writeStructedView(view, offset);
        }
    }

    /**
     * 取得子結構。
     * 更改子結構時會影響原始結構。
     * 更改原始結構也會影響子結構。
     * 
     * @param keys 子結構的屬性。
     * @returns 子結構。 
     */
    public getSubStruct<Keys extends (keyof Descriptor)[]>(keys: Keys): Struct<Pick<Descriptor, Keys[number]>> {
        const descriptor = {} as Pick<Descriptor, Keys[number]>;

        for (const key of keys) {
            descriptor[key] = this.descriptor[key];
        }

        return new Struct(descriptor, this.data);
    }

    /**
     * 取得複製的子結構。
     * 更改子結構不會影響原始結構。
     * 更改原始結構也不會影響子結構。
     * 
     * @param deep 是否深層複製。 // Not implemented yet. 
     * @returns 子結構。
     */
    public getClonedStruct(deep: boolean): Struct<Descriptor>;

    /**
     * 取得複製的子結構。
     * 更改子結構不會影響原始結構。
     * 更改原始結構也不會影響子結構。
     * 
     * @param deep 是否深層複製。
     * @param keys 子結構的屬性。
     * @returns 子結構。
     */
    public getClonedStruct<Keys extends (keyof Descriptor)[]>(deep: boolean, keys: Keys): Struct<Pick<Descriptor, Keys[number]>>;
    public getClonedStruct<Keys extends (keyof Descriptor)[]>(deep: boolean, keys?: Keys): Struct<Pick<Descriptor, Keys[number]>> {
        if (keys === undefined)
            return new Struct(this.descriptor, deep ? this.deepClone(this.data) : this.data);

        const descriptor = {} as Pick<Descriptor, Keys[number]>;
        const data = {} as StructValues<Pick<Descriptor, Keys[number]>>;

        for (const key of keys) {
            descriptor[key] = this.descriptor[key];
            data[key] = deep ? this.deepCloneValue(this.data[key]) : this.data[key];
        }

        return new Struct(descriptor, data);
    }

    private deepCloneValue<T>(value: T): T {
        if (typeof value === "number") {
            return value;
        } else if (value instanceof Vector) {
            return value.clone() as T;
        } else if (value instanceof Matrix) {
            return value.clone() as T;
        } else if (value instanceof Struct) {
            return value.getClonedStruct(true) as T;
        }
        throw new Error("Unsupported type for deep clone");
    }

    private deepClone(data: StructValues<Descriptor>): StructValues<Descriptor> {
        const cloned: StructValues<Descriptor> = {} as StructValues<Descriptor>;
        for (const key in data) {
            cloned[key] = this.deepCloneValue(data[key]);
        }
        return cloned;
    }

    private static getDefaultValue<Descriptor extends StructDescriptor>(descriptor: Descriptor): StructValues<Descriptor> {
        const data: StructValues<Descriptor> = {} as StructValues<Descriptor>;

        for (const key in descriptor) {
            switch (descriptor[key]) {
                case StructType.Scalar.int:
                case StructType.Scalar.uint:
                case StructType.Scalar.float:
                    data[key] = 0 as StructValues<Descriptor>[typeof key];
                    break;

                case StructType.Vector.vec2:
                    data[key] = zeroVector(2) as StructValues<Descriptor>[typeof key];
                    break;
                case StructType.Vector.vec3:
                    data[key] = zeroVector(3) as StructValues<Descriptor>[typeof key];
                    break;
                case StructType.Vector.vec4:
                    data[key] = zeroVector(4) as StructValues<Descriptor>[typeof key];
                    break;

                case StructType.Matrix.mat2x2:
                    data[key] = zeroMatrix(2, 2) as StructValues<Descriptor>[typeof key];
                    break;
                case StructType.Matrix.mat2x3:
                    data[key] = zeroMatrix(2, 3) as StructValues<Descriptor>[typeof key];
                    break;
                case StructType.Matrix.mat2x4:
                    data[key] = zeroMatrix(2, 4) as StructValues<Descriptor>[typeof key];
                    break;
                case StructType.Matrix.mat3x2:
                    data[key] = zeroMatrix(3, 2) as StructValues<Descriptor>[typeof key];
                    break;
                case StructType.Matrix.mat3x3:
                    data[key] = zeroMatrix(3, 3) as StructValues<Descriptor>[typeof key];
                    break;
                case StructType.Matrix.mat3x4:
                    data[key] = zeroMatrix(3, 4) as StructValues<Descriptor>[typeof key];
                    break;
                case StructType.Matrix.mat4x2:
                    data[key] = zeroMatrix(4, 2) as StructValues<Descriptor>[typeof key];
                    break;
                case StructType.Matrix.mat4x3:
                    data[key] = zeroMatrix(4, 3) as StructValues<Descriptor>[typeof key];
                    break;
                case StructType.Matrix.mat4x4:
                    data[key] = zeroMatrix(4, 4) as StructValues<Descriptor>[typeof key];
                    break;

                default:
                    if (typeof descriptor[key] === "object") {
                        data[key] = this.getDefaultValue(descriptor[key]) as StructValues<Descriptor>[typeof key];
                    } else {
                        throw new Error("Invalid type in descriptor");
                    }
                    break;
            }
        }

        return data;
    }
}

export class BufferedStruct<Descriptor extends StructDescriptor = StructDescriptor> extends Struct<Descriptor> implements StructedViewSupport {
    
    public readonly label: string;

    public readonly view: StructedView;

    constructor(label: string, descriptor: Descriptor, data?: StructValues<Descriptor>, synchronize: boolean = true) {
        super(descriptor, data);

        this.label = label;
        this.view = new StructedView(new ArrayBuffer(this.getSize()), synchronize);
    }

    /**
     * 設定指定的屬性。並同步更新緩衝區。
     * @param key 屬性的名稱。
     * @param value 屬性的值。
     */
    public override set<Key extends keyof Descriptor>(key: Key, value: StructValues<Descriptor>[Key]) {
        super.set(key, value);

        const offset = this.offsets[key];
        this.writeProperty(this.view, offset, key);
    }

    /**
     * 取得 GPUBuffer。
     * @param device GPUDevice。
     * @returns GPUBuffer。
     */
    public getGPUBuffer(device: GPUDevice): GPUBuffer {
        return this.view.getGPUBuffer(device);
    }
}

// const test = new Struct({
//     position: StructType.Vector.vec3,
//     color: StructType.Vector.vec4,
//     matrix: StructType.Matrix.mat4x4,
//     struct: {
//         x: StructType.Scalar.int,
//         y: .ScalarStructType.Scalar.uint,
//         z: .ScalarStructType.Scalar.float
//     .Scalar}
// .Scalar}, {
//     position: new Vector<3>([1, 2, 3]),
//     color: new Vector<4>([1, 2, 3, 4]),
//     matrix: new Matrix(4, 4, [
//         1, 0, 0, 0,
//         0, 1, 0, 0,
//         0, 0, 1, 0,
//         0, 0, 0, 1
//     ]),
//     struct: new Struct({
//         x: StructType.Scalar.int,
//         y: .ScalarStructType.Scalar.uint,
//         z: .ScalarStructType.Scalar.float
//     .Scalar}, {
//         x: 1,
//         y: 2,
//         z: 3
//     })
// });