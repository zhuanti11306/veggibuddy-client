import type { Action } from "svelte/action";

import { CanvasTexture, LinearFilter, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, PlaneGeometry, SRGBColorSpace, TextureLoader, Vector2, Vector3 } from "three";

import { SceneId } from "$lib/config";
import { assets, game, model, type PetAsset, type SceneInitResult } from "$lib/services";
import { clearAnimationLoop, addAnimationLoop } from "$lib/utils/animation";
import { Api, api } from "$lib/apis";

type HideNSeekSceneInitResult = SceneInitResult<any, any>;

let sceneInitResult: HideNSeekSceneInitResult | null = null;
const { promise: sceneModelPromise, resolve: resolveSceneModel } = Promise.withResolvers<HideNSeekSceneInitResult>();

const SCENE_PANEL_WIDTH = 3; 
const CAMERA_Y = 1;

// 寵物載入

const pet = $derived(game.petInfo.isLegal ? { id: game.petInfo.type, assets: assets.petAssets[game.petInfo.type] } : null);
const { promise: petPromise, resolve: resolvePet } = Promise.withResolvers<Object3D>();
let currentPet: PetAsset | null = null;

export function registerPetSetup() {
    $effect(() => {
        if (!pet)
            return void game.getPetInfo();

        const petId = pet.id;

        Promise.all([
            assets.loadCharacterAssets(petId),
            sceneModelPromise
        ]).then(([petAsset, { scene }]) => {
            if (petAsset.model.object) {
                scene.add(petAsset.model.object);
                petAsset.model.object.position.set(0, 0, 0);
                petAsset.model.object.rotateZ(-Math.PI / 2);
                petAsset.model.object.rotateY(Math.PI);

                resolvePet(petAsset.model.object);
            }

            if (currentPet?.model.object) {
                scene.remove(currentPet.model.object);
            }

            currentPet = petAsset;
        })
    });
}

// 影片畫面截圖相關

let videoCanvasObject: { canvas: HTMLCanvasElement, context: CanvasRenderingContext2D } | null = null;
const meshes: Object3D[] = [];

export async function capture() {
    if (!videoCanvasObject) return console.warn("[WRN] Video canvas not initialized.");
    if (!sceneInitResult) return console.warn("[WRN] Scene not initialized.");

    if (meshes.length) {
        sceneInitResult.scene.remove(...meshes);
        meshes.length = 0;
    }

    const { width, height } = videoCanvasObject.canvas;
    const { scene, camera } = sceneInitResult;
    
    // 1. 取得影像並建立地板
    const imageData = videoCanvasObject.context.getImageData(0, 0, width, height);
    const screenMesh = createScreenMesh(imageData, camera as PerspectiveCamera);
    scene.add(screenMesh);
    meshes.push(screenMesh);

    const screenMeshY = screenMesh.position.y;

    // 2. 轉成 Blob 準備上傳
    const { canvas } = videoCanvasObject;
    canvas.toBlob(async (blob) => {
        if (!blob) return;

        // TODO: 這裡可以播放一個「分析中...」的 UI Loading 動畫

        // const formData = new FormData();
        // formData.append("file", blob, "frame.jpg");

        try {
            // 3. 呼叫後端偵測 API
            // 請替換成你實際的 API Endpoint
            const result = await api(Api.imageObjectDetection, { file: blob });
            
            if (result.hidingPoint && currentPet?.model.object) {
                console.log("偵測成功，隱藏點:", result.hidingPoint);

                // 4. 設定遮罩
                const maskMesh = addMaskToScene(result.mask, screenMesh, imageData, camera as PerspectiveCamera);
                scene.add(maskMesh);
                meshes.push(maskMesh);

                const maskMeshY = maskMesh.position.y;

                // 5. 設定角色位置
                // const { x, y } = result.hidingPoint;
                // // 傳入原始影像尺寸以正確計算比例
                // const worldPos = mapPixelToWorld(x, y, width, height);
                
                // // 更新角色位置
                // const petY = maskMeshY;
                // const petX = worldPos.x * (1 - maskMeshY);
                // const petZ = worldPos.z * (1 - maskMeshY);
                
                // currentPet.model.object.position.set(petX, petY, petZ);
                // currentPet.model.object.visible = true;

                const { x, y } = result.hidingPoint;
        
                // 使用地板的寬高來計算水平位置 (因為 mapPixelToWorld 是基於全景的)
                // 注意：這裡還是要傳入地板的原始寬高，不能傳 Mask 的寬高
                const worldPos = mapPixelToWorld(screenMesh, x, y, canvas.width, canvas.height); // 需修改 mapPixelToWorld 內部使用 screenMesh 的原始尺寸
                
                const petY = screenMesh.position.y; // 寵物站在地板上
                
                // 如果你的寵物中心點在腳底，這樣設是對的。
                // 如果寵物中心點在肚子，可能要設 petY + petHeight/2
                
                currentPet.model.object.position.set(worldPos.x, petY, worldPos.z);
                currentPet.model.object.renderOrder = 1; // 畫在地板後、Mask 前
                
                // 讓角色面向鏡頭 (Optional, 視需求)
                currentPet.model.object.lookAt(camera.position);

                // 6. 開始遊戲互動
                enableInteraction();

            } else {
                console.log("未偵測到合適的隱藏點，請重試");
                alert("這裡好像沒有地方可以躲，換個地方拍拍看吧！");
                // 這裡可以做 reset 邏輯

                scene.remove(...meshes);
                meshes.length = 0;

            }

        } catch (error) {
            console.error("偵測發生錯誤:", error);
            alert("連線錯誤，請稍後再試");
        }

    }, "image/jpeg");
}

