import * as THREE from "three";

import { GLTFLoader } from "three/examples/jsm/Addons.js";
import characterModel from "$assets/pet/carrot/carrot.glb?url";
import {
  addToScene,
  camera,
  getWorldPositionFromScreen,
  renderScene,
  setBackground,
  traceObject,
} from "../threeJS";

let image: HTMLCanvasElement;
let screen: THREE.Mesh;
let maskMesh: THREE.Mesh;

const character = {
  object: new THREE.Group(),
  size: { x: 0, y: 0, z: 0 },
  visible: false,
  box: new THREE.Box3(),
};

export async function initObject() {
  await initCharacter();
  renderScene();
}

// === 初始化角色 ===
export async function initCharacter() {
  const model = await loadModel(characterModel);
  character.object.add(model);
  const objInfo = getBoxAndSize(character.object);
  character.size = {
    x: objInfo.size.x,
    y: objInfo.size.y,
    z: objInfo.size.z,
  };
  character.box = objInfo.box;
  character.object.scale.setScalar(0.03);
  character.object.lookAt(camera.position);
  const axis = new THREE.Vector3(0, 0, 1);
  character.object.rotateOnAxis(axis, -Math.PI / 2);
  initCharacterPosition();
  addToScene(character.object);
  character.object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material.depthTest = true;
      child.material.depthWrite = true;
      child.renderOrder = 1; // 在遮罩之後畫
    }
  });
  console.log("角色 GLB 載入完成");
}

export function createVirtualScreen(
  img: HTMLCanvasElement | undefined,
  imgSize: { x: number; y: number }
) {
  image = img ? img : image;
  const videoTexture = new THREE.CanvasTexture(image);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.format = THREE.RGBAFormat;
  videoTexture.needsUpdate = true;
  const planeW = 1;
  const planeH = imgSize.y / imgSize.x;
  const geometry = new THREE.PlaneGeometry(planeW, planeH);
  const material = new THREE.MeshBasicMaterial({ map: videoTexture });
  screen = new THREE.Mesh(geometry, material);
  screen.position.x = 0;
  screen.position.y = 0;
  screen.renderOrder = 1;
  let cam = camera as THREE.PerspectiveCamera;
  const fovRad = THREE.MathUtils.degToRad(cam.fov);
  const halfHeight = planeH / 2;
  const distance = halfHeight / Math.tan(fovRad / 2);

  screen.position.z = 1 - distance * 1.01;
  setBackground(new THREE.Color().setRGB(0, 0, 0));
  addToScene(screen);
  return screen;
}

export function addMaskToVScreen(maskBase64: string) {
  if (maskMesh) maskMesh.removeFromParent();
  const texture = new THREE.TextureLoader().load(
    `data:image/png;base64,${maskBase64}`
  );
  const imageTexture = new THREE.Texture(image);
  imageTexture.needsUpdate = true;
  // 取得 screen 尺寸
  const bbox = new THREE.Box3().setFromObject(screen);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  // 建立 Plane 幾何
  const geometry = new THREE.PlaneGeometry(size.x, size.y);
  const maskMaterial = new THREE.MeshBasicMaterial({
    map: imageTexture,
    alphaMap: texture,
    depthWrite: true,
    transparent: true,
  });

  maskMesh = new THREE.Mesh(geometry, maskMaterial);
  traceObject(maskMesh, screen, 0.8);
  maskMesh.renderOrder = 0; // 確保先渲染深度

  addToScene(maskMesh);
  return maskMesh;
}

export function getVScreenSize() {
  if (!screen) return;
  const box = new THREE.Box3().setFromObject(screen);
  const width = box.max.x - box.min.x;
  const height = box.max.y - box.min.y;
  return { w: width, h: height };
}

