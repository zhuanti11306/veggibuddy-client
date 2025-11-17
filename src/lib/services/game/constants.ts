import * as THREE from "three";
import ballNormal from "$assets/image/items/ball_normal.png";
import { scale } from "svelte/transition";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

export interface Env {
  camera: THREE.Camera;
  cameraPosi: THREE.Vector3;
  lookAt: THREE.Vector3;
  light: THREE.Light;
  lightPosi: THREE.Vector3;
}

export const ThrowingEnv: Env = {
  camera: new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  ),
  cameraPosi: new THREE.Vector3(0, 2, 5),
  lookAt: new THREE.Vector3(0, 0, 0),
  light: new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3),
  lightPosi: new THREE.Vector3(0.5, 1, 0.25),
} as const;

export const HideAndSeekEnv: Env = {
  camera: new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  ),
  cameraPosi: new THREE.Vector3(0, 0, 1),
  lookAt: new THREE.Vector3(0, 0, 0),
  light: new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3),
  lightPosi: new THREE.Vector3(0.5, 1, 0.25),
} as const;

export const Ball = {
  material: new THREE.MeshStandardMaterial({
    color: 0xff0000,
    roughness: 0.3,
    metalness: 0.1,
    normalMap: textureLoader.load(ballNormal),
  }),
  geometry: new THREE.SphereGeometry(0.5, 64, 64),
  visible: true,
  screenPosi: new THREE.Vector2(
    window.innerWidth / 2,
    window.innerHeight * 0.8
  ),
  distanceToCam: 3,
};

export const ParabolaLine = {
  material: new THREE.LineDashedMaterial({
    color: 0x444444,
    dashSize: 0.1,
    gapSize: 0.05,
    linewidth: 5,
  }),
  scale: 0.1,
  ratio: window.innerWidth / window.innerHeight,
};

export const TraceAnimate = {
  speed: 0.01,
  sideOffset: 1,
};

export const BallAnimate = {
  speed: 0.01,
  rotation: 0.05,
};

export const CaptureSize = {
  height: 1920,
  width: 1080,
};
