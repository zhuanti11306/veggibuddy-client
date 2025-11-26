import * as THREE from "three";

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from "three/examples/jsm/Addons.js";

import { addAnimationLoop, clearAnimationLoop } from "$lib/utils/animation";
import { sceneInfoMap, type SceneCreateInfo, type SceneInitInfo } from "./scene-info";

function createScene(info: SceneCreateInfo): { scene: THREE.Scene, camera: THREE.Camera } {
    const scene = new THREE.Scene();

    // 設置燈光
    if (info.lights) {
        for (const light of info.lights())
            scene.add(light);
    }

    // 設置相機
    const camera = info.camera();
    scene.add(camera);

    // 載入場景內容
    if (info.loadScene)
        info.loadScene(scene);

    // 返回場景和相機
    return { scene, camera };
}


export interface SceneInitResult<Controls, Info = void> {
    /** 註消函數 */
    dispose: () => void;

    /** 控制器 */
    controls: Controls;

    /** 相機 */
    camera: THREE.Camera;

    /** 場景物件 */
    scene: THREE.Scene;

    /** 標準化裝置座標轉換矩陣 */
    pointerNormalize: THREE.Matrix3;

    info: Info;
}

export function initScene<K extends keyof typeof sceneInfoMap>(container: HTMLElement, canvas: HTMLCanvasElement, sceneInfo: K): SceneInitResult<ReturnType<typeof sceneInfoMap[K]["controls"]>, typeof sceneInfoMap[K]["info"]>;
export function initScene<Controls, Info>(container: HTMLElement, canvas: HTMLCanvasElement, sceneInfo: SceneInitInfo<Controls, Info>): SceneInitResult<Controls, Info>;
export function initScene<Controls, Info>(container: HTMLElement, canvas: HTMLCanvasElement, sceneInfo: SceneInitInfo<Controls, Info> | keyof typeof sceneInfoMap): SceneInitResult<Controls, Info> {
    const { clientWidth: width, clientHeight: height } = container;

    // 如果是已定義的場景資訊名稱，則取得對應的場景資訊物件
    if (typeof sceneInfo === "string") {
        if (!sceneInfoMap[sceneInfo]) // 找不到對應的場景資訊物件，拋出錯誤
            throw new Error(`SceneInfo '${sceneInfo}' not found.`);
        sceneInfo = sceneInfoMap[sceneInfo] as typeof sceneInfoMap[typeof sceneInfo] as SceneInitInfo<Controls, Info>;
    }

    const info: SceneInitInfo<Controls, Info> = sceneInfo;

    const { scene, camera } = createScene(info);
    const whenSizeChangedCallbacks: ((width: number, height: number) => void)[] = [];

    const controls = info.controls(camera, canvas);

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

        // 基本渲染通道
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        if (info.composerPasses) {

            const { passes, sizeUpdate } = info.composerPasses(renderer, scene, camera);
            for (const pass of passes) {
                composer.addPass(pass);
            }

            if (sizeUpdate)
                whenSizeChangedCallbacks.push(sizeUpdate);
        }

        // 抗鋸齒通道
        composer.addPass(new SMAAPass());
        // 最終輸出通道
        composer.addPass(new OutputPass());
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

        // 如果是透視相機，則更新其長寬比
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }

        // 更新渲染器和後製合成器尺寸
        renderer.setSize(width, height);

        // 更新後製合成器尺寸
        composer.setSize(width, height);

        // 通知所有註冊的尺寸改變回調
        for (const callback of whenSizeChangedCallbacks) {
            callback(width, height);
        }

        // 更新標準化裝置座標轉換矩陣
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
        if (info.updateControls)
            info.updateControls(controls);

        // 渲染場景
        composer.render(deltaTime);
    }

    addAnimationLoop(animate);

    // 返回控制器和銷毀函數

    return {
        scene,
        camera,
        controls,
        info: sceneInfo.info,

        pointerNormalize: normalizeMat,

        dispose: () => {
            clearAnimationLoop(animate);
            renderer.dispose();
            if (composer)
                composer.dispose();
            observer.disconnect();
        }
    };
}

export const raycaster = new THREE.Raycaster();