// 物品圖示管理
import { Texture, TextureLoader } from "three";

import foodIcon from "$assets/image/items/肥料.png";
import superFoodIcon from "$assets/image/items/高級肥料.png";
import coinIcon from "$assets/image/items/錢幣.png";
import translatorIcon from "$assets/image/items/翻譯機.png";

import inventoryIcon from "$assets/image/ui/背包.png";
import shopIcon from "$assets/image/ui/商店.png";
import settingsIcon from "$assets/image/ui/設定.png";
import backIcon from "$assets/image/ui/返回.png";

import petBackground from "$assets/image/ui/背景.jpg"
import titleImage from "$assets/image/ui/標題.png";
import mainScreenElement from "$assets/image/ui/主畫面.png";
import googleIcon from "$assets/image/ui/google.svg";

import roomModel from "$assets/pet/room.glb?url";

import mushroomModel from "$assets/pet/mushroom/model.glb?url";
import mushroomNatrueSound1 from "$assets/pet/mushroom/nature_01.ogg";
import mushroomNatrueSound2 from "$assets/pet/mushroom/nature_02.ogg";
import mushroomHappySound1 from "$assets/pet/mushroom/happy_01.ogg";
import mushroomConfusedSound1 from "$assets/pet/mushroom/confused_01.ogg";
import mushroomConfusedSound2 from "$assets/pet/mushroom/confused_02.ogg";
import mushroomSadSound1 from "$assets/pet/mushroom/sad_01.ogg";

import { ItemId, PetId } from "$lib/config";
import { GLTFModel } from "$lib/utils/three/gltf-model";

import { carrot } from "./assets-carrot";
import { TextureAsset } from "$lib/utils/three/texture";

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
    playSound(): Promise<void>;
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

        async playSound() {
            const audio = this.getAudio();
            audio.currentTime = 0;
            return audio.play();
        }
    };
}

export interface PetAsset {
    model: GLTFModel;
    sounds: Record<string, SoundAsset[]>;
    faces: Record<string, TextureAsset[]>;

    load(): Promise<void>;

    loadModel(): Promise<void>;
    loadSounds(): Promise<void>;
    loadFaces(): Promise<void>;
}

interface PetAssetSources {
    model: string;
    sounds: Record<string, Readonly<string[]>>;
    faces: Record<string, Readonly<string[]>>;
}
function createPetAsset({ model, sounds: soundUrls, faces: faceUrls }: PetAssetSources): PetAsset {

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
            .centerAtOrigin()
            .applyShadown(),

        sounds,
        faces,

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

export const mainScreenAssets = <const>{
    title: createImageAsset(titleImage),
    mainScreen: createImageAsset(mainScreenElement),
    googleIcon: createImageAsset(googleIcon)
};

export const itemIcons = <const>{
    [ItemId.generalFood]: createImageAsset(foodIcon),
    [ItemId.premiumFood]: createImageAsset(superFoodIcon),
    [ItemId.coin]: createImageAsset(coinIcon),
    [ItemId.translator]: createImageAsset(translatorIcon)
};

export const uiAssets = <const>{
    inventory: createImageAsset(inventoryIcon),
    shop: createImageAsset(shopIcon),
    feed: createImageAsset(foodIcon),
    settings: createImageAsset(settingsIcon),
    chat: createImageAsset(translatorIcon),
    back: createImageAsset(backIcon),
    petBackground: createImageAsset(petBackground)
};

export const sceneModelAsset = {
    model: new GLTFModel(roomModel)
        .applyShadown(true)
}

export const petAssets = <const>{
    [PetId.carrot]: createPetAsset(carrot),
    [PetId.mushroom]: createPetAsset({
        model: mushroomModel,
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
export async function loadItemIcons(itemIds: (keyof typeof itemIcons)[]): Promise<void> {
    await loadImages(itemIds.map(id => itemIcons[id]).filter(Boolean));
}

// 預載入場景資源
export async function loadSceneAssets(): Promise<typeof sceneModelAsset> {
    await sceneModelAsset.model.load();
    return sceneModelAsset;
}

// 預載入角色資源
export async function loadCharacterAssets(characterType: PetId): Promise<void> {
    const petAsset = petAssets[characterType];
    await petAsset.load();
    console.log("[DBG] Loaded character assets:", petAsset);
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

async function loadImages(images: ImageAsset[]): Promise<void> {
    const loadingPromises = images
        .filter(img => !img.complete)
        .map(img => img.decode());

    await Promise.all(loadingPromises);
}

async function loadSounds(sounds: SoundAsset[]): Promise<void> {
    const loadingPromises = sounds
        .filter(sound => !sound.complete)
        .map(sound => sound.load());

    await Promise.all(loadingPromises);
}