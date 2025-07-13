import { app, initApp } from "./app";
import { initRenderContext } from "./core/render";
import { run } from "./core/render/render";

import "./index.css";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

await initRenderContext(canvas);
initApp();

run((deltaTime) => {
    app.update(deltaTime);
    app.render();
});