import { Sampler } from "./sampler";
import { BufferedStruct } from "./struct";
import { StructedView } from "./structed-view";
import { Texture } from "./texture";

export interface BindGroupLayoutDescriptor<Entries extends LayoutEntry[] = LayoutEntry[]> {
    entries: Entries;
}

export interface BindGroupDescriptor<Entries extends LayoutEntry[] = LayoutEntry[]> {
    layout: string | BindGroupLayoutDescriptor<Entries> | BindGroupLayout<Entries>;
    entries: EntryResource<Entries>;
}

// export type EntryBindings<Entries extends LayoutEntry[]> = Entries extends 

export type EntryResource<Entries extends LayoutEntry[]> = Entries extends [infer Entry extends LayoutEntry, ...infer Rest extends LayoutEntry[]] ?
    { [Key in Entry["key"]]: EntryResourceType<Entry> } & EntryResource<Rest> : {}


export type EntryResourceType<Entry extends LayoutEntry> =
    Entry extends BufferLayoutEntry ? BufferBinding | BufferBinding["buffer"] :
    Entry extends SamplerLayoutEntry ? Sampler :
    Entry extends TextureLayoutEntry ? Texture :
    Entry extends StorageTextureLayoutEntry ? Texture :
    Entry extends ExternalTextureLayoutEntry ? Texture : never;


export interface BufferBinding {
    buffer: StructedView | BufferedStruct | GPUBuffer;
    offset?: number;
    size?: number;
}

export type LayoutEntry =
    BufferLayoutEntry | SamplerLayoutEntry | TextureLayoutEntry | StorageTextureLayoutEntry | ExternalTextureLayoutEntry;

interface LayoutEntryBase {
    key: string;
    visibility: GPUShaderStageFlags;
}

export interface BufferLayoutEntry extends LayoutEntryBase {
    category: "buffer";
    type: GPUBufferBindingType;
    hasDynamicOffset?: boolean;
    minBindingSize?: number;
}

export interface SamplerLayoutEntry extends LayoutEntryBase {
    category: "sampler";
    type: GPUSamplerBindingType;
}

export interface TextureLayoutEntry extends LayoutEntryBase {
    category: "texture";
    sampleType?: GPUTextureSampleType;
    multisampled?: boolean;
    viewDimension?: GPUTextureViewDimension;
}

export interface StorageTextureLayoutEntry extends LayoutEntryBase {
    category: "storage-texture";
    format: GPUTextureFormat;
    access?: GPUStorageTextureAccess;
    viewDimension?: GPUTextureViewDimension;
}

export interface ExternalTextureLayoutEntry extends LayoutEntryBase {
    category: "read-only-texture";
}

export type PipelineLayoutItem = string | BindGroupLayout | BindGroupLayoutDescriptor | null;

export class BindGroupLayout<Entries extends LayoutEntry[] = LayoutEntry[]> {

    private static readonly registeredLayouts: Map<string, BindGroupLayout<any>> = new Map();
    private static readonly emptyLayout: BindGroupLayout = BindGroupLayout.registerLayout("empty", []);

    /**
     * 建立並註冊綁定群組佈局
     * @param label 綁定群組佈局名稱
     * @param descriptor 綁定群組佈局描述
     * @returns 綁定群組佈局
     */
    public static registerLayout<Entries extends LayoutEntry[] = LayoutEntry[]>(label: string, entries: Entries): BindGroupLayout<Entries> {
        if (this.registeredLayouts.has(label)) {
            throw new Error(`BindGroupLayout with label "${label}" already exists.`);
        }
        const layout = new BindGroupLayout(label, { entries });
        this.registeredLayouts.set(label, layout);
        return layout;
    }

    /**
     * 取得已註冊的綁定群組佈局
     * @param label 綁定群組佈局名稱
     * @returns 綁定群組佈局
     */
    public static getLayout<Entries extends LayoutEntry[] = LayoutEntry[]>(label: string): BindGroupLayout<Entries> {
        const layout = this.registeredLayouts.get(label);
        if (!layout) throw new Error(`BindGroupLayout with label "${label}" not found.`);
        return layout as BindGroupLayout<Entries>;
    }

    /**
     * 取消註冊綁定群組佈局
     * @param label 綁定群組佈局名稱
     */
    public static unregisterLayout(label: string): void {
        if (!this.registeredLayouts.has(label))
            throw new Error(`BindGroupLayout with label "${label}" not found.`);
        this.registeredLayouts.delete(label);
    }

    /**
     * 取得空的綁定群組佈局
     * @returns 空的綁定群組佈局
     */
    public static getPipelineLayout(device: GPUDevice, layouts: PipelineLayoutItem[]): GPUPipelineLayout {

        const bindGroupLayouts: GPUBindGroupLayout[] = [];

        for (const layoutDescriptor of layouts) {
            let layout: GPUBindGroupLayout;

            if (layoutDescriptor === null) {
                layout = BindGroupLayout.emptyLayout.getGPUBindGroupLayout(device);
            } else if (typeof layoutDescriptor === "string") {
                layout = BindGroupLayout.getLayout(layoutDescriptor).getGPUBindGroupLayout(device);
            } else if (layoutDescriptor instanceof BindGroupLayout) {
                layout = layoutDescriptor.getGPUBindGroupLayout(device);
            } else {
                layout = BindGroupLayout.getGPUBindGroupLayout(device, null, layoutDescriptor);
            }

            bindGroupLayouts.push(layout);
        }

        return device.createPipelineLayout({ bindGroupLayouts });
    }

    public label: string;
    public descriptor: BindGroupLayoutDescriptor<Entries>;