let screenDimensions = { width: 1, height: 1 };
let screenMesh: Mesh | null = null;
let maskMesh: Mesh | null = null;
let interactionCleanup: (() => void) | null = null; // 用於移除事件監聽

function createScreenMesh(imageData: ImageData, camera: PerspectiveCamera) {

    if (screenMesh) {
        screenMesh.geometry.dispose();
        if (Array.isArray(screenMesh.material)) {
            screenMesh.material.forEach(m => m.dispose());
        } else {
            screenMesh.material.dispose();
        }
        sceneInitResult?.scene.remove(screenMesh);
    }

    const videoTexture = new CanvasTexture(imageData);
    videoTexture.minFilter = LinearFilter;
    videoTexture.magFilter = LinearFilter;
    videoTexture.colorSpace = SRGBColorSpace;
    videoTexture.needsUpdate = true;

    const panelWidth = SCENE_PANEL_WIDTH; // 寬度 10
    const panelHeight = imageData.height / imageData.width * panelWidth;

    const geometry = new PlaneGeometry(panelWidth, panelHeight);
    geometry.rotateX(-Math.PI / 2);
    const material = new MeshBasicMaterial({ map: videoTexture });

    const screen = new Mesh(geometry, material);
    screen.position.set(0, 0, 0);

    const fovRad = (camera.fov * Math.PI) / 180;
    const halfHeight = panelHeight / 2;
    const distanceToCamera = halfHeight / Math.tan(fovRad / 2);

    const screenY = CAMERA_Y - distanceToCamera;
    screen.position.y = screenY;

    screen.userData = { 
        width: panelWidth, 
        height: panelHeight, 
        distanceToCamera: distanceToCamera,
        y: screenY
    };

    // const panelWidth = backgroundPanelWidth;
    // const panelHeight = imageData.height / imageData.width * panelWidth;

    // const geometry = new PlaneGeometry(panelWidth, panelHeight);
    // geometry.rotateX(-Math.PI / 2);

    // const material = new MeshBasicMaterial({ map: videoTexture });

    // const screen = new Mesh(geometry, material);
    // screen.position.x = 0;
    // screen.position.z = 0;

    // const fovRad = (camera.fov * Math.PI) / 180;
    // const halfHeight = panelHeight / 2;
    // const distance = halfHeight / Math.tan(fovRad / 2);
    
    // screen.position.y = (1 - distance);
    
    // console.log("[DBG] Screen position y:", screen.position.y);

    // screen.renderOrder = 1;

    // screenMesh = screen;

    screen.renderOrder = 0;
    screenMesh = screen;
    return screen;

    return screen;
}

