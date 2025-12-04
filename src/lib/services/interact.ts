import { assets, game } from ".";

export const enum PetSoundCategory {
    nature = "nature",
    happy = "happy",
    confused = "confused",
    sad = "sad"
}

export const enum PetFaceCategory {
    neutral = "Neutral",
    angry = "Anger",
    happy = "Happiness",
    scared = "Fear",
    surprised = "Surprise",
    sad = "Sadness",
    disgusted = "Disgust"
}

export async function makeSound(category?: PetSoundCategory, bias: number = .125, force: boolean = false) {
    
    if (!game.petInfo.isLegal)
        return;
    const sounds = assets.petAssets[game.petInfo.type].sounds;
    const categorySounds = category ? sounds[category] : Object.values(sounds).flat();

    if (!categorySounds || categorySounds.length === 0)
        return;

    eventBias += bias;

    const targetSound = categorySounds[Math.floor(Math.random() * categorySounds.length)];
    return targetSound.playSound(force);
}

export async function setFace(category: PetFaceCategory) {
    if (!game.petInfo.isLegal)
        return;

    const faces = assets.petAssets[game.petInfo.type].faces;
    const categoryFaces = faces[category];

    if (!categoryFaces || categoryFaces.length === 0)
        return;

    const targetFace = categoryFaces[Math.floor(Math.random() * categoryFaces.length)];
    if (!targetFace || !targetFace.texture)
        return;

    assets.petAssets[game.petInfo.type].model.changeMaterialMap("face", targetFace.texture);
}

let randomEventLoop: ReturnType<typeof setInterval> | null = null;
let eventBias = 0;

export function startRandomEventLoop() {
    if (randomEventLoop) return;

    randomEventLoop = setInterval(() => {

        const rand = Math.random() + eventBias;
        eventBias -= 0.0625;

        if (rand > 0.125)
            return;

        eventBias += 0.5;
        const choice = Math.random();

        if (choice < 0.5) {
            setFace(PetFaceCategory.neutral);
            if (choice < 0.125)
                makeSound(PetSoundCategory.nature);
        } else {
            setFace(PetFaceCategory.happy);
            if (choice < 0.625)
                makeSound(PetSoundCategory.happy);
        }

    }, 334);
}

export function stopRandomEventLoop() {
    if (randomEventLoop) {
        clearInterval(randomEventLoop);
        randomEventLoop = null;
    }
}

export function petPet() {
    eventBias += 0.25;

    setFace(PetFaceCategory.happy);
    if (Math.random() < 0.5)
        makeSound(PetSoundCategory.happy);

    game.earnCurrency("PET");
    navigator.vibrate?.(100);
}
