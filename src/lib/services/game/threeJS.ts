import * as THREE from "three";
import { CaptureSize, type Env } from "./constants";

// import {camera, scene} from "../model"

export let camera: THREE.Camera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer | undefined = undefined;
let envConfig: Env;
let clearFunc: (() => void)[] = [];
let cameraTrace: any[] = [];
let updaters: (() => void)[] = [];

export async function initThree(env: Env) {
  envConfig = env;
  camera = env.camera;
  camera.position.set(env.cameraPosi.x, env.cameraPosi.y, env.cameraPosi.z);
  camera.lookAt(env.lookAt.x, env.lookAt.y, env.lookAt.z);
  console.log("initThree: camera initialized.");

  scene = new THREE.Scene();
  const light = env.light;
  light.position.set(env.lightPosi.x, env.lightPosi.y, env.lightPosi.z);
  scene.add(light);
  console.log("initThree: scene initialized.");
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);
  renderer.setSize(window.innerWidth, window.innerHeight);
  console.log("initThree: renderer initialized.");

  console.log("ThreeJS is setup.");
}

export function initCameraPosi() {
  camera.position.set(
    envConfig.cameraPosi.x,
    envConfig.cameraPosi.y,
    envConfig.cameraPosi.z
  );
  camera.lookAt(envConfig.lookAt.x, envConfig.lookAt.y, envConfig.lookAt.z);
}

export function addToScene(object: THREE.Object3D<THREE.Object3DEventMap>) {
  scene.add(object);
}

export function setBackground(
  bg: THREE.Color | THREE.Texture | THREE.CubeTexture | null
) {
  scene.background = null;
  scene.background = bg;
}

let video!: HTMLVideoElement;
let videoCanvas!: HTMLCanvasElement;
let videoCtx: CanvasRenderingContext2D | null;
export async function openCameraBackground() {
  video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  try {
    const constraints: MediaStreamConstraints = {
      video: {
        width: CaptureSize.height,
        height: CaptureSize.width,
        facingMode: "environment",
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
  } catch (e) {
    console.warn("無法取得後置鏡頭。", e);
    return;
  }

  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => {
      console.log("相機背景設置完畢1");
      resolve();
    };
  });
  const texture = new THREE.VideoTexture(video);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  scene.background = texture;
  video.play();
  startAnimationLoop(() => {
    renderScene();
  });
  videoCanvas = document.createElement("canvas");
  videoCanvas.width = CaptureSize.width;
  videoCanvas.height = CaptureSize.height;
  videoCtx = videoCanvas.getContext("2d");
  console.log("相機背景設置完畢");
}

export function captureFrame() {
  if (!video || video.readyState < video.HAVE_ENOUGH_DATA || !videoCtx) return;
  videoCanvas.width = CaptureSize.width;
  videoCanvas.height = CaptureSize.height;
  videoCtx.drawImage(video, 0, 0, CaptureSize.width, CaptureSize.height);
  const rotatedCanvas = document.createElement("canvas");
  rotatedCanvas.width = CaptureSize.height; // 旋轉後寬度 = 原本高度
  rotatedCanvas.height = CaptureSize.width; // 旋轉後高度 = 原本寬度
  const ctx = rotatedCanvas.getContext("2d")!;

  // 將影像旋轉 90 度
  ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2); // 移到中心
  ctx.rotate(-Math.PI / 2); // 向左旋轉 90 度
  ctx.drawImage(
    videoCanvas,
    -CaptureSize.width / 2,
    -CaptureSize.height / 2,
    CaptureSize.width,
    CaptureSize.height
  );
  return {
    img: rotatedCanvas,
    width: rotatedCanvas.width,
    height: rotatedCanvas.height,
  };
}

export function onWindowResize(): void {
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer?.setSize(window.innerWidth, window.innerHeight);
  }
}

export function getWorldPositionFromScreen(
  screenX: number,
  screenY: number,
  options?: { distance?: number; zPlane?: number }
) {
  const ndcX = (screenX / window.innerWidth) * 2 - 1;
  const ndcY = -((screenY / window.innerHeight) * 2 - 1);
  const dir = new THREE.Vector3(ndcX, ndcY, 0.5)
    .unproject(camera)
    .sub(camera.position)
    .normalize();

  if (options?.distance !== undefined) {
    return camera.position.clone().add(dir.multiplyScalar(options.distance));
  } else if (options?.zPlane !== undefined) {
    const distance = (options.zPlane - camera.position.z) / dir.z;
    return camera.position.clone().add(dir.multiplyScalar(distance));
  } else {
    return camera.position.clone().add(dir); // 預設 1 單位
  }
}

export function moveCameraZ(val: number) {
  if (!camera) return;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);

  dir.y = 0;
  dir.normalize();

  const moveVec = dir.clone().multiplyScalar(-val);
  camera.position.add(moveVec);
}

export function setCameraRotation(beta: any, alpha: any, gamma: any) {
  let deltaX = THREE.MathUtils.degToRad(beta ?? 0);
  let deltaY = THREE.MathUtils.degToRad(alpha ?? 0);
  let deltaZ = THREE.MathUtils.degToRad(gamma ?? 0);

  camera.rotation.x += deltaX;
  camera.rotation.y += deltaY;
  camera.rotation.z += deltaZ;
}

export function setCameraZForHorizontalFill(object: THREE.Object3D) {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;
  // 記錄原始相機位置
  const prePosition = camera.position.clone();

  // 取得物件的世界寬度
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const objectWidth = size.x;

  // 相機垂直 FOV 轉弧度
  const fovRad = THREE.MathUtils.degToRad(camera.fov);

  // 計算水平 FOV 的斜率
  const halfFOVWidth = Math.tan(fovRad / 2) * camera.aspect;

  // 計算相機與物件中心的距離
  const distance = objectWidth / (2 * halfFOVWidth);

  // 設置相機 z（相機面向 -Z，物件在世界座標 z）
  const objectZ = object.getWorldPosition(new THREE.Vector3()).z;
  camera.position.z = objectZ + distance;

  // 返回還原函數
  return () => {
    camera.position.copy(prePosition);
  };
}

