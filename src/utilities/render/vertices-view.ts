// 供頂點緩衝使用

import { AllowDimension } from "./dimension";
import { Vector } from "./vector";

export class VerticesView {
    public readonly buffer: ArrayBuffer;
    public readonly dataView: DataView;

    private readonly synchronize: boolean;
    private gpu: {device: GPUDevice, buffer: GPUBuffer} | null = null;

    constructor(buffer: ArrayBuffer, synchronize: boolean = true) {
        this.buffer = buffer;
        this.dataView = new DataView(this.buffer);

        this.synchronize = synchronize; // TODO: 改為非同步、同步、頻繁同步
    }

    public get byteLength(): number {
        return this.buffer.byteLength;
    }

    public getGPUBuffer(device: GPUDevice): GPUBuffer {
        if (this.gpu) {
            if (this.gpu.device === device)
                return this.gpu.buffer;
            else
                throw new Error("GPUBuffer is already created for another device.");
        }

        const buffer = device.createBuffer({
            size: this.buffer.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });

        this.gpu = {device, buffer};

        device.queue.writeBuffer(buffer, 0, this.buffer, 0, this.buffer.byteLength);
        return buffer;
    }

    private updateGPUBuffer(offset: number, length: number): number {
        if (!this.synchronize || !this.gpu) return length;
        const { device, buffer } = this.gpu;
        device.queue.writeBuffer(buffer, offset, this.buffer, offset, length);
        return length;
    }

    /**
     * 寫入有號位元組。
     * 寫入單一有號位元組資料不被 WebGPU 支援。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     * @see VerticesView.setSignedByte
     */
    public setByte(offset: number, value: number): number {
        return this.setSignedByte(offset, value);
    }

    /**
     * 寫入有號位元組向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     * @see VerticesView.setSignedByteVector
     */
    public setByteVector(offset: number, vector: Vector<AllowDimension>): number {
        return this.setSignedByteVector(offset, vector);
    }

    /**
     * 寫入有號位元組。
     * 寫入單一有號位元組資料不被 WebGPU 支援。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     */
    public setSignedByte(offset: number, value: number): number {
        this.dataView.setInt8(offset, value);
        return this.updateGPUBuffer(offset, Int8Array.BYTES_PER_ELEMENT);
    }

    /**
     * 寫入有號位元組向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     */
    public setSignedByteVector(offset: number, vector: Vector<AllowDimension>): number {
        return this.setSignedByteArray(offset, vector.data);
    }

    /**
     * 寫入無號位元組。
     * 寫入單一無號位元組資料不被 WebGPU 支援。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     */
    public setUnsignedByte(offset: number, value: number): number {
        this.dataView.setUint8(offset, value);
        return this.updateGPUBuffer(offset, Uint8Array.BYTES_PER_ELEMENT);
    }

    /**
     * 寫入無號位元組向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     */
    public setUnsignedByteVector(offset: number, vector: Vector<AllowDimension>): number {
        return this.setUnsignedByteArray(offset, vector.data);
    }

    /**
     * 寫入有號短整數。
     * 寫入單一有號短整數資料不被 WebGPU 支援。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     * @see VerticesView.setSignedShortInteger
     */
    public setShortInteger(offset: number, value: number): number {
        return this.setSignedShortInteger(offset, value);
    }

    /**
     * 寫入有號短整數向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     * @see VerticesView.setSignedShortIntegerVector
     */
    public setShortIntegerVector(offset: number, vector: Vector<AllowDimension>): number {
        return this.setSignedShortIntegerVector(offset, vector);
    }

    /**
     * 寫入有號短整數。
     * 寫入單一有號短整數資料不被 WebGPU 支援。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     */
    public setSignedShortInteger(offset: number, value: number): number {
        this.dataView.setInt16(offset, value, true);
        return this.updateGPUBuffer(offset, Int16Array.BYTES_PER_ELEMENT);
    }