    public layout: GPUBindGroupLayout | null = null;

    constructor(label: string, descriptor: BindGroupLayoutDescriptor<Entries>) {
        this.label = label;
        this.descriptor = descriptor;
    }

    /**
     * 取得綁定群組佈局
     * @param device GPUDevice
     * @returns GPUBindGroupLayout
     */
    public getGPUBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        if (this.layout) return this.layout;
        return this.layout = BindGroupLayout.getGPUBindGroupLayout(device, this.label, this.descriptor);
    }

    /**
     * 取得綁定群組佈局的綁定索引
     * @returns 綁定群組佈局的綁定索引
     */
    public getEntryBindings(): { [Key in Entries[number]["key"]]: number } {
        const bindings: Record<string, number> = {};

        this.descriptor.entries.forEach((entry, index) => {
            bindings[entry.key] = index;
        });

        return bindings as { [Key in Entries[number]["key"]]: number };
    }

    /**
     * 取得綁定群組佈局
     * @param device GPUDevice
     * @param label 綁定群組佈局名稱
     * @param descriptor 綁定群組佈局描述
     * @returns GPUBindGroupLayout
     */
    public static getGPUBindGroupLayout(device: GPUDevice, label: string | null, descriptor: BindGroupLayoutDescriptor): GPUBindGroupLayout {
        const entries = [] as GPUBindGroupLayoutEntry[];

        for (const entry of descriptor.entries) {
            const { category, visibility } = entry;

            switch (category) {

                case "buffer":
                    entries.push({
                        binding: entries.length,
                        visibility,
                        buffer: entry,
                    });
                    break;

                case "sampler":
                    entries.push({
                        binding: entries.length,
                        visibility,
                        sampler: entry,
                    });
                    break;

                case "texture":
                    entries.push({
                        binding: entries.length,
                        visibility,
                        texture: entry,
                    });
                    break;

                case "storage-texture":
                    entries.push({
                        binding: entries.length,
                        visibility,
                        storageTexture: entry
                    });
                    break;

                case "read-only-texture":
                    entries.push({
                        binding: entries.length,
                        visibility,
                        externalTexture: entry
                    });
                    break;
            }
        }

        return device.createBindGroupLayout({
            label: label ?? undefined,
            entries,
        });
    }

    public createBindGroup(entries: EntryResource<Entries>): BindGroup<Entries> {
        return new BindGroup<Entries>(this.label, {
            layout: this,
            entries
        });
    }
}

export class BindGroup<Entries extends LayoutEntry[] = LayoutEntry[]> {
    public label: string;
    public descriptor: BindGroupDescriptor<Entries>;

    public layout: BindGroupLayout<Entries>;

    public gpuLayout: GPUBindGroupLayout | null = null;
    public gpuBindGroup: GPUBindGroup | null = null;

    constructor(label: string, descriptor: BindGroupDescriptor<Entries>) {
        this.label = label;
        this.descriptor = descriptor;

        if (typeof descriptor.layout === "string") {
            this.layout = BindGroupLayout.getLayout(descriptor.layout);
        } else if (descriptor.layout instanceof BindGroupLayout) {
            this.layout = descriptor.layout;
        } else {
            this.layout = new BindGroupLayout(label, descriptor.layout);
        }
    }

    /**
     * 取得綁定群組
     * @param device GPUDevice
     * @returns GPUBindGroup
     */
    public getGPUBindGroup(device: GPUDevice, renderTask: Promise<unknown>): GPUBindGroup {
        if (this.gpuBindGroup) return this.gpuBindGroup;

        console.log("[DBG] Creating BindGroup:", this.label);

        this.gpuLayout = this.layout.getGPUBindGroupLayout(device);

        const bindings = this.layout.getEntryBindings();
        const entries = [];

        for (const [key, entryResource] of Object.entries(this.descriptor.entries)) {
            const binding = bindings[key as keyof typeof bindings];
            const entryType = this.layout.descriptor.entries[binding].category;

            let resource!: GPUBindGroupEntry["resource"];
            switch (entryType) {
                case "buffer":
                    let buffer = entryResource as BufferBinding | BufferBinding["buffer"];
                    let offset, size;

                    if ("buffer" in buffer) {
                        ({ buffer, offset, size } = buffer as BufferBinding);
                    }

                    if (buffer instanceof StructedView) {
                        buffer = buffer.getGPUBuffer(device);
                    } else if (buffer instanceof BufferedStruct) {
                        buffer = buffer.getGPUBuffer(device);
                    } else if (buffer instanceof GPUBuffer) {
                        // buffer = buffer;
                    } else {
                        throw new Error("Invalid buffer type.");
                    }

                    resource = { buffer, offset, size };
                    break;

                case "sampler":
                    resource = (entryResource as Sampler).getGPUSampler(device);
                    break;

                case "texture":
                case "storage-texture":
                case "read-only-texture":
                    resource = (entryResource as Texture).getGPUTextureView(device, renderTask);
                    break;

                default:
                    resource = entryResource as GPUBindGroupEntry["resource"];
            }

            entries.push({
                binding: binding,
                resource: resource
            } satisfies GPUBindGroupEntry);
        }

        this.gpuBindGroup = device.createBindGroup({
            label: this.label,
            layout: this.gpuLayout,
            entries: entries
        });

        return this.gpuBindGroup;
    }

    public destroy(): void {
        this.gpuBindGroup = null;
        
        console.log("[DBG] Destroying BindGroup:", this.label);
        // this.gpuLayout is cached on BindGroupLayout, so we don't need to null it here.
    }

    [Symbol.dispose]() {
        this.gpuBindGroup = null;
        this.gpuLayout = null;
    }
}