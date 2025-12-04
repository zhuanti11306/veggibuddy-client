import { getAuth, GoogleAuthProvider, onAuthStateChanged, type User } from "firebase/auth";

import { app } from "./firebase";

export const auth = getAuth(app);

const userState = {
    whenReady: auth.authStateReady(),
    currentUser: auth.currentUser
};

onAuthStateChanged(auth, user => {
    userState.currentUser = user;
    console.log("Auth state changed, current user:", user);
});


export type { User };

import {
    signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
    createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
    signInWithPopup as firebaseSignInWithPopup,
    signOut as firebaseSignOut
} from "firebase/auth";
import { isDev } from "$lib/config";

export function signInWithEmailAndPassword(email: string, password: string) {
    return firebaseSignInWithEmailAndPassword(auth, email, password);
}

export function createAccountWithEmailAndPassword(email: string, password: string) {
    return firebaseCreateUserWithEmailAndPassword(auth, email, password);
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
    return userState.whenReady;
}

export async function getCurrentUser() {
    await auth.authStateReady();
    return auth.currentUser;
}

if (isDev) {
    
    Object.assign(window, {
        getCurrentUser,
        signInWithEmailAndPassword,
        signInWithGoogle,
        signOut,
        auth 
    });
}