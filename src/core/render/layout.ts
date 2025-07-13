import { BindGroupLayout, LayoutEntry } from "@/utilities/render/bind-group";

/** 綁定群組佈局名稱 */
export const enum Layout {
    Empty = "empty",
    Material = "material",
    Global = "global",
    Screen = "screen",
}

export type DefaultLayoutEntries = typeof defaultLayoutEntries;

/** 分配部分綁定槽位給部份綁定群組使用。使用 @group(N) 將取得索引為 N 三綁定群組。*/
// export const assignedSlots: Layout[] = [
//     Layout.Global,
//     Layout.Material
// ];

/**
 * 預設綁定群組佈局
 * 需要在使用前呼叫 initLayouts()
 * 
 * @see initLayouts
 */
const defaultLayoutEntries = <const>{

    [Layout.Empty]: [],

    [Layout.Global]: [
        {
            key: "global",
            category: "buffer",
            type: "uniform",
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX
        }
    ],

    [Layout.Material]: [
        {
            key: "material",
            category: "buffer",
            type: "uniform",
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX
        },
        {
            key: "materialSampler",
            category: "sampler",
            type: "filtering",
            visibility: GPUShaderStage.FRAGMENT
        },
        {
            key: "materialTexture",
            category: "texture",
            visibility: GPUShaderStage.FRAGMENT
        }
    ],

    [Layout.Screen]: [
        {
            key: "resolution",
            category: "buffer",
            type: "uniform",
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
        }
    ]
} satisfies Partial<Record<Layout, LayoutEntry[]>>;


// 初始化綁定群組佈局
for (const [label, entries] of Object.entries(defaultLayoutEntries)) {
    if (label === "empty") continue; // 跳過空佈局，已經在 BindGroupLayout 中註冊
    BindGroupLayout.registerLayout(label, entries);
}

/**
 * 取得預設綁定群組佈局
 * 
 * @param label 佈局名稱
 * @returns 綁定群組佈局
 */
export function getLayout<T extends Layout = Layout>(label: T): BindGroupLayout<DefaultLayoutEntries[T]> {
    return BindGroupLayout.getLayout<DefaultLayoutEntries[T]>(label);
}