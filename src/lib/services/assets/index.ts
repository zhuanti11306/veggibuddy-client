// 物品圖示管理
import foodIcon from "$assets/image/items/general-food.png";
import superFoodIcon from "$assets/image/items/premium-food.png";
import coinIcon from "$assets/image/items/coins.png";
import translatorIcon from "$assets/image/items/translator.png";
import veggieCamIcon from "$assets/image/items/camera.png";
import ballIcon from "$assets/image/items/ball.png";

// UI 圖示管理
import backpackIcon from "$assets/image/ui/backpack.png";
import shopIcon from "$assets/image/ui/shop.png";
import settingsIcon from "$assets/image/ui/settings.png";
import chatIcon from "$assets/image/ui/chat.png";

import backIcon from "$assets/image/ui/back.png";
import backToGameIcon from "$assets/image/ui/back-to-game.png";
import resetIcon from "$assets/image/ui/reset.png";
import moveIcon from "$assets/image/ui/move.png";

import titleImage from "$assets/image/ui/title.png";
import mainScreenElement from "$assets/image/ui/main-screen.png";
import googleIcon from "$assets/image/ui/google.svg";

import handIcon from "$assets/image/ui/hand.png";

// 場景模型
import roomModel from "$assets/model/scene/room.glb?url";
import throwingBallFloorModel from "$assets/model/scene/floor.glb?url";
import sky01HDR from "$assets/model/scene/sky01.hdr?url";
import sky02HDR from "$assets/model/scene/sky02.hdr?url";

// 角色資源
import { carrot } from "./pet-carrot";

// 角色資源
import mushroomModel from "$assets/model/mushroom/model.glb?url";
import mushroomNatrueSound1 from "$assets/model/mushroom/nature_01.ogg";
import mushroomNatrueSound2 from "$assets/model/mushroom/nature_02.ogg";
import mushroomHappySound1 from "$assets/model/mushroom/happy_01.ogg";
import mushroomConfusedSound1 from "$assets/model/mushroom/confused_01.ogg";
import mushroomConfusedSound2 from "$assets/model/mushroom/confused_02.ogg";
import mushroomSadSound1 from "$assets/model/mushroom/sad_01.ogg";

// 類型
import { TextureAsset } from "$lib/utils/three/texture";
import { GLTFModel } from "$lib/utils/three/gltf-model";
import { Environment } from "$lib/utils/three/environment";

// 常數
import { ItemId, PetId, SceneId } from "$lib/config";
import { settings } from "..";

export interface ImageAsset {
    src: string;
    complete: boolean;
    decode(): Promise<void>;
    getImage(): HTMLImageElement;
}

function createImageAsset(url: string): ImageAsset {
    return {
        src: url,
        complete: false,

        async decode() {
            const img = this.getImage();
            await img.decode();
            this.complete = true;
        },

        getImage() {
            const img = new Image();
            img.src = url;
            return img;
        }
    };
}

export interface SoundAsset {
    src: string;
    complete: boolean;
    load(): Promise<void>;
    getAudio(): HTMLAudioElement;
    playSound(force?: boolean): Promise<void>;
}

function createSoundAsset(url: string): SoundAsset {
    return {
        src: url,
        complete: false,

        async load() {
            const audio = this.getAudio();
            await audio.load();
            this.complete = true;
        },

        getAudio() {
            const audio = new Audio();
            audio.src = url;
            return audio;
        },

        async playSound(force?: boolean) {
            if (settings.sound === false && !force)
                return;

            const audio = this.getAudio();
            audio.currentTime = 0;
            
            return new Promise<void>((resolve) => {
                audio.addEventListener("ended", () => resolve(), { once: true });
                audio.play();
            });
        }
    };
}

export interface PetAsset {
    model: GLTFModel;
    sounds: Record<string, SoundAsset[]>;
    faces: Record<string, TextureAsset[]>;
    icon: ImageAsset;

    load(): Promise<void>;

    loadModel(): Promise<void>;
    loadSounds(): Promise<void>;
    loadFaces(): Promise<void>;
}

interface PetAssetSources {
    model: string;
    sounds: Record<string, Readonly<string[]>>;
    faces: Record<string, Readonly<string[]>>;
    icon: string;
}

function createPetAsset({ model, sounds: soundUrls, faces: faceUrls, icon }: PetAssetSources): PetAsset {

    const sounds: Record<string, SoundAsset[]> = {};
    for (const [key, urls] of Object.entries(soundUrls)) {
        sounds[key] = urls.map(url => createSoundAsset(url));
    }

    const faces: Record<string, TextureAsset[]> = {};
    for (const [key, urls] of Object.entries(faceUrls)) {
        faces[key] = urls.map(url =>
            new TextureAsset(url)
                .toggleFlipY(false)
                .setTextureColorSpace("srgb")
        );
    }

    return {
        model: new GLTFModel(model)
            .scaleIntoBox({ x: 0.1, z: 0.1 })
            .applyShadown(),

        sounds,
        faces,

        icon: createImageAsset(icon),

        async load() {
            await Promise.all([
                this.model.load(),
                this.loadSounds(),
                this.loadFaces()
            ]);
        },

        async loadModel() {
            await this.model.load();
        },

        async loadSounds() {
            const tasks: Promise<void>[] = [];

            for (const soundList of Object.values(this.sounds)) {
                for (const sound of soundList)
                    tasks.push(sound.load());
            }

            await Promise.all(tasks);
        },

        async loadFaces() {
            const tasks: Promise<void>[] = [];

            for (const faceList of Object.values(this.faces)) {
                for (const face of faceList)
                    tasks.push(face.load());
            }

            await Promise.all(tasks);
        }
    };
}

