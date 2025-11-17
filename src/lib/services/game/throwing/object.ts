import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Ball, BallAnimate, ParabolaLine, TraceAnimate } from "../constants";
import {
  addToScene,
  camera,
  getWorldPositionFromScreen,
  startAnimationLoop,
} from "../threeJS";
import charactorModel from "$assets/pet/carrot/carrot.glb?url";
import floorModel from "$assets/pet/floor.glb?url";
import { showNotice } from "../notice";

let ball: THREE.Mesh;
const character = {
  object: new THREE.Group(),
  size: { x: 0, y: 0, z: 0 },
  visible: false,
  box: new THREE.Box3(),
};
let floor!: THREE.Object3D;
let parabolaLine!: THREE.Line;

let ballPrediction!: THREE.Vector3;
let parabolaPoints: THREE.Vector3[] = [];

let camDir = new THREE.Vector3();

export async function initObject() {
  console.log("initObject: start");

  ball = createBall();
  console.log("initObject: ball created");

  await initCharacter();
  console.log("initObject: character initialized");

  await initFloor();
  console.log("initObject: floor initialized");

  initParabolaLine();
  console.log("initObject: parabola line initialized");

  initBallPosition();
  console.log("initObject: ball position set");

  initCharacterPosition();
  console.log("initObject: character position set");

  console.log("initObject: done");
}

async function initCharacter() {
  const model = await loadModel(charactorModel);
  character.object.add(model);
  const objInfo = getBoxAndSize(character.object);
  character.size = {
    x: objInfo.size.x,
    y: objInfo.size.y,
    z: objInfo.size.z,
  };
  character.box = objInfo.box;
  const scale = 1 / character.size.x;
  character.object.scale.setScalar(scale);
  character.visible = true;
  addToScene(character.object);
}