export function setCameraPostion(posi: THREE.Vector3) {
  camera.position.set(posi.x, posi.y, posi.z);
  cameraTrace.forEach((value) => {
    value();
  });
}

export function renderAtInterval(
  animate: () => void,
  interval: [number, number]
) {
  let lastRenderTime = 0;
  let renderInterval = interval[1] - interval[0];
  let isRandom = true;
  let stopped = false;

  if (renderInterval == 0) {
    renderInterval = interval[0];
    isRandom = false;
  }

  function loop(time: number) {
    if (stopped) return;
    if (lastRenderTime === 0) lastRenderTime = time;

    const delta = time - lastRenderTime;

    if (delta >= renderInterval) {
      lastRenderTime = time;
      animate();
      renderer?.render(scene, camera);

      if (isRandom) {
        const [min, max] = interval;
        renderInterval = Math.random() * (max - min) + min;
      }
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
  let stopFunc = () => {
    stopped = true;
    clearFunc = clearFunc.filter((func) => func !== stopFunc);
  };
  clearFunc.push(stopFunc);
  return stopFunc;
}

export function traceObject(
  object: THREE.Object3D,
  target: THREE.Object3D,
  objectZ: number
) {
  const camPos = camera.position;

  target.updateMatrixWorld(true);

  const targetWorld = target.getWorldPosition(new THREE.Vector3());

  object.position.copy(targetWorld);

  object.position.z = objectZ;

  const targetDepth = Math.abs(targetWorld.z - camPos.z);
  const objectDepth = Math.abs(object.position.z - camPos.z);

  if (targetDepth < 0.0001 || objectDepth < 0.0001) return;

  const scaleRatio = objectDepth / targetDepth;
  object.scale.setScalar(scaleRatio);

  cameraTrace.push(() => {
    updateTraceObject(object, target);
  });
}

// 在相機移動時，object 和 target 看起來依舊黏在一起
function updateTraceObject(object: THREE.Object3D, target: THREE.Object3D) {
  // 距離等比例問題
  const objectZ = object.position.z;
  const targetPos = target.position;
  const dzTarget = targetPos.z - camera.position.z;
  const dzObject = objectZ - camera.position.z;
  const r = dzObject / dzTarget;
  object.position.x = camera.position.x + (targetPos.x - camera.position.x) * r;
  object.position.y = camera.position.y + (targetPos.y - camera.position.y) * r;
}

export function startAnimationLoop(animate: () => void) {
  renderer?.setAnimationLoop(() => {
    animate();
    renderer?.render(scene, camera);
    updaters.forEach((fn) => fn());
  });
}

export function renderScene() {
  renderer?.render(scene, camera);
  updaters.forEach((fn) => fn());
}

export function addUpdater(fn: () => void) {
  updaters.push(fn);
  return () => removeUpdater(fn); // 回傳移除函式
}

export function removeUpdater(fn: () => void) {
  const index = updaters.indexOf(fn);
  if (index !== -1) updaters.splice(index, 1);
}

// 重新建立
export async function resetThree(initFunc?: () => {}) {
  disposeSceneAndRenderer();
  if (envConfig) await initThree(envConfig);
  if (initFunc) initFunc();
}

export async function clearThree() {
  disposeSceneAndRenderer();
}

function disposeSceneAndRenderer() {
  try {
    renderer?.setAnimationLoop(null);
  } catch (e) {}

  scene.traverse((obj) => {
    if (
      obj instanceof THREE.Mesh ||
      obj instanceof THREE.Line ||
      obj instanceof THREE.Points
    ) {
      const mesh = obj as THREE.Mesh;

      if (mesh.geometry) {
        try {
          mesh.geometry.dispose();
        } catch (e) {}
      }

      disposeMaterial(mesh.material as THREE.Material | THREE.Material[]);
    }

    const anyObj = obj as any;
    if (
      anyObj.material &&
      !(
        anyObj instanceof THREE.Mesh ||
        anyObj instanceof THREE.Line ||
        anyObj instanceof THREE.Points
      )
    ) {
      disposeMaterial(anyObj.material);
    }

    if (anyObj.texture && anyObj.texture.dispose) {
      try {
        anyObj.texture.dispose();
      } catch {}
    }
  });

  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }

  try {
    renderer?.forceContextLoss?.();
  } catch {}

  try {
    renderer?.dispose();
  } catch {}

  if (renderer?.domElement && renderer?.domElement.parentElement) {
    renderer?.domElement.parentElement.removeChild(renderer?.domElement);
  }
  renderer = undefined;
  if (clearFunc.length > 0) clearFunc.forEach((func) => func());
}

function disposeMaterial(
  mat: THREE.Material | THREE.Material[] | null | undefined
) {
  if (!mat) return;
  if (Array.isArray(mat)) {
    mat.forEach(disposeMaterial);
    return;
  }
  const m = mat as any;
  const mapProps = [
    "map",
    "alphaMap",
    "aoMap",
    "emissiveMap",
    "bumpMap",
    "normalMap",
    "displacementMap",
    "roughnessMap",
    "metalnessMap",
    "specularMap",
    "envMap",
  ];
  for (const p of mapProps) {
    if (m[p] && typeof m[p].dispose === "function") {
      m[p].dispose();
    }
  }
  try {
    (mat as THREE.Material).dispose();
  } catch (e) {}
}
