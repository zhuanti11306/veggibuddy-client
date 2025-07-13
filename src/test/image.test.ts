import { initRenderContext } from "@/core/render";
import { run } from "@/core/render/render";
import { beginPass, endPass } from "@/core/render/render";

import "@/index.css";

// 初始化渲染上下文

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

await initRenderContext(canvas);

// 建立渲染流程

import { image } from "./image";

run(() => {

    beginPass({ // 開啟渲染通道
        label: "test",
        colorAttachments: ["canvas"], // 渲染到畫布
    });

    image.render(); // 渲染圖片

    endPass(); // 結束渲染通道
});