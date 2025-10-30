<script lang="ts">
    import type { Action } from "svelte/action";

    import * as THREE from "three";
    import * as THREEGPU from "three/webgpu";
    import { OrbitControls } from "three/addons/controls/OrbitControls.js";

    import { petModel } from "./canvas.action";

    const { children } = $props();

    const three: Action<HTMLDivElement> = function (container) {

        const canvas = container.querySelector("canvas");
        if (!canvas)
            throw new Error("Canvas element not found");

        // 設置相機參數
        const fieldOfView = 60;
        const nearClippingPlane = 0.0625;
        const farClippingPlane = 1024;

        // 創建場景
        const scene = new THREE.Scene();
        {
            scene.background = new THREE.Color();
        }

        // # 初始化相機
        const camera = new THREE.PerspectiveCamera(fieldOfView, 1, nearClippingPlane, farClippingPlane); // 先設置一個默認的寬高比，之後會根據畫布尺寸更新
        {
            camera.position.set(-5, 7, 5);
        }

        // # 初始化控制器
        const controls = new OrbitControls(camera, canvas);
        {
            // 限制垂直旋轉角度
            controls.minPolarAngle = 0; 
            controls.maxPolarAngle = Math.PI * 9 / 16;
            // 限制水平旋轉角度
            const currentAzimuth = Math.atan2(camera.position.x, camera.position.z);
            controls.minAzimuthAngle = currentAzimuth - Math.PI / 4 * 2;
            controls.maxAzimuthAngle = currentAzimuth + Math.PI / 4 * 2;
            // 啟用旋轉阻尼效果
            controls.enableDamping = true;
            // 禁用平移
            controls.enablePan = false;
        }

        // 添加光源
        const ambientLight = new THREE.AmbientLight(0xffffff, 2);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffcc, 2);
        scene.add(directionalLight);
        directionalLight.target.position.set(0, 0, 0);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.0625;
        directionalLight.shadow.camera.far = 64;
        directionalLight.shadow.bias = -0.002;

        // 根據是否支援 WebGPU 選擇渲染器
        // const RendererConstructor = (navigator.gpu) ? THREEGPU.WebGPURenderer : THREE.WebGLRenderer;
        const RendererConstructor = THREE.WebGLRenderer;

        // 初始化渲染器
        const renderer = new RendererConstructor({ canvas });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        // 監聽畫布尺寸變化，更新相機和渲染器設置
        function setSize() {
            const { clientWidth: width, clientHeight: height } = container;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            renderer.setSize(width, height);
        }

        setSize();
        // window.addEventListener("resize", setSize);
        new ResizeObserver(() => setSize()).observe(container);

        // 動畫循環

        let timeOrigin: number | undefined = undefined;

        async function main() {
            await petModel.whenLoaded

            if (petModel.object)
                scene.add(petModel.object);

            renderer.setAnimationLoop(animate);
        } 

        function animate(time: number, frame: any) {
            if (timeOrigin === undefined)
                timeOrigin = time;

            // 重設時間起點
            time -= timeOrigin;
            
            // 啟動控制器阻尼
            controls.update(time);

            renderer.render(scene, camera);
        }

        main();

        return {
            destroy() {
                window.removeEventListener("resize", setSize);
                renderer.setAnimationLoop(null);
                renderer.dispose();
            }
        }
    }
</script>

<style>
    .container {
        width: 100%;
        height: 100%;
        z-index: 1;
        background-color: white;
    }

    canvas {
        display: block;
        width: 100% !important;
        height: 100% !important;
        position: absolute;
        top: 0;
        left: 0;
        z-index: -1;
    }
</style>

<div class="container" use:three>
    <canvas></canvas>
    {@render children?.()}
</div>