export interface SceneAsset<T extends string[]> {
    models: Record<T[number], GLTFModel>;
    environment?: Environment;
}

export const mainScreenAssets = <const>{
    title: createImageAsset(titleImage),
    mainScreen: createImageAsset(mainScreenElement),
    googleIcon: createImageAsset(googleIcon)
};

export const itemIcons = <const>{
    [ItemId.generalFood]: createImageAsset(foodIcon),
    [ItemId.premiumFood]: createImageAsset(superFoodIcon),
    [ItemId.coin]: createImageAsset(coinIcon),
    [ItemId.translator]: createImageAsset(translatorIcon),
    [ItemId.veggieCam]: createImageAsset(veggieCamIcon),
    [ItemId.ball]: createImageAsset(ballIcon)
};

export const uiAssets = <const>{
    inventory: createImageAsset(backpackIcon),
    shop: createImageAsset(shopIcon),
    feed: createImageAsset(foodIcon),
    settings: createImageAsset(settingsIcon),
    chat: createImageAsset(chatIcon),
    back: createImageAsset(backIcon),
    backToGame: createImageAsset(backToGameIcon),
    hand: createImageAsset(handIcon),
    ball: createImageAsset(ballIcon),
    camera: createImageAsset(veggieCamIcon),
    reset: createImageAsset(resetIcon),
    move: createImageAsset(moveIcon)
};

export const sceneAssets = {

    [SceneId.defaultRoom]: <SceneAsset<["room"]>>{
        models: {
            room: new GLTFModel(roomModel)
                .applyShadown(true)
        },

        environment: new Environment(sky01HDR, "hdr")
    },

    [SceneId.throwingBallGame]: <SceneAsset<["field"]>>{
        models: {
            field: new GLTFModel(throwingBallFloorModel)
                .applyShadown(true)
                .scaleIntoBox({ x: 20, z: 20 })
                .move({ y: -0.025 })
        },

        environment: new Environment(sky02HDR, "hdr")
    },

    [SceneId.hideNSeekGame]: <SceneAsset<[]>>{
        models: {
            // Add models for hide and seek game here
        }
    }
};

export const petAssets = <const>{
    [PetId.carrot]: createPetAsset(carrot),
    [PetId.mushroom]: createPetAsset({
        model: mushroomModel,
        icon: "", // TODO: 添加蘑菇寵物圖示
        sounds: {
            normal: [mushroomNatrueSound1, mushroomNatrueSound2],
            happy: [mushroomHappySound1],
            confused: [mushroomConfusedSound1, mushroomConfusedSound2],
            sad: [mushroomSadSound1]
        },
        faces: {}
    })
};

export async function loadUIIcons(): Promise<void> {
    const loadingPromises = Object.values(uiAssets)
        .filter(icon => !icon.complete)
        .map(icon => icon.decode());

    await Promise.all(loadingPromises);
}

// 預載入物品圖示
export async function loadItemIcons(itemIds: ItemId[]): Promise<void> {
    await loadImages(itemIds.map(id => itemIcons[id]).filter(Boolean));
}

// 預載入場景資源
export async function loadSceneAssets<T extends SceneId>(scene: T): Promise<(typeof sceneAssets)[T]> {
    
    const sceneModelAsset = sceneAssets[scene];
    const loadTasks: Promise<void>[] = [];

    for (const model of Object.values(sceneModelAsset.models)) {
        loadTasks.push(model.load());
    }

    if (sceneModelAsset.environment) {
        loadTasks.push(sceneModelAsset.environment.load());
    }

    await Promise.all(loadTasks);
    return sceneModelAsset;
}

// 預載入角色資源
export async function loadCharacterAssets(characterType: PetId): Promise<PetAsset> {
    const petAsset = petAssets[characterType];
    await petAsset.load();
    return petAsset;
}

// 預載入主
export async function loadMainScreenIcons(): Promise<void> {
    await loadImages(Object.values(mainScreenAssets));
}

// 取得物品圖示
export function getItemIcon(itemId: keyof typeof itemIcons): ImageAsset {
    return itemIcons[itemId];
}

// 取得 UI 圖示
export function getUIIcon(iconName: keyof typeof uiAssets): ImageAsset {
    return uiAssets[iconName];
}

// 取得主畫面圖示
export function getMainScreenAsset(assetName: keyof typeof mainScreenAssets): ImageAsset {
    return mainScreenAssets[assetName];
}

// 取得寵物圖示
export function getPetIcon(petId: PetId): ImageAsset {
    return petAssets[petId].icon;
}

// 預載入圖片資源

async function loadImages(images: ImageAsset[]): Promise<void> {
    const loadingPromises = images
        .filter(img => !img.complete)
        .map(img => img.decode());

    await Promise.all(loadingPromises);
}