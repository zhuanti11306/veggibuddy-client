import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { ENV } from "$lib/config";

const firebaseConfig: FirebaseOptions = ENV.FIREBASE;

export const app = getApps()[0] ?? initializeApp(firebaseConfig);
