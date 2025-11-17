// 物品圖示管理
import foodIcon from "$assets/image/items/general-food.png";
import superFoodIcon from "$assets/image/items/premium-food.png";
import coinIcon from "$assets/image/items/coins.png";
import translatorIcon from "$assets/image/items/translator.png";
import ballIcon from "$assets/image/items/ball.png";
import veggieCamIcon from "$assets/image/items/veggieCam.png";

// UI 圖示管理
import backpackIcon from "$assets/image/ui/backpack.png";
import shopIcon from "$assets/image/ui/shop.png";
import settingsIcon from "$assets/image/ui/settings.png";
import backIcon from "$assets/image/ui/返回.png";

import handIcon from "$assets/image/ui/hand.png";

import petBackground from "$assets/image/ui/背景.jpg";
import titleImage from "$assets/image/ui/標題.png";
import mainScreenElement from "$assets/image/ui/主畫面.png";
import googleIcon from "$assets/image/ui/google.svg";

// 場景模型
import roomModel from "$assets/pet/room.glb?url";
import skyEXR from "$assets/pet/sky-styled.exr?url";

// 角色資源
import { carrot } from "./assets-carrot";
import { TextureAsset } from "$lib/utils/three/texture";

// 角色資源
import mushroomModel from "$assets/pet/mushroom/model.glb?url";
import mushroomNatrueSound1 from "$assets/pet/mushroom/nature_01.ogg";
import mushroomNatrueSound2 from "$assets/pet/mushroom/nature_02.ogg";
import mushroomHappySound1 from "$assets/pet/mushroom/happy_01.ogg";
import mushroomConfusedSound1 from "$assets/pet/mushroom/confused_01.ogg";
import mushroomConfusedSound2 from "$assets/pet/mushroom/confused_02.ogg";
import mushroomSadSound1 from "$assets/pet/mushroom/sad_01.ogg";

// 類型
import { ItemId, PetId } from "$lib/config";
import { GLTFModel } from "$lib/utils/three/gltf-model";
import { Environmnet } from "$lib/utils/three/environment";

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
    },
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
    },
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
function createPetAsset({
  model,
  sounds: soundUrls,
  faces: faceUrls,
  icon,
}: PetAssetSources): PetAsset {
  const sounds: Record<string, SoundAsset[]> = {};
  for (const [key, urls] of Object.entries(soundUrls)) {
    sounds[key] = urls.map((url) => createSoundAsset(url));
  }

  const faces: Record<string, TextureAsset[]> = {};
  for (const [key, urls] of Object.entries(faceUrls)) {
    faces[key] = urls.map((url) =>
      new TextureAsset(url).toggleFlipY(false).setTextureColorSpace("srgb")
    );
  }

  return {
    model: new GLTFModel(model)
      .scaleIntoBox({ x: 0.1, z: 0.1 })
      .centerAtOrigin()
      .applyShadown(),

    sounds,
    faces,

    icon: createImageAsset(icon),

    async load() {
      await Promise.all([
        this.model.load(),
        this.loadSounds(),
        this.loadFaces(),
      ]);
    },

    async loadModel() {
      await this.model.load();
    },

    async loadSounds() {
      const tasks: Promise<void>[] = [];

      for (const soundList of Object.values(this.sounds)) {
        for (const sound of soundList) tasks.push(sound.load());
      }

      await Promise.all(tasks);
    },

    async loadFaces() {
      const tasks: Promise<void>[] = [];

      for (const faceList of Object.values(this.faces)) {
        for (const face of faceList) tasks.push(face.load());
      }

      await Promise.all(tasks);
    },
  };
}

export const mainScreenAssets = <const>{
  title: createImageAsset(titleImage),
  mainScreen: createImageAsset(mainScreenElement),
  googleIcon: createImageAsset(googleIcon),
};

export const itemIcons = <const>{
  [ItemId.generalFood]: createImageAsset(foodIcon),
  [ItemId.premiumFood]: createImageAsset(superFoodIcon),
  [ItemId.coin]: createImageAsset(coinIcon),
  [ItemId.translator]: createImageAsset(translatorIcon),
  [ItemId.veggieCam]: createImageAsset(veggieCamIcon),
  [ItemId.ball]: createImageAsset(ballIcon),
};

export const uiAssets = <const>{
  inventory: createImageAsset(backpackIcon),
  shop: createImageAsset(shopIcon),
  feed: createImageAsset(foodIcon),
  settings: createImageAsset(settingsIcon),
  chat: createImageAsset(translatorIcon),
  back: createImageAsset(backIcon),
  petBackground: createImageAsset(petBackground),
  hand: createImageAsset(handIcon),
};

export const sceneModelAsset = {
  model: new GLTFModel(roomModel).applyShadown(true),
  environment: new Environmnet(skyEXR, "exr"),
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
      sad: [mushroomSadSound1],
    },
    faces: {},
  }),
};

export async function loadUIIcons(): Promise<void> {
  const loadingPromises = Object.values(uiAssets)
    .filter((icon) => !icon.complete)
    .map((icon) => icon.decode());

  await Promise.all(loadingPromises);
}

// 預載入物品圖示
export async function loadItemIcons(
  itemIds: (keyof typeof itemIcons)[]
): Promise<void> {
  await loadImages(itemIds.map((id) => itemIcons[id]).filter(Boolean));
}

// 預載入場景資源
export async function loadSceneAssets(): Promise<typeof sceneModelAsset> {
  await Promise.all([
    sceneModelAsset.model.load(),
    sceneModelAsset.environment.load(),
  ]);

  return sceneModelAsset;
}

// 預載入角色資源
export async function loadCharacterAssets(characterType: PetId): Promise<void> {
  const petAsset = petAssets[characterType];
  await petAsset.load();
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
export function getMainScreenAsset(
  assetName: keyof typeof mainScreenAssets
): ImageAsset {
  return mainScreenAssets[assetName];
}

// 取得寵物圖示
export function getPetIcon(petId: PetId): ImageAsset {
  return petAssets[petId].icon;
}

// 預載入圖片資源

async function loadImages(images: ImageAsset[]): Promise<void> {
  const loadingPromises = images
    .filter((img) => !img.complete)
    .map((img) => img.decode());

  await Promise.all(loadingPromises);
}
