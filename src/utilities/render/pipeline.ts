import { VertexArray, VertexBufferLayoutVertices, VertexDescriptor } from "@/utilities/render/vertex-array";
import { BindGroupLayout, PipelineLayoutItem } from "@/utilities/render/bind-group";
import { ShaderModule } from "./shader-module";

export interface PipelineDescriptor<Descriptors extends VertexDescriptor[] = VertexDescriptor[]> {
    shader: {
        vertex: { module: string | ShaderModule | GPUShaderModule; entryPoint?: string };
        fragment: { module: string | ShaderModule | GPUShaderModule; entryPoint?: string };
    };

    vertex: Descriptors;
    vertexStepMode?: GPUVertexStepMode;

    layout?: PipelineLayoutItem[] | "auto";
}

export class Pipeline<Descriptors extends VertexDescriptor[] = VertexDescriptor[]> {

    private renderPipeline: GPURenderPipeline | null = null;

    public readonly label: string;
    private readonly pipelineLayout: PipelineLayoutItem[] | "auto";
    public readonly bindGroupCount: number = 0;

    public readonly vertexShaderModule: ShaderModule;
    public readonly vertexShaderEntryPoint: string | undefined = undefined;

    public readonly fragmentShaderModule: ShaderModule;
    public readonly fragmentShaderEntryPoint: string | undefined = undefined;

    public readonly vertexStepMode: GPUVertexStepMode = "vertex";
    public readonly vertexBufferLayout: VertexBufferLayoutVertices[] = [];

    // public readonly bindGroupLayouts: BindGroupLayout[] | "auto" = [];

    constructor(label: string, descriptor: PipelineDescriptor<Descriptors>) {
        this.label = label;

        const vertexShaderModule = descriptor.shader.vertex.module;
        this.vertexShaderEntryPoint = descriptor.shader.vertex.entryPoint;
        this.vertexShaderModule = vertexShaderModule! instanceof ShaderModule ?
            vertexShaderModule :
            new ShaderModule(label + " Vertex Shader", vertexShaderModule);

        const fragmentShaderModule = descriptor.shader.fragment.module;
        this.fragmentShaderEntryPoint = descriptor.shader.fragment.entryPoint;
        this.fragmentShaderModule = fragmentShaderModule! instanceof ShaderModule ?
            fragmentShaderModule :
            new ShaderModule(label + " Fragment Shader", fragmentShaderModule);

        this.pipelineLayout = descriptor.layout ?? "auto";
        this.bindGroupCount = this.pipelineLayout === "auto" ? 0 : this.pipelineLayout.length;
        this.vertexStepMode = descriptor.vertexStepMode ?? "vertex";
        
        let shaderLocation = 0;
        for (const vertexDescriptor of descriptor.vertex) {
            const { stride, attributes, nextLocation } = VertexArray.getStrideAndAttributes(vertexDescriptor, shaderLocation);
            this.vertexBufferLayout.push({ stride, attributes });
            shaderLocation = nextLocation;
        }
    }

    public getRenderPipeline(device: GPUDevice, colorAttachments: (GPUColorTargetState | null)[]): GPURenderPipeline {
        if (this.renderPipeline) return this.renderPipeline;

        const buffers: GPUVertexBufferLayout[] = [];
        for (const buffer of this.vertexBufferLayout) {
            buffers.push({
                arrayStride: buffer.stride,
                stepMode: this.vertexStepMode,
                attributes: Object.values(buffer.attributes)
            });
        }

        return this.renderPipeline = device.createRenderPipeline({
            label: this.label,

            layout: this.pipelineLayout === "auto" ? "auto"
                : BindGroupLayout.getPipelineLayout(device, this.pipelineLayout),

            vertex: {
                module: this.vertexShaderModule.getGPUShaderModule(device),
                entryPoint: this.vertexShaderEntryPoint,
                buffers: [
                    ...buffers
                ]
            },

            fragment: {
                module: this.fragmentShaderModule.getGPUShaderModule(device),
                entryPoint: this.fragmentShaderEntryPoint,
                targets: colorAttachments
            }
        });
    }
}