// 供 Unifrom 及存儲緩衝使用的資料結構。

export interface StructedViewSupport {
    /**
     * 將資料寫入指定的位置。
     * 此方法可能毀損資料，導致錯誤復寫或無法正確讀取，請謹慎使用。
     * 
     * @param view 資料寫入的目標。
     * @param offset 資料寫入的位置。
     * @returns 寫入的資料長度。 
     */
    writeStructedView(view: StructedView, offset: number): number;

    /**
     * 取得資料的對齊步長。
     * @returns 資料的對齊步長。
     */
    getAlignment(): number;

    /**
     * 取得資料的大小。
     * @returns 資料的大小。
     */
    getSize(): number;
}

export class StructedView {
    private readonly buffer: ArrayBuffer;
    private readonly dataView: DataView;

    private readonly synchronize: boolean;
    private gpu: { device: GPUDevice, buffer: GPUBuffer } | null = null;

    constructor(buffer: ArrayBuffer, synchronize: boolean = true) {
        this.buffer = buffer;
        this.dataView = new DataView(this.buffer);

        this.synchronize = synchronize; // TODO: 改為非同步、同步、頻繁同步
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
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            // TODO: Uniform, Storage, StorageReadOnly
        });

        this.gpu = { device, buffer };

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
     * 將資料寫入指定的位置。
     * 此方法可能毀損資料，導致錯誤復寫或無法正確讀取，請謹慎使用。
     * @param offset 資料寫入的位置。
     * @param value 將被寫入的資料。
     * @returns 寫入的資料長度。
     */
    public set(offset: number, value: StructedViewSupport): number {
        return value.writeStructedView(this, offset);
    }

    /**
     * 將數字作為有號整數寫入指定的位置。
     * 此方法可能毀損資料，導致錯誤復寫或無法正確讀取，請謹慎使用。
     * 
     * @param offset 資料寫入的位置。
     * @param value 將被寫入的資料。
     * @returns 寫入的資料長度。
     */
    public setInteger(offset: number, value: number): number {
        return this.setSignedInteger(offset, value);
    }

    /**
     * 將數字作為單精度浮點數寫入指定的位置。
     * 此方法可能毀損資料，導致錯誤復寫或無法正確讀取，請謹慎使用。
     * 
     * @param offset 資料寫入的位置。
     * @param value 將被寫入的資料。
     * @returns 寫入的資料長度。
     */
    public setFloatNumber(offset: number, value: number): number {
        this.dataView.setFloat32(offset, value, true);
        return this.updateGPUBuffer(offset, Float32Array.BYTES_PER_ELEMENT);
    }

    /**
     * 將數字作為有號整數寫入指定的位置。
     * 此方法可能毀損資料，導致錯誤復寫或無法正確讀取，請謹慎使用。
     * 
     * @param offset 資料寫入的位置。
     * @param value 將被寫入的資料。
     * @returns 寫入的資料長度。
     * @see setInteger
     */
    public setSignedInteger(offset: number, value: number): number {
        this.dataView.setInt32(offset, value, true);
        return this.updateGPUBuffer(offset, Int32Array.BYTES_PER_ELEMENT);
    }

    /**
     * 將數字作為無號整數寫入指定的位置。
     * 此方法可能毀損資料，導致錯誤復寫或無法正確讀取，請謹慎使用。
     * 
     * @param offset 資料寫入的位置。
     * @param value 將被寫入的資料。
     * @returns 寫入的資料長度。
     */
    public setUnsignedInteger(offset: number, value: number): number {
        this.dataView.setUint32(offset, value, true);
        return this.updateGPUBuffer(offset, Uint32Array.BYTES_PER_ELEMENT);
    }

    /**
     * 對齊，將資料寫入指定的位置。
     * 此方法可能毀損資料，導致錯誤復寫或無法正確讀取，請謹慎使用。
     * 
     * @param offset 資料寫入的位置，將會被對齊。 
     * @param value 將被寫入的資料。
     * @returns 寫入的資料長度與對齊量總和。
     */
    public append(offset: number, value: StructedViewSupport): number {
        const align = value.getAlignment();
        const padding = (align - (offset % align)) % align;
        const length = value.writeStructedView(this, offset + padding);
        return padding + this.updateGPUBuffer(offset + padding, length);
    }

    /**
     * 對齊，將數字作為有號整數寫入指定的位置。
     * 此方法可能毀損資料，導致錯誤復寫或無法正確讀取，請謹慎使用。
     * 
     * @param offset 資料寫入的位置，將會被對齊。
     * @param value 將被寫入的資料。
     * @returns 寫入的資料長度與對齊量總和。
     */
    public appendInteger(offset: number, value: number): number {
        const align = Int32Array.BYTES_PER_ELEMENT;
        const padding = (align - (offset % align)) % align;
        return padding + this.setInteger(offset + padding, value);
    }

    /**
     * 對齊，將數字作為單精度浮點數寫入指定的位置。
     * 此方法可能毀損資料，導致錯誤復寫或無法正確讀取，請謹慎使用。
     * 
     * @param offset 資料寫入的位置，將會被對齊。
     * @param value 將被寫入的資料。
     * @returns 寫入的資料長度與對齊量總和。
     */
    public appendFloat(offset: number, value: number): number {
        const align = Float32Array.BYTES_PER_ELEMENT;
        const padding = (align - (offset % align)) % align;
        return padding + this.setFloatNumber(offset + padding, value);
    }

    /**
     * 對齊，將數字作為有號整數寫入指定的位置。
     * 此方法可能毀損資料，導致錯誤復寫或無法正確讀取，請謹慎使用。
     * 
     * @param offset 資料寫入的位置，將會被對齊。
     * @param value 將被寫入的資料。
     * @returns 寫入的資料長度與對齊量總和。
     */
    public appendSignedInteger(offset: number, value: number): number {
        const align = Int32Array.BYTES_PER_ELEMENT;
        const padding = (align - (offset % align)) % align;
        return padding + this.setSignedInteger(offset + padding, value);
    }

    /**
     * 對齊，將數字作為無號整數寫入指定的位置。
     * 此方法可能毀損資料，導致錯誤復寫或無法正確讀取，請謹慎使用。
     * 
     * @param offset 資料寫入的位置，將會被對齊。
     * @param value 將被寫入的資料。
     * @returns 寫入的資料長度與對齊量總和。
     */
    public appendUnsignedInteger(offset: number, value: number): number {
        const align = Uint32Array.BYTES_PER_ELEMENT;
        const padding = (align - (offset % align)) % align;
        return padding + this.setUnsignedInteger(offset + padding, value);
    }

    /**
     * 取得 ArrayBuffer。
     * @returns ArrayBuffer。
     */
    public getBuffer(): ArrayBuffer {
        return this.buffer;
    }
}