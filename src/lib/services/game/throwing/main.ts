import { Color } from "three";
import { ThrowingEnv } from "../constants.js";
import * as threeJS from "../threeJS.js";
import { initObject } from "./object";

import { DeviceOrientationControls } from "./DeviceOrientationControls";
import { showNotice } from "../notice.js";
import { OrbitControls } from "three/examples/jsm/Addons.js";

// ----------------------------------------
// MARK: - 主流程
// ----------------------------------------

export async function init() {
  await threeJS.initThree(ThrowingEnv);
  await initObject();
  threeJS.setBackground(new Color().setRGB(255, 255, 255));
  threeJS.renderScene();
  try {
    threeJS.startAnimationLoop(() => {});
    // 陀螺儀
    let controls = new DeviceOrientationControls(threeJS.camera);
    // threeJS.addUpdater(() => controls.update());
    // const controls = new OrbitControls(threeJS.camera);
    threeJS.addUpdater(() => controls.update());
    threeJS.renderScene();
    console.log(
      `[ThreeJS][Game-Throw] Camera position: ${threeJS.camera.position.toArray()}, controls active`
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("[ThreeJS Init] 初始化失敗:", e);

    showNotice?.(`應用程式啟動失敗！\n錯誤訊息: ${errorMessage}`, 5000);

    return;
  }
}