function mapPixelToWorld(screenMesh: Mesh, x: number, y: number, imgW: number, imgH: number): Vector3 {
    // // 1. 計算 UV 比例 (範圍 -0.5 ~ 0.5，因為 Plane 中心在 0,0)
    // // 注意：YOLO 的 Y 通常是由上往下算，而 3D 的 Z (對應螢幕 Y) 也是由上往下 (視角決定)
    // // 這裡假設 Texture 沒有被垂直翻轉
    // const u = (x / imgW) - 0.5;
    // const v = (y / imgH) - 0.5; 

    // // 2. 映射到世界尺寸
    // const worldX = u * screenDimensions.width;
    // // 在 Top-Down 視角 (rotateX -90deg)，原本圖片的 Y 變成了 3D 的 Z 軸
    // const worldZ = v * screenDimensions.height; 

    // // y = 0.05 讓它稍微浮在地板上，避免 Z-fighting (閃爍)
    // return new Vector3(worldX, 0.005, worldZ); 

    // 這裡必須用 Screen (背景) 的尺寸，因為 hidingPoint 是基於整張圖的座標
    const targetWidth = screenMesh.userData.width; 
    const targetHeight = screenMesh.userData.height;

    const u = (x / imgW) - 0.5;
    const v = (y / imgH) - 0.5; 

    const worldX = u * targetWidth;
    const worldZ = v * targetHeight; 

    return new Vector3(worldX, 0, worldZ); 
}

function addMaskToScene(maskBase64: string, screenMesh: Mesh, imageData: ImageData, camera: PerspectiveCamera) {
    // 清理舊遮罩
    if (maskMesh) {
        maskMesh.geometry.dispose();
        (maskMesh.material as MeshBasicMaterial).dispose();
        maskMesh.removeFromParent();
    }

    // 載入 Mask 圖片
    const loader = new TextureLoader();
    const alphaMap = loader.load(`data:image/png;base64,${maskBase64}`);
    console.log(`[DBG] data:image/png;base64,${maskBase64}`);
    
    // 使用與地板相同的 Texture，但加上 Alpha Map
    // 這樣看起來就像是把物體「摳」出來放在上層
    const originalTexture = (screenMesh.material as MeshBasicMaterial).map;

    // const panelWidth = maskPanelWidth;
    // const panelHeight = imageData.height / imageData.width * panelWidth;

    // const geometry = new PlaneGeometry(panelWidth, panelHeight);
    // geometry.rotateX(-Math.PI / 2);

    // const material = new MeshBasicMaterial({
    //     map: originalTexture,
    //     alphaMap: alphaMap,
    //     transparent: true,
    //     opacity: 1,
    //     alphaTest: 0.1, // 重要：裁切掉透明度過低的部分
    // });

    // maskMesh = new Mesh(geometry, material);

    // maskMesh.position.x = 0;
    // maskMesh.position.z = 0;

    // const fovRad = (camera.fov * Math.PI) / 180;
    // const halfHeight = panelHeight / 2;
    // const distance = halfHeight / Math.tan(fovRad / 2);

    // maskMesh.position.y = 1 - distance;
    // maskMesh.renderOrder = 2; // 確保在最後繪製 (處理透明度問題)

    // console.log("[DBG] Mask position y:", maskMesh.position.y);
    // return maskMesh;

    // 取得地板的資訊
    const screenInfo = screenMesh.userData;
    
    // 設定預留給寵物的空間高度 (例如 0.5 單位)
    // 這決定了 Mask 會浮在地板上方多少距離
    const petClearanceHeight = 0.5; 
    
    // Mask 的新位置 (地板高度 + 寵物空間)
    const maskY = screenInfo.y + petClearanceHeight;
    
    // 計算縮放比例 (Thales theorem / 相似三角形)
    // 新距離 / 舊距離
    const newDistanceToCamera = screenInfo.distanceToCamera - petClearanceHeight;
    const scaleRatio = newDistanceToCamera / screenInfo.distanceToCamera;

    // Mask 的寬高必須根據距離縮小，這樣視覺上才會跟背景重疊
    const maskWidth = screenInfo.width * scaleRatio;
    const maskHeight = screenInfo.height * scaleRatio;

    const geometry = new PlaneGeometry(maskWidth, maskHeight);
    geometry.rotateX(-Math.PI / 2);

    const material = new MeshBasicMaterial({
        map: originalTexture,
        alphaMap: alphaMap,
        transparent: true,
        opacity: 1,
        alphaTest: 0.1,
    });

    maskMesh = new Mesh(geometry, material);
    maskMesh.position.set(0, maskY, 0); // 設定在算好的高度

    maskMesh.renderOrder = 2; // 確保畫在最上層

    console.log(`[DBG] ScreenY: ${screenInfo.y}, MaskY: ${maskY}, Ratio: ${scaleRatio}`);
    
    return maskMesh;
}

