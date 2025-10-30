import { Api, api } from "$lib/apis";
import type { ApiGetMarketItemsResponse, ApiGetUserPetInfoResponse, ApiGetUserItemsResponse, ApiUserGainCurrencyResponse, ApiUserLoginResponse } from "$lib/apis";

import { sorted } from "$lib/utils/iterate";
import { withExistingTask, withLatestTask } from "$lib/utils/async-task.svelte";

import { itemIcons, loadItemIcons } from "./assets";
import type { CoinId, ItemCategory, ItemId, Pet } from "$lib/config";
import { getDateFromTimestamp } from "$lib/utils/date";

export interface UserItem {
    itemId: ItemId;
    category: ItemCategory;
    name: string;
    description: string;
    quantity: number;
}

export interface UserPetInfo {
    type: Pet;
    level: number;
    growthValue: number;
    aimValue: number;
}

export interface UserCurrency {
    coinId: CoinId;
    amount: number;
}

export interface MarketItem extends UserItem {
    price: { amount: number; coinId: string };
}

export interface PetIntro {
    typeId: Pet;
    name: string;
    description: string;
}

// 狀態管理
export const userItems = $state<Map<ItemId, UserItem> & { dirty: boolean }>(Object.assign(new Map(), { dirty: false }));
export const userCurrencies = $state<Map<CoinId, UserCurrency> & { dirty: boolean}>(Object.assign(new Map(), { dirty: false }));

export const marketItems = $state<MarketItem[] & { expire: Date | null }>(Object.assign([], { expire: null }));

export const petInfo = $state<{ isLegal: false } | ({ isLegal: true } & ApiGetUserPetInfoResponse["pet"])>({ isLegal: false });

const dailyRoutineInfo = {
    hasRunTodayRoutine: true, // 預設為 true，避免每次登入時執行每日例行
};

// 使用者登入遊戲
export async function userLogin(): Promise<boolean> {

    return await withLatestTask(userLogin, async () => {
        const response = await api(Api.userLogin);

        await Promise.all([
            handleGetMarketItem(response),
            handleGetUserItems(response),
            handlePetInfo(response)
        ]);

        gatherDailyRoutineInfo(response);

        return true;
    }).catch(error => {
        console.error("[ERR] (GAME SERVICE) Login failed:", error);
        return false;
    });
}

// 設定使用者帳號
export async function setupAccount(nickname: string, pet: Pet ): Promise<boolean> {

    return await withLatestTask(setupAccount, async () => {
        const response = await api(Api.userSetup, {
            name: nickname,
            pet: {
                growthValue: 0,
                type: pet
            }
        });

        await Promise.all([
            handleGetMarketItem(response),
            handleGetUserItems(response),
            handlePetInfo(response)
        ]);

        gatherDailyRoutineInfo(response);

        return true;
    }).catch(error => {
        console.error("[ERR] (GAME SERVICE) Setup account failed:", error);
        return false;
    });
}

// 每日例行
export async function runDailyRoutine(): Promise<boolean> {
    if (dailyRoutineInfo.hasRunTodayRoutine)
        return true;

    return await withExistingTask(runDailyRoutine, async () => {
        const tasks = [
            // 領取每日登入獎勵
            api(Api.userGainCurrency, { action: "LOGIN", isARMode: false })
                .then(handleGainCurrency)
        ];

        await Promise.all(tasks);

        return true;
    }).catch(error => {
        console.error("[ERR] (GAME SERVICE) Daily routine failed:", error);
        return false;
    });
}

// 取得市集物品
export async function getMarketItems(): Promise<MarketItem[] | undefined> {
    if (marketItems.length > 0 && marketItems.expire && marketItems.expire > new Date()) 
        return marketItems;

    return await withExistingTask(getMarketItems, async () => {
        const response = await api(Api.marketGetItems);
        return await handleGetMarketItem(response);
    }).catch(error => {
        console.error("[ERR] (GAME SERVICE) Get market items failed:", error);
        return undefined;
    });
}

