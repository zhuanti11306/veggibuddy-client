

export class Sampler {

    public static readonly registeredSamplers: Map<string, Sampler> = new Map(); 

    public static defaultDescriptor: GPUSamplerDescriptor = {
        addressModeU: "repeat",
        addressModeV: "repeat",
        addressModeW: "repeat",
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
        lodMinClamp: 0,
        lodMaxClamp: 1000,
        compare: undefined,
        maxAnisotropy: 1
    };

    public static registerSampler(name: string, sampler: Sampler): void {
        if (Sampler.registeredSamplers.has(name))
            throw new Error(`Sampler with name ${name} is already registered.`);
        Sampler.registeredSamplers.set(name, sampler);
    }

    public static createRegisteredSampler(name: string, descritpor: GPUSamplerDescriptor): void {
        if (Sampler.registeredSamplers.has(name))
            throw new Error(`Sampler with name ${name} is already registered.`);
        Sampler.registeredSamplers.set(name, new Sampler(name, descritpor));
    }

    public static getSampler(name: string): Sampler {
        const sampler = Sampler.registeredSamplers.get(name);
        if (!sampler)
            throw new Error(`Sampler with name ${name} is not registered.`);
        return sampler;
    }

    public readonly label: string;
    public readonly descriptor?: GPUSamplerDescriptor;
    private gpuSampler: GPUSampler | null = null;

    constructor(label: string, descriptor?: GPUSamplerDescriptor) {
        this.label = label;
        this.descriptor = descriptor;
    }

    public getGPUSampler(device: GPUDevice): GPUSampler {
        if (this.gpuSampler) return this.gpuSampler;

        return this.gpuSampler = device.createSampler({
            label: this.label,
            ...Sampler.defaultDescriptor, 
            ...this.descriptor
        });
    }
}