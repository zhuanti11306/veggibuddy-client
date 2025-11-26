
import { onMount } from "svelte";
import type { Action } from "svelte/action";

import { Camera, Vector2 } from "three";
import type { OrbitControls } from "three/examples/jsm/Addons.js";

import { assets, game, model, interact, type PetAsset, type SceneInitResult } from "$lib/services";
import { addAnimationLoop, clearAnimationLoop } from "$lib/utils/animation";
import { GAME_CONFIG, SceneId } from "$lib/config";

let sceneInitResult = null as SceneInitResult<OrbitControls, void> | null;

// 長按相關

export const enum LongPressState {
    Inactived,
    Detecting,
    Activated
}

export const longPress = $state({
    pressPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    lastPosition: { x: 0, y: 0 },

    INACTIVED: <const> LongPressState.Inactived,
    DETECTING: <const> LongPressState.Detecting,
    ACTIVATED: <const> LongPressState.Activated,

    get pressPositionVec() {
        return new Vector2(this.pressPosition.x, this.pressPosition.y);
    },

    set pressPositionVec(vec: Vector2) {
        this.pressPosition.x = this.currentPosition.x = this.lastPosition.x = vec.x;
        this.pressPosition.y = this.currentPosition.y = this.lastPosition.y = vec.y;
    },

    get currentPositionVec() {
        return new Vector2(this.currentPosition.x, this.currentPosition.y);
    },

    set currentPositionVec(vec: Vector2) {
        this.lastPosition.x = this.currentPosition.x;
        this.lastPosition.y = this.currentPosition.y;

        this.currentPosition.x = vec.x;
        this.currentPosition.y = vec.y;
    },

    get lastPositionVec() {
        return new Vector2(this.lastPosition.x, this.lastPosition.y);
    },

    set lastPositionVec(vec: Vector2) {
        this.lastPosition.x = vec.x;
        this.lastPosition.y = vec.y;
    },

    progress: 0,
    _state: LongPressState.Inactived,

    get state() {
        return this._state;
    },

    set state(value: number) {
        this._state = value;

        // 設置是否可平移視角
        sceneInitResult?.controls && (sceneInitResult.controls.enabled = value !== LongPressState.Activated);

        // 觸發震動反饋
        if (value === LongPressState.Activated)
            navigator.vibrate?.(50);
    },
});

function startDetectingLongPress(event: PointerEvent) {
    // 記錄按下位置，並更新當前位置;
    longPress.pressPositionVec = new Vector2(event.offsetX, event.offsetY);

    longPress.progress = 0; // 長按進度歸零
    longPress.state = LongPressState.Detecting;

    addAnimationLoop(detectLongPress); // 開始偵測長按
}

function detectLongPress(_deltaTime: number, time: number) {
    if (longPress.state != 1)
        return clearAnimationLoop(detectLongPress);

    if ((longPress.progress = Math.min(time / GAME_CONFIG.INTERACT.LONG_PRESS_DURATION, 1)) >= 1) {
        longPress.state = LongPressState.Activated;
        if (detectLongPress) {
            clearAnimationLoop(detectLongPress);
        }
    }
}

function checkLongPressCancel(deltaToOrigin: number) {
    if (deltaToOrigin > GAME_CONFIG.INTERACT.LONG_PRESS_TROLERANCE) {
        clearAnimationLoop(detectLongPress);
        longPress.state = LongPressState.Inactived;
    }
}

// 撫摸進度條相關

export const petting = $state({
    progress: 0,
    additionProgressMax: 0,

    get progressMax() {
        return GAME_CONFIG.INTERACT.PET_PROGRESS_BASIC_MAX + this.additionProgressMax;
    },

    set progressMax(value: number) {
        this.additionProgressMax = value - GAME_CONFIG.INTERACT.PET_PROGRESS_BASIC_MAX;
    },

    opacityDecayTask: { value: 0, speed: 0.001 },

    get opacity() {
        return Math.max(this.opacityDecayTask.value, 0);
    },

    set opacity(value: number) {
        if (this.opacityDecayTask.value <= 0)
            setOpacity(this.opacityDecayTask);

        this.opacityDecayTask.value = value;
    }
});

let petDistanceSum = 0;

function detectPetting(pointer: Vector2, camera: Camera, deltaDistance: number) {
    // 僅當寵物模型已載入時才進行偵測
    const petModelObject = pet?.assets.model?.object;
    if (!petModelObject) return;

    // 使用 Raycaster 偵測指標是否在寵物模型上
    model.raycaster.setFromCamera(pointer, camera);
    const intersects = model.raycaster.intersectObject(petModelObject, true);

    if (!intersects.length) return; // 指標未在寵物模型上，忽略此次移動

    // 累積指標移動距離
    petDistanceSum += deltaDistance;

    // 當累積距離達到閾值時，增加撫摸進度
    if (petDistanceSum >= GAME_CONFIG.INTERACT.PET_PROGRESS_STEP_THRESHOLD) {
        petDistanceSum = 0;
        petting.progress += 1;
        petting.opacity = 1.2; // 增加撫摸進度條不透明度

        // 當撫摸進度達到上限時，觸發撫摸事件並重置進度
        if (petting.progress >= petting.progressMax) {
            petting.progress = 0;
            petting.additionProgressMax += 2 * Math.floor(Math.log2(petting.progressMax + 1))
            interact.petPet();
            screenEffect.petting = .8;
        }
    }
}

