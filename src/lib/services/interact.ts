import { assets, game } from ".";

export const enum PetSoundCategory {
    nature = "nature",
    happy = "happy",
    confused = "confused",
    sad = "sad"
}

export const enum PetFaceCategory {
    neutral = "neutral",
    angry = "angry",
    happy = "happy",
    scared = "scared",
    surprised = "surprised",
    sad = "sad",
    disgusted = "disgusted"
}

export async function makeSound(category: PetSoundCategory) {
    if (!game.petInfo.isLegal)
        return;
    const sounds = assets.petAssets[game.petInfo.type].sounds;
    const categorySounds = sounds[category];

    if (!categorySounds || categorySounds.length === 0)
        return;

    const targetSound = categorySounds[Math.floor(Math.random() * categorySounds.length)];
    return targetSound.playSound();
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


export function startRandomEventLoop() {
    if (randomEventLoop) return;

    let bias = 0;

    randomEventLoop = setInterval(() => {

        const rand = Math.random() + bias;
        bias -= 0.0625;

        if (rand > 0.0625)
            return;

        bias += 0.5;
        const choice = Math.random();

        if (choice < 0.5) {
            setFace(PetFaceCategory.neutral);
            if (choice < 0.25) {
                makeSound(PetSoundCategory.nature);
                bias += .125;
            }
        } else {
            setFace(PetFaceCategory.happy);
            if (choice < 0.75) {
                makeSound(PetSoundCategory.happy);
                bias += .125;
            }
        }

        // if (choice < 0.5) {
        //     if (choice < 0.25) {
        //         bias += .125;
        //     }
        // } else {
        //     if (choice < 0.75) {
        //         bias += .125;
        //     }
        // }

    }, 334);
}

export function stopRandomEventLoop() {
    if (randomEventLoop) {
        clearInterval(randomEventLoop);
        randomEventLoop = null;
    }
}
