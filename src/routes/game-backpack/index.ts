import { ItemId } from "$lib/config";
import { game } from "$lib/services";
import { goto } from "$lib/utils/history";

export { default } from "./page.svelte";

export const itemFunctions: Partial<Record<ItemId, { name: string; use: () => void | Promise<any>, close?: boolean }[]>> = {
    [ItemId.coin]: [
        { name: "前往商店", use: () => goto("/game/shop"), close: true }
    ],

    [ItemId.generalFood]: [
        { name: "餵食寵物", use: () => game.feedPet(ItemId.generalFood)}
    ],

    [ItemId.premiumFood]: [
        { name: "餵食寵物", use: () => game.feedPet(ItemId.premiumFood)}
    ],

    [ItemId.translator]: [
        { name: "與寵物對話", use: () => goto("/game/chat"), close: true }
    ]
};