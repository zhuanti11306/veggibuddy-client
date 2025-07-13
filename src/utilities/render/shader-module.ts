
export class ShaderModule {
    public readonly label: string;
    private readonly code: string;

    private gpuShaderModule: GPUShaderModule | null = null;

    constructor(label: string, code: string | GPUShaderModule) {
        this.label = label;
        if (typeof code === "string") {
            this.code = code;
        } else {
            this.gpuShaderModule = code;
            this.code = "";
        }
    }

    getGPUShaderModule(device: GPUDevice): GPUShaderModule {
        if (this.gpuShaderModule) return this.gpuShaderModule;
        return this.gpuShaderModule = device.createShaderModule({
            label: this.label,
            code: this.code,
        });
    }

    async getGPUCompilationMessage(): Promise<GPUCompilationInfo> {
        if (!this.gpuShaderModule)
            throw new Error("GPUShaderModule is not created yet.");
        return this.gpuShaderModule.getCompilationInfo();
    }
        

    [Symbol.dispose]() {
        this.gpuShaderModule = null;
    }
}