    /**
     * 寫入有號短整數向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     */
    public setSignedShortIntegerVector(offset: number, vector: Vector<AllowDimension>): number {
        return this.setSignedShortIntegerArray(offset, vector.data);
    }

    /**
     * 寫入無號短整數。
     * 寫入單一無號短整數資料不被 WebGPU 支援。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     */
    public setUnsignedShortInteger(offset: number, value: number): number {
        this.dataView.setUint16(offset, value, true);
        return this.updateGPUBuffer(offset, Uint16Array.BYTES_PER_ELEMENT);
    }

    /**
     * 寫入無號短整數向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     */
    public setUnsignedShortIntegerVector(offset: number, vector: Vector<AllowDimension>): number {
        return this.setUnsignedShortIntegerArray(offset, vector.data);
    }

    /**
     * 寫入單精度浮點數。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     * @see VerticesView.setSinglePrecision
     */
    public setFloatNumber(offset: number, value: number): number {
        return this.setSinglePrecision(offset, value);
    }

    /**
     * 寫入單精度浮點數向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     * @see VerticesView.setSinglePrecisionVector
     */
    public setFloatNumberVector(offset: number, vector: Vector<AllowDimension>): number {
        return this.setSinglePrecisionVector(offset, vector);
    }

    /**
     * 寫入單精度浮點數。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     */
    public setSinglePrecision(offset: number, value: number): number {
        this.dataView.setFloat32(offset, value, true);
        return this.updateGPUBuffer(offset, Float32Array.BYTES_PER_ELEMENT);
    }

    /**
     * 寫入單精度浮點數向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     */
    public setSinglePrecisionVector(offset: number, vector: Vector<AllowDimension>): number {
        return this.setFloatNumberArray(offset, vector.data);
    }

    /**
     * 寫入半精度浮點數。
     * 寫入單一半精度浮點數資料不被 WebGPU 支援。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     */
    public setHalfPrecision(_offset: number, _value: number): number {
        throw new Error("Not implemented");
        // this.dataView.setFloat16(offset, value, true);
        // return Float16Array.BYTES_PER_ELEMENT;
    }

    /**
     * 寫入半精度浮點數向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     */
    public setHalfPrecisionVector(_offset: number, _vector: Vector<AllowDimension>): number {
        throw new Error("Not implemented");
        // this.dataView.setFloat16(offset, vector.x, true);
        // this.dataView.setFloat16(offset + Float16Array.BYTES_PER_ELEMENT, vector.y, true);
        // if (vector.dimension == 2) return 2 * Float16Array.BYTES_PER_ELEMENT;

        // this.dataView.setFloat16(offset + 2 * Float16Array.BYTES_PER_ELEMENT, vector.z, true);
        // if (vector.dimension == 3) return 3 * Float16Array.BYTES_PER_ELEMENT;

        // this.dataView.setFloat16(offset + 3 * Float16Array.BYTES_PER_ELEMENT, vector.w, true);
        // return 4 * Float16Array.BYTES_PER_ELEMENT;
    }

    /**
     * 寫入有號整數。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     * @see VerticesView.setSignedInteger
     */
    public setInteger(offset: number, value: number): number {
        return this.setSignedInteger(offset, value);
    }

    /**
     * 寫入有號整數向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     * @see VerticesView.setSignedIntegerVector
     */
    public setIntegerVector(offset: number, vector: Vector<AllowDimension>): number {
        return this.setSignedIntegerVector(offset, vector);
    }

    /**
     * 寫入有號整數。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     */
    public setSignedInteger(offset: number, value: number): number {
        this.dataView.setInt32(offset, value, true);
        return this.updateGPUBuffer(offset, Int32Array.BYTES_PER_ELEMENT);
    }

    /**
     * 寫入有號整數向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     */
    public setSignedIntegerVector(offset: number, vector: Vector<AllowDimension>): number {
        return this.setSignedIntegerArray(offset, vector.data);
    }