export function initCharacterPosition() {
  const screenX = window.innerWidth * 0.3;
  const screenY = window.innerHeight * 0.3;
  const worldPosition = getWorldPositionFromScreen(screenX, screenY, {
    zPlane: 0.3,
  });
  worldPosition.z = 0.3;
  character.object.position.copy(worldPosition);
  character.object.visible = true;
}
export function setCharacterPosition(x: number, y: number) {
  if (!screen || !character.object) return;

  // 取得 virtual screen plane 尺寸
  const bbox = new THREE.Box3().setFromObject(screen);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  const planeW = size.x;
  const planeH = size.y;

  // YOLO mask 座標 (0..CAPTURE_WIDTH, 0..CAPTURE_HEIGHT) → Plane UV (0..1)
  const u = x / 1920;
  const v = y / 1080;

  // UV → Plane 世界座標
  const planeX = (u - 0.5) * planeW;
  const planeY = (0.5 - v) * planeH; // Y 翻轉

  character.object.position.set(
    planeX,
    planeY,
    screen.position.z + 0.05 // 放在 plane 前方
  );

  // 角色面向相機
  character.object.lookAt(camera.position);
}

export function seekAnimate() {
  if (!character || !screen) return;
  const axis = new THREE.Vector3(0, 0, 1);
  character.object.rotateOnAxis(axis, Math.PI / 2);
  const scale = 0.05;
  character.object.scale.setScalar(scale);
  character.object.position.z = screen.position.z + 0.2;
  character.object.lookAt(screen.position);

  const screenBox = new THREE.Box3().setFromObject(screen);

  // 計算可用範圍，避免角色跑出邊界
  const minX = screenBox.min.x + character.size.x / 2;
  const maxX = screenBox.max.x - character.size.x / 2;
  const minY = screenBox.min.y + character.size.y / 2;
  const maxY = screenBox.max.y - character.size.y / 2;
  const randomX = Math.random() * (maxX - minX) + minX;
  const randomY = Math.random() * (maxY - minY) + minY;
  character.object.position.x = randomX;
  character.object.position.y = randomY;
  renderScene();

  return () => {
    // 隨機生成一個點
    const randomX = Math.random() * (maxX - minX) + minX;
    const randomY = Math.random() * (maxY - minY) + minY;
    character.object.position.x = randomX;
    character.object.position.y = randomY;
    if (Math.random() > 0.8) character.object.lookAt(camera.position);
    else character.object.lookAt(screen.position);
  };
}

export function hideAnimate() {
  let step = 0.001;
  let moved = 0;
  let distance = 0.01;
  character.object.visible = true;
  const scale = 0.03;
  character.object.scale.setScalar(scale);
  return () => {
    let isMove = Math.random() > 0.5 ? true : false;
    if (isMove) {
      if (Math.abs(moved) < distance) {
        character.object.position.x -= step;
        moved += step;
      } else {
        step *= -1;
        moved = 0;
      }
    }
  };
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
// 射線檢測
export function checkPoint(x: number, y: number) {
  pointer.x = (x / window.innerWidth) * 2 - 1;
  pointer.y = -(y / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(character.object, true); // true 表示檢測子物件
  if (intersects.length > 0) {
    console.log("擊中角色！", intersects[0]);
    return true;
  } else return false;
}

export function findAnimate() {
  if (!character) return;

  // 移除遮罩或其他 UI
  maskMesh.removeFromParent();
  screen.removeFromParent();

  // 設置角色位置
  const targetPos = getWorldPositionFromScreen(
    window.innerWidth * 0.5,
    window.innerHeight * 0.5,
    { zPlane: 0.5 }
  );
  character.object.position.copy(targetPos);
  character.object.lookAt(camera.position);
  character.visible = true;

  const initialScale = character.object.scale.x;

  // === 建立背景 Plane ===
  setBackground(new THREE.Color(0xfff9c4));

  // === 動畫狀態 ===
  let charScale = 0;
  let scaleDir = 1;

  return () => {
    // 角色跳動
    charScale += 0.0005 * scaleDir;
    if (charScale > 0.01 || charScale <= 0) {
      scaleDir *= -1;
    }
    character.object.scale.setScalar(initialScale + charScale);
  };
}

function loadModel(url: string): Promise<THREE.Object3D> {
  const gltfLoader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (err) => reject(err)
    );
  });
}

function getBoxAndSize(object: THREE.Object3D<THREE.Object3DEventMap>) {
  let bbox = new THREE.Box3().setFromObject(object);
  let size = new THREE.Vector3();
  bbox.getSize(size);
  return { box: bbox, size: size };
}
