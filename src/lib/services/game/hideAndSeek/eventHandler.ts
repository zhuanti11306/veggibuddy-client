import { PerspectiveCamera, Vector3 } from "three";
import {
  addMaskToVScreen,
  checkPoint,
  createVirtualScreen,
  findAnimate,
  getVScreenSize,
  hideAnimate,
  initCharacterPosition,
  initObject,
  seekAnimate,
  setCharacterPosition,
} from "./object";
import {
  camera,
  captureFrame,
  clearThree,
  openCameraBackground,
  renderAtInterval,
  renderScene,
  setCameraPostion,
  setCameraZForHorizontalFill,
  startAnimationLoop,
} from "../threeJS";
import { goto } from "$lib/utils/history";
import { showNotice } from "../notice";
import { init } from "./main";

export async function capture() {
  let result = captureFrame();
  if (!result) {
    console.log("拍攝失敗");
    return false;
  } else {
    let screen = createVirtualScreen(result.img, {
      x: result.width,
      y: result.height,
    });
    let restore = setCameraZForHorizontalFill(screen);
    renderScene();
    let ani = seekAnimate();
    let clearAni = renderAtInterval(ani!, [800, 1500]);
    let response = await requestDetection(result.img);
    if (response.hidingPoint) {
      if (restore) restore();
      clearAni();
      startAnimationLoop(() => {});
      const maskBase64 = response.mask;
      addMaskToVScreen(maskBase64);
      const { x, y } = response.hidingPoint;
      setCharacterPosition(x, y);
      let hideAni = hideAnimate();
      startAnimationLoop(() => {
        hideAni();
      });
      return true;
    } else {
      clearAni();
      if (restore) restore();
      startAnimationLoop(() => {});
      showNotice("偵測不到物體，已自動重置。");
      reset();
      return false;
    }
  }
}

async function requestDetection(img: HTMLCanvasElement) {
  const blob: Blob | null = await new Promise<Blob | null>((resolve) => {
    img.toBlob((b) => resolve(b), "image/jpeg");
  });

  const formData = new FormData();
  formData.append("file", blob!, "frame.jpg");

  try {
    const response = await fetch("http://localhost:5000/detect", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    console.log("收到回覆");
    return result;
  } catch (err) {
    console.error("偵測錯誤:", err);
  }
}

export function sliderChange(value: number) {
  value -= 50;
  let screenSize = getVScreenSize();
  if (!screenSize) return;
  let cam = camera as PerspectiveCamera;
  const z = camera.position.z;
  const fovRad = (cam.fov * Math.PI) / 180;
  const visibleHalfWidth = z * Math.tan(fovRad / 2) * cam.aspect;

  const maxOffset = (screenSize.w - visibleHalfWidth) / 2;

  const maxSlider = 50;
  const ratio = value / maxSlider;
  let posi = new Vector3(
    ratio * maxOffset,
    camera.position.y,
    camera.position.z
  );
  setCameraPostion(posi);
  console.log("slider");
}

export function handlePoint(x: number, y: number) {
  let isSuccessful = checkPoint(x, y);
  if (isSuccessful) {
    let ani = findAnimate();
    startAnimationLoop(ani!);
    return true;
  }
  return false;
}

export function reset() {
  clearThree().then(() => {
    init();
  });
  // openCameraBackground();
  // initCharacterPosition();
}

export function exit() {
  clearThree();
  goto("/game");
}
