import { Sampler } from "@/utilities/render/sampler";

export { SamplerName as Sampler };
const enum SamplerName {
    Nearest = "nearest",
    Linear = "linear"
};

const defaultSamplerDescriptors = <const>{
    [SamplerName.Nearest]: {
        magFilter: "nearest",
        minFilter: "nearest"
    },

    [SamplerName.Linear] : {
        magFilter: "linear",
        minFilter: "linear"
    },
} satisfies Record<SamplerName, GPUSamplerDescriptor>;

for (const [label, descriptor] of Object.entries(defaultSamplerDescriptors)) {
    Sampler.createRegisteredSampler(label, descriptor);
}

export function getSampler(name: SamplerName): Sampler {
    return Sampler.getSampler(name);
}