import { initRenderContext } from "@/core/render";
import { run } from "@/core/render/render";
import { triangle } from "@/test/triangle";
import { beginPass, endPass } from "@/core/render/render";

import "@/index.css";

// 初始化渲染上下文

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

await initRenderContext(canvas);

// 建立螢幕解析度結構
import { getLayout, Layout } from "@/core/render/layout";
import { BufferedStruct } from "@/utilities/render/struct";
import * as StructType from "@/utilities/render/struct-property-type";
import { vector } from "@/utilities/render/vector";

const screenLayout = getLayout(Layout.Screen);

const screenResolution = new BufferedStruct("screen-resolution", {
    resolution: StructType.Vector.vec2,
});

const screenUniform = screenLayout.createBindGroup({
    resolution: {
        buffer: screenResolution
    }
});

// 繪製三角形

run((deltaTime) => {
    
    // 更新解析度
    screenResolution.set("resolution", vector(canvas.width, canvas.height));
    triangle.update(deltaTime); // 更新三角形的狀態

    beginPass({ // 開啟渲染通道
        label: "test",
        colorAttachments: ["canvas"], // 渲染到畫布
        defaultBindGroups: [screenUniform], // 預設綁定組
    });

    triangle.render(); // 渲染三角形

    endPass(); // 結束渲染通道
});