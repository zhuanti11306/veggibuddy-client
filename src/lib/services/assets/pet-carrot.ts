
import model from "$assets/model/carrot/carrot.glb?url";

import soundNatrue1 from "$assets/model/carrot/nature_01.ogg";
import soundNatrue2 from "$assets/model/carrot/nature_02.ogg";
import soundHappy1 from "$assets/model/carrot/happy_01.ogg";
import soundConfused1 from "$assets/model/carrot/confused_01.ogg";
import soundConfused2 from "$assets/model/carrot/confused_02.ogg";
import soundSad1 from "$assets/model/carrot/sad_01.ogg";

import faceNuetral1 from "$assets/model/carrot/carrot_face_01.png";
import faceNuetral2 from "$assets/model/carrot/carrot_face_02.png";
import faceAngry1 from "$assets/model/carrot/carrot_face_03.png";
import faceAngry2 from "$assets/model/carrot/carrot_face_04.png";
import faceHappy1 from "$assets/model/carrot/carrot_face_05.png";
import faceHappy2 from "$assets/model/carrot/carrot_face_06.png";
import faceScared1 from "$assets/model/carrot/carrot_face_07.png";
import faceScared2 from "$assets/model/carrot/carrot_face_08.png";
import faceSuprised1 from "$assets/model/carrot/carrot_face_09.png";
import faceSuprised2 from "$assets/model/carrot/carrot_face_10.png";
import faceSad1 from "$assets/model/carrot/carrot_face_11.png";
import faceSad2 from "$assets/model/carrot/carrot_face_12.png";
import faceDisgusted1 from "$assets/model/carrot/carrot_face_13.png";
import faceDisgusted2 from "$assets/model/carrot/carrot_face_14.png";
import { PetSoundCategory, PetFaceCategory } from "../interact";

export const carrot = <const> {
    model,

    icon: "",

    sounds: {
        [PetSoundCategory.nature]: [soundNatrue1, soundNatrue2],
        [PetSoundCategory.happy]: [soundHappy1],
        [PetSoundCategory.confused]: [soundConfused1, soundConfused2],
        [PetSoundCategory.sad]: [soundSad1]
    },

    faces: {
        [PetFaceCategory.neutral]: [faceNuetral1, faceNuetral2],
        [PetFaceCategory.angry]: [faceAngry1, faceAngry2],
        [PetFaceCategory.happy]: [faceHappy1, faceHappy2],
        [PetFaceCategory.scared]: [faceScared1, faceScared2],
        [PetFaceCategory.surprised]: [faceSuprised1, faceSuprised2],
        [PetFaceCategory.sad]: [faceSad1, faceSad2],
        [PetFaceCategory.disgusted]: [faceDisgusted1, faceDisgusted2]
    }
};
