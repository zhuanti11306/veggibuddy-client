
import { GLBModel } from "@/utilities/render/glb/parser";

// import modelURI from "./test.glb?url";

// const modelURI = "/test.glb"; // From the server root
const modelURI = new URL("./test.glb", import.meta.url).href;

// console.log("[DBG]", arraybuffer);
const glbModel = GLBModel.fromURL(modelURI);

console.log("[DBG] Model:", glbModel);