    /**
     * 寫入無號整數。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     */
    public setUnsignedInteger(offset: number, value: number): number {
        this.dataView.setUint32(offset, value, true);
        return this.updateGPUBuffer(offset, Uint32Array.BYTES_PER_ELEMENT);
    }

    /**
     * 寫入無號整數向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     */
    public setUnsignedIntegerVector(offset: number, vector: Vector<AllowDimension>): number {
        return this.setUnsignedIntegerArray(offset, vector.data);
    }

    /**
     * 寫入有號正規化位元組。
     * 寫入單一有號正規化位元組資料不被 WebGPU 支援。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     */
    public setNormalizedSignedByte(offset: number, value: number): number {
        this.dataView.setInt8(offset, (value * 0xff - 1) / 2);
        return this.updateGPUBuffer(offset, Int8Array.BYTES_PER_ELEMENT);
    }

    /**
     * 寫入有號正規化位元組向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     */
    public setNormalizedSignedByteVector(offset: number, vector: Vector<AllowDimension>): number {
        return this.setNormalizedSignedByteArray(offset, vector.data);
    }

    /**
     * 寫入無號正規化位元組。
     * 寫入單一無號正規化位元組資料不被 WebGPU 支援。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     */
    public setNormalizedUnsignedByte(offset: number, value: number): number {
        this.dataView.setUint8(offset, value * 0xff);
        return this.updateGPUBuffer(offset, Uint8Array.BYTES_PER_ELEMENT);
    }

    /**
     * 寫入無號正規化位元組向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     */
    public setNormalizedUnsignedByteVector(offset: number, vector: Vector<AllowDimension>): number {
        return this.setNormalizedUnsignedByteArray(offset, vector.data);
    }

    /**
     * 寫入有號正規化短整數。
     * 寫入單一有號正規化短整數資料不被 WebGPU 支援。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     */
    public setNormalizedSignedShortInteger(offset: number, value: number): number {
        this.dataView.setInt16(offset, (value * 0xffff - 1) / 2, true);
        return this.updateGPUBuffer(offset, Int16Array.BYTES_PER_ELEMENT);
    }

    /**
     * 寫入有號正規化短整數向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     */
    public setNormalizedSignedShortIntegerVector(offset: number, vector: Vector<AllowDimension>): number {
        return this.setNormalizedSignedShortIntegerArray(offset, vector.data);
    }

    /**
     * 寫入無號正規化短整數。
     * 寫入單一無號正規化短整數資料不被 WebGPU 支援。
     * 
     * @param offset 寫入位置
     * @param value 寫入值
     * @returns 寫入的數據大小
     */
    public setNormalizedUnsignedShortInteger(offset: number, value: number): number {
        this.dataView.setUint16(offset, value * 0xffff, true);
        return this.updateGPUBuffer(offset, Uint16Array.BYTES_PER_ELEMENT);
    }

    /**
     * 寫入無號正規化短整數向量。
     * 
     * @param offset 寫入位置
     * @param vector 寫入向量
     * @returns 寫入的數據大小
     */
    public setNormalizedUnsignedShortIntegerVector(offset: number, vector: Vector<AllowDimension>): number {
        return this.setNormalizedUnsignedShortIntegerArray(offset, vector.data);
    }

    public setUnsignedByteArray(offset: number, value: ArrayLike<number>): number {
        const buffer = new Uint8Array(this.buffer, offset, value.length);
        buffer.set(value);
        return this.updateGPUBuffer(offset, Uint8Array.BYTES_PER_ELEMENT * value.length);
    }

    public setSignedByteArray(offset: number, value: ArrayLike<number>): number {
        const buffer = new Int8Array(this.buffer, offset, value.length);
        buffer.set(value);
        return this.updateGPUBuffer(offset, Int8Array.BYTES_PER_ELEMENT * value.length);
    }