export function registerPettingProgressMaxDecay() {
    onMount(() => {
        let lastTime = performance.now();

        const progressMaxDecay = (_deltaTime: number, time: number) => {
            if (petting.additionProgressMax > 0) {
                const deltaTime = time - lastTime;

                if (deltaTime >= GAME_CONFIG.INTERACT.PET_PROGRESS_MAX_DECAY_INTERVAL) {
                    const lastProgressMax = petting.progressMax;
                    petting.additionProgressMax = Math.floor(petting.additionProgressMax / 2); // 每秒最多減少一半的超出部分
                    petting.progress = Math.ceil(petting.progress * petting.progressMax / lastProgressMax); // 調整當前進度以符合新的最大值
                    lastTime = time;
                }
            } else {
                lastTime = time;
            }
        };

        addAnimationLoop(progressMaxDecay);
        return () => clearAnimationLoop(progressMaxDecay);
    });
}

// 淡化效果

export const opacityDecayTasks = new Set<{value: number, speed?: number}>();

function setOpacity(task: { value: number, speed?: number }) {
    if (!opacityDecayTasks.size)
        addAnimationLoop(decayOpacity);
    opacityDecayTasks.add(task);
}

function decayOpacity(deltaTime: number) {
    for (const task of opacityDecayTasks) {
        task.value -= (task.speed ?? 0.001) * deltaTime;

        if (task.value <= 0) {
            opacityDecayTasks.delete(task);
        }
    }

    if (!opacityDecayTasks.size)
        clearAnimationLoop(decayOpacity);
}

export const screenEffect = $state({
    decayTasks: {
        petting: { value: 0, speed: 0.0005 },
        upgrade: { value: 0, speed: 0.0005 },
        feeding: { value: 0, speed: 0.0005 }
    },

    get petting() {
        return Math.max(this.decayTasks.petting.value, 0);
    },

    set petting(value: number) {
        if (this.decayTasks.petting.value <= 0)
            setOpacity(this.decayTasks.petting);

        this.decayTasks.petting.value = value;
    },

    get upgrade() {
        return Math.max(this.decayTasks.upgrade.value, 0);
    },

    set upgrade(value: number) {
        if (this.decayTasks.upgrade.value <= 0)
            setOpacity(this.decayTasks.upgrade);

        this.decayTasks.upgrade.value = value;
    },

    get feeding() {
        return Math.max(this.decayTasks.feeding.value, 0);
    },

    set feeding(value: number) {
        if (this.decayTasks.feeding.value <= 0)
            setOpacity(this.decayTasks.feeding);

        this.decayTasks.feeding.value = value;
    }
});

// 寵物載入

const pet = $derived(game.petInfo.isLegal ? { id: game.petInfo.type, assets: assets.petAssets[game.petInfo.type]} : null);
let lastPet: PetAsset | null = null;

export function registerPetSetup() {
    $effect(() => {
        if (!pet) return;

        const petId = pet.id;
        const petAsset = pet.assets;

        assets.loadCharacterAssets(petId).then(() => {
            const scene = sceneInitResult?.scene;
            if (!scene) return;

            if (petAsset.model.object) {
                petAsset.model.object.position.set(0, 0, 0);
                petAsset.model.object.lookAt(0, 0, 1);
                scene.add(petAsset.model.object);
            };
            if (lastPet?.model.object) scene.remove(lastPet.model.object);

            lastPet = petAsset;
        });
    });
}

// Three.js 場景交互動作

export const action: Action<HTMLDivElement> = function (container) {

    const canvas = container.querySelector("canvas");
    if (!canvas)
        throw new Error("Canvas element not found");

    const result = sceneInitResult = model.initScene(container, canvas, SceneId.defaultRoom);

    function onpointerup(_event: PointerEvent) {
        longPress.state = 0;
        clearAnimationLoop(detectLongPress);
    }

    function onpointermove(event: PointerEvent) {
        longPress.currentPositionVec = new Vector2(event.offsetX, event.offsetY);

        // 根據當前長按狀態執行相應操作
        switch (longPress.state) {
            case 0:
                // 無作用
                break;
            case 1: {
                // 偵測長按
                const { currentPositionVec, pressPositionVec } = longPress;
                const deltaToOrigin = currentPositionVec.distanceTo(pressPositionVec);
                checkLongPressCancel(deltaToOrigin);
                break;
            }
            case 2:
                // 偵測撫摸
                const { currentPositionVec, lastPositionVec } = longPress;
                const pointer = currentPositionVec.clone().applyMatrix3(result.pointerNormalize);
                detectPetting(pointer, result.camera, currentPositionVec.distanceTo(lastPositionVec));
                break;
        }
    }

    canvas.addEventListener("pointerdown", startDetectingLongPress);
    canvas.addEventListener("pointerup", onpointerup);
    canvas.addEventListener("pointermove", onpointermove);

    return {
        destroy() {
            result.dispose();

            canvas.removeEventListener("pointerdown", startDetectingLongPress);
            canvas.removeEventListener("pointerup", onpointerup);
            canvas.removeEventListener("pointermove", onpointermove);
        }
    }
}

export function getControls(): OrbitControls | null {
    return sceneInitResult?.controls as OrbitControls ?? null;
}