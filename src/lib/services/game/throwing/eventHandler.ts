import {
  traceBallAnimate,
  drawParabolaLine,
  initBallPosition,
  initCharacterPosition,
  initParabolaLine,
  sphereAnimate,
  updateFloorSize,
} from "./object";
import {
  clearThree,
  initCameraPosi,
  moveCameraZ,
  onWindowResize,
  renderScene,
  startAnimationLoop,
} from "../threeJS.js";
import * as THREE from "three";
import { goto } from "$lib/utils/history.js";

let isDragging = false;
let previousMousePos = new THREE.Vector2();
let prePos = 50;
let mouseDeltaX = 0,
  mouseDeltaY = 0;

export function resize() {
  onWindowResize();
  updateFloorSize();
}

export function startDrag(x: number, y: number) {
  // 避免拖到滑桿時觸發
  mouseDeltaX = 0;
  mouseDeltaY = 0;
  isDragging = true;

  previousMousePos.set(x, y);

  startAnimationLoop(() => {
    if (isDragging) {
      drawParabolaLine(mouseDeltaX, mouseDeltaY);
      mouseDeltaX = 0;
      mouseDeltaY = 0;
    }
  });
}

export function moveDrag(x: number, y: number) {
  // 拖曳未開始
  if (!isDragging) return;

  mouseDeltaX = x - previousMousePos.x;
  mouseDeltaY = y - previousMousePos.y;
  previousMousePos.set(x, y);
}

export function endDrag() {
  if (!isDragging) return;
  isDragging = false;

  // 初始化拋物線
  initParabolaLine();

  // 取得動畫函數
  const sphereAnim = sphereAnimate();
  const charactorAnim = traceBallAnimate();

  startAnimationLoop(() => {
    sphereAnim();
    charactorAnim();
  });
}

export function sliderChange(value: number) {
  const move = prePos - value;
  prePos = value;
  moveCameraZ(move * 0.1);
}

export function exit() {
  clearThree();
  // 重新導向
  goto("/game");
}

export function reset() {
  prePos = 50; // 先同步
  initCameraPosi();
  initBallPosition();
  initCharacterPosition();
  renderScene();
}