    public setUnsignedShortIntegerArray(offset: number, value: ArrayLike<number>): number {
        const buffer = new Uint16Array(this.buffer, offset, value.length);
        buffer.set(value);
        return this.updateGPUBuffer(offset, Uint16Array.BYTES_PER_ELEMENT * value.length);
    }

    public setSignedShortIntegerArray(offset: number, value: ArrayLike<number>): number {
        const buffer = new Int16Array(this.buffer, offset, value.length);
        buffer.set(value);
        return this.updateGPUBuffer(offset, Int16Array.BYTES_PER_ELEMENT * value.length);
    }

    public setUnsignedIntegerArray(offset: number, value: ArrayLike<number>): number {
        const buffer = new Uint32Array(this.buffer, offset, value.length);
        buffer.set(value);
        return this.updateGPUBuffer(offset, Uint32Array.BYTES_PER_ELEMENT * value.length);
    }

    public setSignedIntegerArray(offset: number, value: ArrayLike<number>): number {
        const buffer = new Int32Array(this.buffer, offset, value.length);
        buffer.set(value);
        return this.updateGPUBuffer(offset, Int32Array.BYTES_PER_ELEMENT * value.length);
    }

    public setFloatNumberArray(offset: number, value: ArrayLike<number>): number {
        const buffer = new Float32Array(this.buffer, offset, value.length);
        buffer.set(value);
        return this.updateGPUBuffer(offset, Float32Array.BYTES_PER_ELEMENT * value.length);
    }

    public setNormalizedUnsignedByteArray(offset: number, value: ArrayLike<number>): number {
        const buffer = new Uint8Array(this.buffer, offset, value.length);
        for (let i = 0; i < value.length; i++)
            buffer[i] = value[i] * 0xff;
        return this.updateGPUBuffer(offset, Uint8Array.BYTES_PER_ELEMENT * value.length);
    }

    public setNormalizedSignedByteArray(offset: number, value: ArrayLike<number>): number {
        const buffer = new Int8Array(this.buffer, offset, value.length);
        for (let i = 0; i < value.length; i++)
            buffer[i] = (value[i] * 0xff - 1) / 2;
        return this.updateGPUBuffer(offset, Int8Array.BYTES_PER_ELEMENT * value.length);
    }

    public setNormalizedUnsignedShortIntegerArray(offset: number, value: ArrayLike<number>): number {
        const buffer = new Uint16Array(this.buffer, offset, value.length);
        for (let i = 0; i < value.length; i++)
            buffer[i] = value[i] * 0xffff;
        return this.updateGPUBuffer(offset, Uint16Array.BYTES_PER_ELEMENT * value.length);
    }

    public setNormalizedSignedShortIntegerArray(offset: number, value: ArrayLike<number>): number {
        const buffer = new Int16Array(this.buffer, offset, value.length);
        for (let i = 0; i < value.length; i++)
            buffer[i] = (value[i] * 0xffff - 1) / 2;
        return this.updateGPUBuffer(offset, Int16Array.BYTES_PER_ELEMENT * value.length);
    }

    public setNormalizedUnsignedIntegerArray(offset: number, value: ArrayLike<number>): number {
        const buffer = new Uint32Array(this.buffer, offset, value.length);
        for (let i = 0; i < value.length; i++)
            buffer[i] = value[i] * 0xffffffff;
        return this.updateGPUBuffer(offset, Uint32Array.BYTES_PER_ELEMENT * value.length);
    }

    public setNormalizedSignedIntegerArray(offset: number, value: ArrayLike<number>): number {
        const buffer = new Int32Array(this.buffer, offset, value.length);
        for (let i = 0; i < value.length; i++)
            buffer[i] = (value[i] * 0xffffffff - 1) / 2;
        return this.updateGPUBuffer(offset, Int32Array.BYTES_PER_ELEMENT * value.length);
    }
}