export const action: Action<HTMLElement> = function (container) {

    const canvas = container.querySelector("#pet");
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) throw new Error("Canvas element not found in container.");

    const videoCanvas = container.querySelector("#video");
    if (!videoCanvas || !(videoCanvas instanceof HTMLCanvasElement)) throw new Error("Video element not found in container.");
    videoCanvasObject = { canvas: videoCanvas, context: videoCanvas.getContext("2d")! };

    const video = container.querySelector("video");
    if (!video || !(video instanceof HTMLVideoElement)) throw new Error("Video element not found in container.");

    // 初始化場景

    const result = sceneInitResult = model.initScene(container, canvas, SceneId.hideNSeekGame);
    resolveSceneModel(result);

    let dispose: (() => void) | null = null;

    Promise.all([
        petPromise,
        getUserMedia(video, videoCanvas),
    ]).then(([petObject, disposeGetUserMedia]) => {
        dispose = () => {
            disposeGetUserMedia();
        };
    });


    const observer = new ResizeObserver(() => {
        const { clientWidth: width, clientHeight: height } = container;
        videoCanvas!.width = width;
        videoCanvas!.height = height;
    });

    observer.observe(container);

    return {
        destroy() {
            result.dispose();
            dispose?.();
        }
    }
};

function getUserMedia(videoElement: HTMLVideoElement, canvasElement?: HTMLCanvasElement) {
    let stream: MediaStream | null = null;

    const context = canvasElement?.getContext("2d")!;
    if (!context) throw new Error("Cannot get 2D context from canvas.");

    function drawToCanvas() {

        if (videoElement.paused || videoElement.ended) return;
        if (videoElement.readyState < 2 || videoElement.videoWidth === 0) return;

        const { width, height } = canvasElement!;

        if (!width || !height) return;

        const { videoHeight, videoWidth } = videoElement;
        const scale = Math.max(width / videoWidth, height / videoHeight);


        context.save();
        context.translate(width / 2, height / 2);
        context.rotate(Math.PI / 2);
        context.scale(scale, scale);

        context.drawImage(videoElement, -videoWidth / 2, -videoHeight / 2, videoWidth, videoHeight);
        context.restore();
    }

    addAnimationLoop(drawToCanvas);

    navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" }, audio: false })
        .then(streamObject => { videoElement.srcObject = stream = streamObject; videoElement.play() });

    return () => {
        clearAnimationLoop(drawToCanvas);

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    };
}

function enableInteraction() {
    // 先清理舊的監聽器
    if (interactionCleanup) interactionCleanup();

    const pointer = new Vector2();
    const container = sceneInitResult!.controls.domElement; // 通常是 canvas 或其容器

    const onClick = (event: MouseEvent) => {
        if (!currentPet?.model.object || !sceneInitResult) return;

        // 計算滑鼠在 Canvas 上的標準化座標 (-1 到 +1)
        const rect = container.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        model.raycaster.setFromCamera(pointer, sceneInitResult.camera);

        // 檢測是否點到角色
        // recursive = true 表示連同角色的子物件一起檢測
        const intersects = model.raycaster.intersectObject(currentPet.model.object, true);
        if (intersects.length > 0) {
            console.log("Found it! Hit:", intersects[0]);
            
            // 觸發找到後的邏輯
            onCharacterFound();
        }
    };

    container.addEventListener('click', onClick);

    interactionCleanup = () => {
        container.removeEventListener('click', onClick);
    };
}

function onCharacterFound() {
    // 這裡實作找到後的動畫
    // 1. 讓角色跳起來或變大
    // 2. 移除遮罩 maskMesh.visible = false
    // 3. 彈出結算視窗
    if (currentPet?.model.object) {
        // 簡單範例：讓角色變大並跳出來
        currentPet.model.object.position.y = 1.0; 
        currentPet.model.object.scale.setScalar(currentPet.model.object.scale.x * 1.5);
    }
    if (maskMesh) {
        // 選擇性：讓遮罩淡出或直接移除
        maskMesh.visible = false; 
    }
    
    // 清除點擊監聽
    if (interactionCleanup) interactionCleanup();
    alert("恭喜找到寵物！");
    
    sceneInitResult!.scene.remove(...meshes);
    meshes.length = 0;
}