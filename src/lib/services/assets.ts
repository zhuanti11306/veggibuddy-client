// 物品圖示管理
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

import carrotModel from "$assets/pet/test.glb?url";
import mushroomModel from "$assets/pet/mushroom.glb?url";

import { ItemId, Pet } from "$lib/config";
import { GLTFModel } from "$lib/utils/three/gltf-model";

interface ImageAsset {
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

interface PetAsset {
    model: GLTFModel | null;
    getModel(): GLTFModel;
}

function createPetAsset(url: string): PetAsset {
    return {
        model: null,

        getModel() {
            return this.model ??= new GLTFModel(url)
                .scaleIntoBox(1)
                .centerAtOrigin()
                .applyShadown(true);
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

export const petAssets = <const>{
    [Pet.carrot]: createPetAsset(carrotModel),
    [Pet.mushroom]: createPetAsset(mushroomModel)
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

// 預載入角色資源
export async function loadCharacterAssets(characterType: Pet): Promise<void> {
    const petAsset = petAssets[characterType];
    await petAsset.getModel().whenLoaded;
}

// 預載入主
export async function loadMainScreenIcons(): Promise<void> {
    await loadImages(Object.values(mainScreenAssets));
}

async function loadImages(images: ImageAsset[]): Promise<void> {
    const loadingPromises = images
        .filter(img => !img.complete)
        .map(img => img.decode());

    await Promise.all(loadingPromises);
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