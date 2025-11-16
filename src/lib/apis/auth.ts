import { getAuth, GoogleAuthProvider, onAuthStateChanged, type User } from "firebase/auth";

import { isDev } from "$lib/config";

import { app } from "./firebase";

export const auth = getAuth(app);

const userPromise = Object.assign(new Promise<void>(resolve => {
    onAuthStateChanged(auth, user => {
        if (userPromise.currentUser === undefined)
            resolve();
        userPromise.currentUser = user;
    });
}), { currentUser: undefined as User | undefined | null });

export type { User };

import {
    signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
    createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
    signInWithPopup as firebaseSignInWithPopup,
    signInWithRedirect as firebaseSignInWithRedirect,
    signOut as firebaseSignOut
} from "firebase/auth";

export function signInWithEmailAndPassword(email: string, password: string) {
    return firebaseSignInWithEmailAndPassword(auth, email, password)
        .catch(() => firebaseCreateUserWithEmailAndPassword(auth, email, password));
}

export function signInWithGoogle() {
    return firebaseSignInWithPopup(auth, new GoogleAuthProvider());
}

export function signOut() {
    return firebaseSignOut(auth);
}

export {
    FirebaseError
} from "firebase/app";

export function whenReady() {
    return userPromise;
}

export function getCurrentUser() {
    if (userPromise.currentUser !== undefined)
        return userPromise.currentUser;
    return userPromise.then(() => auth.currentUser);
}

// 開發環境除錯工具
if (isDev) {
    Object.assign(globalThis, { signOut, auth });
}