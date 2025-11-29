import * as THREE from "three";

import type { Pass } from 'three/addons/postprocessing/EffectComposer.js';
import { SAOPass } from 'three/addons/postprocessing/SAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { MapControls, OrbitControls, UnrealBloomPass } from "three/examples/jsm/Addons.js";

import { temperatureColor } from "$lib/utils/three/light";
import { GyroFineTuner } from "$lib/utils/three/gyro-fine-tuner";

import { GAME_CONFIG, SceneId } from "$lib/config";
import { assets } from "$lib/services";

export interface SceneCreateInfo {
    lights?(): THREE.Light[];
    camera(): THREE.Camera;
    loadScene?(scene: THREE.Scene): void | Promise<void>;
}

export interface SceneInitInfo<Controls, Info = void> extends SceneCreateInfo {
    updateControls?(controls: Controls): void;
    controls(camera: THREE.Camera, canvas: HTMLCanvasElement): Controls;

    composerPasses?(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): {
        /** 後製合成器，會自動更新大小 */
        passes: Pass[];
        /** 當畫面大小改變時呼叫，用於部份需要更新大小的通道 */
        sizeUpdate?: (width: number, height: number) => void;
    };

    info: Info;
}

export const sceneInfoMap = <const>{
    [SceneId.defaultRoom]: <SceneInitInfo<OrbitControls>>{
        info: void 0,

        lights() {
            const lights: THREE.Light[] = [];
            const ambient = new THREE.AmbientLight(0xffffff, 1);
            lights.push(ambient);
            
            const sun = new THREE.DirectionalLight(temperatureColor(3000), 10);
            lights.push(sun);

            sun.target.position.set(0, 0, 0);
            sun.position.set(-0.6240303246453015, 0.18594304681632223, -0.7589543709462294).setLength(2.5);

            sun.castShadow = true;

            sun.shadow.mapSize.width = 2048;
            sun.shadow.mapSize.height = 2048;
            
            sun.shadow.normalBias = 2 ** -6;
            sun.shadow.bias = -(2 ** -8);
            
            sun.shadow.camera.near = 0.0625;
            sun.shadow.camera.far = 6;

            return lights;
        },

        camera() {
            const camera = new THREE.PerspectiveCamera(GAME_CONFIG.THREE.FIELD_OF_VIEW, 1, GAME_CONFIG.THREE.NEAR_CLIPPING_PLANE, GAME_CONFIG.THREE.FAR_CLIPPING_PLANE);
            camera.lookAt(0, 0.125, 0);
            camera.position.set(0, 0.185, 0.3);

            return camera;
        },

        updateControls(controls: OrbitControls) {
            controls.update();
        },

        controls(camera: THREE.Camera, canvas: HTMLCanvasElement) {
            const controls = new OrbitControls(camera, canvas);
            controls.target.set(0, 0.08, 0);

            // 限制垂直旋轉角度
            controls.minPolarAngle = Math.PI / 8;
            controls.maxPolarAngle = Math.PI * 9 / 16;

            // 限制縮放距離
            controls.minDistance = 0.15;
            controls.maxDistance = 0.6;

            // 啟用旋轉阻尼效果
            controls.enableDamping = true;
            // 禁用平移
            controls.enablePan = false;

            return controls;
        },

        composerPasses(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
            const { width, height } = renderer.getSize(new THREE.Vector2());

            // 環境遮蔽通道
            const aoPass = new SAOPass(scene, camera);
            aoPass.params.saoBias = 0.5;
            aoPass.params.saoIntensity = 0.002;
            aoPass.params.saoScale = 2;
            aoPass.params.saoKernelRadius = 16;
            aoPass.params.saoMinResolution = 0;
            aoPass.params.saoBlur = true;
            aoPass.params.saoBlurRadius = 8;
            aoPass.params.saoBlurStdDev = 4;
            aoPass.params.saoBlurDepthCutoff = 0.01;

            // 泛光通道
            const unrealPass = new UnrealBloomPass(
                new THREE.Vector2(width, height),
                0.125, 0.03125, 0.995
            );

            // 景深通道
            const bokehPass = new BokehPass(scene, camera, {
                focus: 0.5,
                aperture: 0.0125,
                maxblur: 0.01
            });

            return {
                passes: [
                    aoPass,
                    unrealPass,
                    bokehPass,
                ],

                sizeUpdate(_deltaTime: number, _time: number) {
                    const { width, height } = renderer.getSize(new THREE.Vector2());
                    unrealPass.setSize(width, height);
                }
            };
        },

        async loadScene(scene: THREE.Scene) {

            await assets.loadSceneAssets(SceneId.defaultRoom).then(sceneAssets => {
                // 加入房間模型
                const roomModel = sceneAssets.models.room;
                if (roomModel.object)
                    scene.add(roomModel.object);

                // 設置環境貼圖
                const environment = sceneAssets.environment;
                if (environment?.envMap) {
                    const yRotation = Math.PI * 5 / 6;

                    scene.environment = environment.envMap;
                    scene.environmentRotation.y = yRotation;
                    scene.environmentIntensity = 1;

                    scene.background = environment.envMap;
                    scene.backgroundRotation.y = yRotation;
                };
            });
        }
    },

    [SceneId.throwingBallGame]: <SceneInitInfo<OrbitControls, { gyroTuner: GyroFineTuner }>>{
        info: {
            isDeviceOrientationSupported: "DeviceOrientationEvent" in window &&
                typeof DeviceOrientationEvent === "function",

            gyroTuner: new GyroFineTuner()
        },

        lights() {

            const sun = new THREE.DirectionalLight(temperatureColor(4000), 4);

            sun.target.position.set(0, 0, 0);
            sun.position.set(-0.5958726680193351, 0.6671024520583918, -0.44711337270090057).setLength(4);

            sun.castShadow = true;

            sun.shadow.mapSize.width = 1024;
            sun.shadow.mapSize.height = 1024;

            sun.shadow.camera.near = 0.0625;
            sun.shadow.camera.far = 12;

            sun.shadow.intensity = 1;
            
            sun.shadow.bias = -(2 ** -9);
            // sun.shadow.normalBias = 0.002;

            return [sun];
        },

        camera() {
            const camera = new THREE.PerspectiveCamera(GAME_CONFIG.THREE.FIELD_OF_VIEW, 1, GAME_CONFIG.THREE.NEAR_CLIPPING_PLANE, GAME_CONFIG.THREE.FAR_CLIPPING_PLANE);
            camera.position.set(0, .0859375, -1 / 2 ** 12);
            camera.lookAt(new THREE.Vector3(0, .0859375, 1));
            return camera;
        },

        composerPasses(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
            const { width, height } = renderer.getSize(new THREE.Vector2());

            // 環境遮蔽通道
            const aoPass = new SAOPass(scene, camera);
            aoPass.params.saoBias = 0.5;
            aoPass.params.saoIntensity = 0.002;
            aoPass.params.saoScale = 2;
            aoPass.params.saoKernelRadius = 8;
            aoPass.params.saoMinResolution = 0;
            aoPass.params.saoBlur = true;
            aoPass.params.saoBlurRadius = 8;
            aoPass.params.saoBlurStdDev = 4;
            aoPass.params.saoBlurDepthCutoff = 0.01;

            // 泛光通道
            const unrealPass = new UnrealBloomPass(
                new THREE.Vector2(width, height),
                0.125, 0.03125, 0.995
            );

            return {
                passes: [
                    aoPass,
                    unrealPass,
                ],

                sizeUpdate(_deltaTime: number, _time: number) {
                    const { width, height } = renderer.getSize(new THREE.Vector2());
                    unrealPass.setSize(width, height);
                }
            };
        },


        async loadScene(scene: THREE.Scene) {

            await assets.loadSceneAssets(SceneId.throwingBallGame).then(sceneAssets => {
                // 加入地板模型
                const floorModel = sceneAssets.models.field;
                if (floorModel.object)
                    scene.add(floorModel.object);

                // 設置環境貼圖
                const environment = sceneAssets.environment;
                if (environment?.envMap) {
                    const yRotation = Math.PI;

                    scene.environment = environment.envMap;
                    scene.environmentRotation.y = yRotation;
                    scene.environmentIntensity = 1;

                    scene.background = environment.envMap;
                    scene.backgroundRotation.y = yRotation;
                };
            });
        },

        updateControls(controls: OrbitControls) {
            controls.update();
            this.info.gyroTuner.applyTo(controls.object as THREE.Camera);
        },

        controls(camera: THREE.Camera, canvas: HTMLCanvasElement) {
            const orbit = new OrbitControls(camera, canvas);

            orbit.target.set(0, .0859375, 0);
            orbit.rotateSpeed = -.5; // 反向旋轉以符合第一人稱視角

            orbit.minPolarAngle = Math.PI * 3 / 7;
            orbit.maxPolarAngle = Math.PI * 3 / 5;

            orbit.maxDistance = 1 / 2 ** 12;

            orbit.enablePan = false;
            orbit.enableZoom = false;

            orbit.enableDamping = true;
            orbit.dampingFactor = 0.1;

            return orbit;
        }
    },

    [SceneId.hideNSeekGame]: <SceneInitInfo<MapControls>>{
        info: void 0,

        lights() {
            const lights: THREE.Light[] = [];

            const ambient = new THREE.AmbientLight(0xffffff, 3);
            lights.push(ambient);

            ambient.position.set(0.5, 1, 0.25);

            return lights;
        },

        camera() {
            const camera = new THREE.PerspectiveCamera(
                GAME_CONFIG.THREE.FIELD_OF_VIEW, 1,
                GAME_CONFIG.THREE.NEAR_CLIPPING_PLANE,
                GAME_CONFIG.THREE.FAR_CLIPPING_PLANE
            );

            camera.position.set(0, 1, 0);
            camera.lookAt(0, 0, 0);

            return camera;
        },

        updateControls(controls: MapControls) {
            controls.update();
        },

        controls(camera: THREE.Camera, canvas: HTMLCanvasElement) {
            const controls = new MapControls(camera, canvas);

            controls.enableRotate = false; // 禁止旋轉，保持 Top-down
            controls.enableZoom = false;
            controls.enablePan = false;
            // controls.enableDamping = true;
            // controls.screenSpacePanning = true; // 確保平移是在 XZ 平面上
            // controls.minDistance = 0.2;
            // controls.maxDistance = 5;

            return controls;
        },


    }
}