import * as THREE from "three";
// import * as THREEGPU from "three/webgpu";

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SAOPass } from 'three/addons/postprocessing/SAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

import type { PetId } from "$lib/config";
import { assets, type PetAsset } from ".";
import { withLatestTask } from "$lib/utils/async/task";
import { BloomPass, DotScreenPass, GTAOPass, OrbitControls, OutlinePass, ShaderPass, SMAAPass, UnrealBloomPass } from "three/examples/jsm/Addons.js";
import { addAnimationLoop, clearAnimationLoop } from "$lib/utils/animation";
import { temperatureColor, wattToIntensity } from "$lib/utils/three/light";

const fieldOfView = 60;
const nearClippingPlane = 0.0625;
const farClippingPlane = 1024;

export const scene = createScene();
export const camera = createCamera();

function createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    // scene.background = new THREE.Color(0xff00b0ff);

    { // 設置光源
        const ambient = new THREE.AmbientLight(0xffffff, 1);
        scene.add(ambient);

        const sun = new THREE.DirectionalLight(temperatureColor(4000), 10);
        scene.add(sun);
        sun.target.position.set(0, 0, 0);
        sun.position.set(-2, 0.4, -1.4);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.0625;
        sun.shadow.camera.far = 12;
        sun.shadow.bias = -0.005;

        const dLightHelper = new THREE.DirectionalLightHelper(sun);
        scene.add(dLightHelper);

        // const lamp = new THREE.RectAreaLight(temperatureColor(5000), wattToIntensity(2, "led"), 0.5, 0.5);
        // const lamp = new THREE.SpotLight(temperatureColor(5000), wattToIntensity(2, "led"), 0, Math.PI * 15 / 16, .25);
        // scene.add(lamp);
        // lamp.position.set(-0.324615, 1.3365, 1.42584);
        // lamp.target.position.set(-0.324615, 0, 1.42584);
        // lamp.castShadow = true;
        // lamp.shadow.mapSize.width = 2048;
        // lamp.shadow.mapSize.height = 2048;
        // lamp.shadow.camera.near = 0.0625;
        // lamp.shadow.camera.far = 16;
        // lamp.shadow.bias = -0.0005;
        // lamp.shadow.radius = 4;

        // const lampHelper = new THREE.SpotLightHelper(lamp);
        // scene.add(lampHelper);
    }

    withLatestTask(
        createScene,
        async () => await assets.loadSceneAssets()
    ).then(sceneAssets => {
        const roomModel = sceneAssets.model;
        if (roomModel.object) {
            scene.add(roomModel.object);
        }

        const environment = sceneAssets.environment;
        if (environment.envMap) {
            const yRotation = Math.PI;

            scene.environment = environment.envMap;
            scene.environmentRotation.y = yRotation;
            scene.environmentIntensity = 1;

            scene.background = environment.envMap;
            scene.backgroundRotation.y = yRotation;

            console.log(scene);
        };
    });

    return scene;
}

function createCamera(): THREE.PerspectiveCamera {

    const camera = new THREE.PerspectiveCamera(fieldOfView, 1, nearClippingPlane, farClippingPlane); // 先設置一個默認的寬高比，之後會根據畫布尺寸更新
    camera.position.set(0, 0.06, 0.3);

    scene.add(camera);
    return camera;
}

export function createRenderer(container: HTMLElement, canvas: HTMLCanvasElement): { dispose: () => void, controls: OrbitControls, normalizeMat: THREE.Matrix3 } {
    const { clientWidth: width, clientHeight: height } = container;

    const controls = new OrbitControls(camera, canvas);
    {
        // 限制垂直旋轉角度
        controls.minPolarAngle = Math.PI / 8;
        controls.maxPolarAngle = Math.PI * 9 / 16;
        // 限制水平旋轉角度
        // const currentAzimuth = Math.atan2(camera.position.x, camera.position.z);
        // controls.minAzimuthAngle = currentAzimuth - Math.PI / 4 * 2;
        // controls.maxAzimuthAngle = currentAzimuth + Math.PI / 4 * 2;
        // 限制縮放距離
        controls.minDistance = 0.15;
        controls.maxDistance = 0.6;

        // 啟用旋轉阻尼效果
        controls.enableDamping = true;
        // 禁用平移
        controls.enablePan = false;
    }

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    {
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    const composer = new EffectComposer(renderer);
    {
        composer.setPixelRatio(window.devicePixelRatio);
        composer.setSize(width, height);

        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        const aoPass = new SAOPass(scene, camera);
        composer.addPass(aoPass);
        aoPass.params.saoBias = 0.5;
        aoPass.params.saoIntensity = 0.002;
        aoPass.params.saoScale = 2;
        aoPass.params.saoKernelRadius = 16;
        aoPass.params.saoMinResolution = 0;
        aoPass.params.saoBlur = true;
        aoPass.params.saoBlurRadius = 8;
        aoPass.params.saoBlurStdDev = 4;
        aoPass.params.saoBlurDepthCutoff = 0.01;

        const unrealPass = new UnrealBloomPass(
            new THREE.Vector2(width * window.devicePixelRatio, height * window.devicePixelRatio),
            0.125, 0.03125, 0.995
        );
        composer.addPass(unrealPass);

        const bokehPass = new BokehPass(scene, camera, {
            focus: 0.5,
            aperture: 0.0125,
            maxblur: 0.01
        });
        composer.addPass(bokehPass);

        const antialiasPass = new SMAAPass();
        composer.addPass(antialiasPass);


        const outputPass = new OutputPass();
        composer.addPass(outputPass);

        // const pass = new DotScreenPass(new THREE.Vector2(0, 0), 0.5, 0.8);
        // composer.addPass(pass);
    }

    // 標準化裝置座標轉換矩陣

    const normalizeMat = new THREE.Matrix3().set(
        2 / width, 0, -1,
        0, -2 / height, 1,
        0, 0, 1
    );

    // 響應式調整畫布尺寸

    function setSize() {
        const { clientWidth: width, clientHeight: height } = container;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);

        normalizeMat.set(
            2 / width, 0, -1,
            0, -2 / height, 1,
            0, 0, 1
        );
    }

    const observer = new ResizeObserver(setSize);
    observer.observe(container);

    // 動畫循環

    function animate(deltaTime: number) {

        // 更新控制器
        controls.update(deltaTime);

        // 渲染場景
        composer.render();
    }

    addAnimationLoop(animate);

    // 返回控制器和銷毀函數

    return {
        controls,

        normalizeMat,

        dispose: () => {
            clearAnimationLoop(animate);
            renderer.dispose();
            composer.dispose();
            observer.disconnect();
        }
    };
}

let currentPet: PetAsset | null = null;

export async function setupPet(petId: PetId) {
    const oldPet = currentPet;
    const nextPet = assets.petAssets[petId];

    return withLatestTask(setupPet, async () => {
        await assets.loadCharacterAssets(petId);
    }).then(() => {
        if (oldPet?.model.object) scene.remove(oldPet.model.object);
        if (nextPet.model.object) scene.add(nextPet.model.object);
        currentPet = nextPet;
    });
}

let timeOrigin: number | null = null;
export function animate(time: number, frame: any) {
    if (timeOrigin === null) timeOrigin = time;

    const delta = time - timeOrigin;
    timeOrigin = time;

    // 更新寵物模型動畫

}