// 取得使用者物品
export async function getUserItems(): Promise<UserItem[] | undefined> {
    if (!userItems.dirty && userItems.size > 0)
        return Array.from(userItems.values());

    return await withLatestTask(getUserItems, async () => {
        const response = await api(Api.userGetItems);
        return await handleGetUserItems(response);
    }).catch(error => {
        console.error("[ERR] (GAME SERVICE) Get user items failed:", error);
        return undefined;
    });
}

// 購買市集物品
export async function purchaseItem(item: MarketItem, count: number): Promise<UserItem[] | undefined> {
    return await withLatestTask(purchaseItem, async () => {
        const response = await api(Api.marketPurchaseItems, {items: { [item.itemId]: count }});
        return await handleGetUserItems(response);
    }).catch(error => {
        console.error("[ERR] (GAME SERVICE) Purchase item failed:", error);
        return undefined;
    });
}

// 取得寵物資訊
export async function getPetInfo(): Promise<UserPetInfo | undefined> {
    if (petInfo.isLegal)
        return petInfo;

    return await withLatestTask(getPetInfo, async () => {
        const response = await api(Api.userGetPet);
        await handlePetInfo(response);
        return petInfo.isLegal ? petInfo : undefined;
    }).catch(error => {
        console.error("[ERR] (GAME SERVICE) Get pet info failed:", error);
        return undefined;
    });
}

// 餵食寵物
export async function feedPet(item: UserItem, count: number = 1): Promise<boolean | undefined> {

    return await withLatestTask(feedPet, async () => {
        const response = await api(Api.userFeedPet, {
            items: { [item.itemId]: count }
        });

        await Promise.all([
            handleGetUserItems(response),
            handlePetInfo(response)
        ]);

        return true;
    }).catch(error => {
        console.error("[ERR] (GAME SERVICE) Feed pet failed:", error);
        return false;
    });
}

// 取得寵物介紹
export async function getPetIntroList(): Promise<PetIntro[] | undefined> {
    return await withExistingTask(getPetIntroList, async () => {
        const response = await api(Api.petGetList);
        return response.pets;
    }).catch(error => {
        console.error("[ERR] (GAME SERVICE) Get pet intro list failed:", error);
        return undefined;
    });
}

export { isLoading } from "$lib/utils/async-task.svelte";

// 處理取得市集物品回應
async function handleGetMarketItem(response: ApiGetMarketItemsResponse) {
    const now = new Date();
    marketItems.expire = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    marketItems.splice(0, marketItems.length, ...response.market);

    // 預載圖示
    await loadItemIcons(marketItems.map(item => item.itemId) as (keyof typeof itemIcons)[]);

    return sorted(marketItems, item => item.itemId);
}

// 處理取得使用者物品回應
async function handleGetUserItems(response: ApiGetUserItemsResponse) {
    const userItemIds = response.backpack.map(item => item.itemId)
    const userItemList = sorted(response.backpack, item => item.itemId);

    // 預載圖示
    await loadItemIcons(userItemIds);

    userItems.clear();
    userItemList.forEach(item => userItems.set(item.itemId, item));

    userItems.dirty = false;
    return userItemList;
}

// 處理取得寵物資訊回應
async function handlePetInfo(response: ApiGetUserPetInfoResponse) {
    
    petInfo.isLegal = true;
    
    if (petInfo.isLegal) {
        petInfo.level = response.pet.level;
        petInfo.type = response.pet.type;
        petInfo.growthValue = response.pet.growthValue;
        petInfo.aimValue = response.pet.aimValue;

        // Load pet modal assets
    }

    return petInfo;
}

function handleGainCurrency(response: ApiUserGainCurrencyResponse) {
    userItems.dirty = true;
    // userItems.find(item => item.itemId === )?.quantity;    
}

// 蒐集每日例行資訊
function gatherDailyRoutineInfo(response: ApiUserLoginResponse) {
    const lastLoginDate = getDateFromTimestamp(new Date(response.lastLoginTime));
    const currentDate = getDateFromTimestamp(new Date());

    dailyRoutineInfo.hasRunTodayRoutine = lastLoginDate === currentDate;
}