function createBall(): THREE.Mesh {
  let sphere = new THREE.Mesh(Ball.geometry, Ball.material);
  sphere.visible = Ball.visible;
  addToScene(sphere);
  return sphere;
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

// 初始球位置
export function initBallPosition() {
  let posi = getWorldPositionFromScreen(Ball.screenPosi.x, Ball.screenPosi.y, {
    distance: Ball.distanceToCam,
  });
  posi.y = getFloorHeightAt(posi.x, posi.z);
  if (!posi || isNaN(posi.x) || isNaN(posi.y) || isNaN(posi.z)) {
    console.error("posi 無效！camera.matrixWorld 還沒更新？");
  }

  ball.position.copy(posi);
  ball.position.y = Math.max(ball.position.y, 0.5);
}

export function initCharacterPosition() {
  character.object.position.copy(ball.position);
  character.object.position.x += 1;
  character.object.position.z -= 1;
  character.object.position.y += -character.box.min.y; // 停在地板上
  character.object.lookAt(camera.position);
}

// === 地板 ===
async function initFloor() {
  floor = new THREE.Group();
  const model = await loadModel(floorModel);
  floor.add(model);
  floor.position.set(0, 0, 0);
  addToScene(floor);
  updateFloorSize();
}

// 自動填滿鏡頭可視區域
export function updateFloorSize() {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;
  camera as THREE.PerspectiveCamera;
  const distance = camera.position.y - floor.position.y;
  const fovInRad = (camera.fov * Math.PI) / 180;
  const height = 2 * Math.tan(fovInRad / 2) * distance;
  const width = height * camera.aspect;
  floor.scale.set(width, 1, height);
}

// 預先初始化
const raycaster = new THREE.Raycaster();
const rayOrigin = new THREE.Vector3();
const rayDirection = new THREE.Vector3(0, -1, 0);
export function getFloorHeightAt(x: number, z: number): number {
  // 設置射線起點
  rayOrigin.set(x, 1000, z);
  raycaster.set(rayOrigin, rayDirection);

  // 檢測
  const intersects = raycaster.intersectObject(floor, true);
  if (intersects.length > 0) {
    return intersects[0].point.y;
  } else {
    return floor.position.y;
  }
}

// === 初始化拋物線終點 ===
export function initParabolaLine() {
  if (parabolaLine && parabolaLine.visible) parabolaLine.visible = false;
  camera.getWorldDirection(camDir);
  camDir.normalize();
  const maxDistance = 3; // 最大拋射距離
  ballPrediction = ball.position
    .clone()
    .add(camDir.multiplyScalar(maxDistance));
  const geometry = ball.geometry as THREE.SphereGeometry;
  ballPrediction.y = floor.position.y + geometry.parameters.radius; // 保證預測球落地
}

// 預先初始化向量與幾何
let start = new THREE.Vector3();
let end = new THREE.Vector3();
const cameraUp = new THREE.Vector3(0, 1, 0);
const cameraRight = new THREE.Vector3();
// === 畫拋物線 ===
export function drawParabolaLine(deltaX = 0, deltaY = 0) {
  // 取得相機方向
  camera.getWorldDirection(camDir).normalize();
  cameraRight.crossVectors(camDir, cameraUp).normalize();

  ballPrediction.addScaledVector(cameraRight, deltaX * ParabolaLine.scale);
  ballPrediction.addScaledVector(camDir, deltaY * ParabolaLine.scale);

  // 計算球體預測位置
  end.copy(ballPrediction);

  start.copy(ball.position);

  const geometry = ball.geometry as THREE.SphereGeometry;
  const floorY = getFloorHeightAt(end.x, end.z);
  end.y = floorY + geometry.parameters.radius;

  parabolaPoints = computeParabola(start, end);
  if (!parabolaLine) {
    // 只會執行一次
    const geom = new THREE.BufferGeometry().setFromPoints(parabolaPoints);
    parabolaLine = new THREE.Line(geom, ParabolaLine.material);
    parabolaLine.computeLineDistances();
    addToScene(parabolaLine);
  } else {
    const geom = parabolaLine.geometry as THREE.BufferGeometry;
    geom.setFromPoints(parabolaPoints);
    (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    geom.setDrawRange(0, parabolaPoints.length);
  }
  parabolaLine.visible = true;
}

// === 計算拋物線 ===
function computeParabola(start: THREE.Vector3, end: THREE.Vector3) {
  const mid = start.clone().lerp(end, 0.5);
  const distance = start.distanceTo(end);
  mid.y += distance * ParabolaLine.ratio;

  const points: THREE.Vector3[] = [];
  const segments = 50;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3()
      .copy(start)
      .multiplyScalar((1 - t) * (1 - t))
      .add(mid.clone().multiplyScalar(2 * (1 - t) * t))
      .add(end.clone().multiplyScalar(t * t));
    points.push(p);
  }
  return points;
}

// === 角色追球動畫 ===
export function traceBallAnimate() {
  const frustum = new THREE.Frustum();
  const camMatrix = new THREE.Matrix4();

  function animateCharactor() {
    if (!parabolaPoints.length || !ball || !character.object) return;

    // 更新視錐體
    camMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(camMatrix);

    if (!frustum.containsPoint(ball.position)) {
      character.object.lookAt(camera.position);
      showNotice?.("哎呀！球跑掉了！快動動手機或滑桿，把它找回來吧！", 3000);
      return;
    }

    const startPoint = parabolaPoints[0];
    const endPoint = parabolaPoints[parabolaPoints.length - 1];
    if (!startPoint || !endPoint) return;
    const ballDir = endPoint.clone().sub(startPoint).normalize();
    const rightDir = new THREE.Vector3(0, 1, 0).cross(ballDir).normalize();
    const camToBall = ball.position.clone().sub(camera.position);
    const dist = camToBall.length();
    const dynamicOffset = Math.min(dist * 0.1, 1.0);

    const targetPos = ball.position
      .clone()
      .sub(ballDir.clone().multiplyScalar(dynamicOffset))
      .sub(rightDir.clone().multiplyScalar(TraceAnimate.sideOffset));

    const floorY = getFloorHeightAt(targetPos.x, targetPos.z);
    const bbox = new THREE.Box3().setFromObject(character.object);
    const charactorHeight = bbox.max.y - bbox.min.y;

    targetPos.y = floorY + charactorHeight * 0.3;

    const moveDir = targetPos.clone().sub(character.object.position);
    const distance = moveDir.length();
    if (distance > 0.1) {
      character.object.lookAt(ball.position);
      character.object.position.add(
        moveDir.normalize().multiplyScalar(distance * TraceAnimate.speed)
      );
    } else {
      character.object.lookAt(camera.position);
      character.object.position.copy(targetPos);
      startAnimationLoop(() => {});
      return;
    }
  }

  return animateCharactor;
}

// === 球運動動畫 ===
export function sphereAnimate() {
  let progress = 0;

  function animate() {
    if (!parabolaPoints.length || !ball || !floor) return;
    const index = Math.floor(progress * (parabolaPoints.length - 1));
    const point = parabolaPoints[index];
    if (point) {
      ball.position.copy(point);
      ball.rotation.x += BallAnimate.rotation;
      ball.rotation.y += BallAnimate.rotation;
      progress += BallAnimate.speed;
    }
  }

  return animate;
}
