import { HideAndSeekEnv } from "../constants";
import * as threeJS from "../threeJS";
import { initObject } from "./object";

export async function init() {
  try {
    await threeJS.initThree(HideAndSeekEnv); // 初始化 Three.js 和 Video 背景
    await initObject();
    await threeJS.openCameraBackground();
    console.log(
      `[ThreeJS][Game-Throw] Camera position: ${threeJS.camera.position.toArray()}, controls active`
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("初始化失敗:", e);
    window.alert(`應用程式啟動失敗！\n錯誤訊息: ${errorMessage}`);
    return;
  }
}
