import { ENV, isDev, ItemId, PetId } from "$lib/config";
import type { MarketItem, UserItem, UserPetInfo, UserCurrency, PetIntro } from "$lib/services";
import { sleep } from "$lib/utils/async/sleep";

import { getCurrentUser } from "./auth";

export interface LoginInfo {
    name: string;
    lastLoginTime: string;
}

export const enum Api {
    userLogin = "user-login",
    userSetup = "user-setup",
    userGetItems = "user-get-items",
    userGainCurrency = "user-gain-currency",

    chatGetToken = "chat-get-token",

    userGetPet = "user-get-pet",
    userFeedPet = "user-feed-pet",

    marketGetItems = "market-get-items",
    marketPurchaseItems = "market-purchase-items",

    petGetList = "get-pets",

    imageObjectDetection = "image-object-detection"
}

export const apiInfo = <const>{
    [Api.userLogin]: {
        method: "GET",
        path: "/user/login",
        auth: true,
        json: true,
        params: void 0,
        response: null! as ApiResponse.UserLoginOrSetup
    },

    [Api.userSetup]: {
        method: "POST",
        path: "/user/build",
        auth: true,
        json: true,
        params: null! as ApiParam.UserSetup,
        response: null! as ApiResponse.UserLoginOrSetup
    },

    [Api.userGetItems]: {
        method: "GET",
        path: "/user/items",
        auth: true,
        json: true,
        params: void 0,
        response: null! as ApiResponse.GetUserItems
    },

    [Api.userGainCurrency]: {
        method: "POST",
        path: "/user/wallet/add",
        auth: true,
        json: true,
        params: null! as ApiParam.UserGainCurrency,
        response: null! as ApiResponse.UserGainCurrency
    },

    [Api.chatGetToken]: {
        method: "GET",
        path: "/chat/get",
        auth: true,
        json: true,
        params: void 0,
        response: null! as ApiResponse.GetChatToken
    },

    [Api.userFeedPet]: {
        method: "POST",
        path: "/user/pet/grow",
        auth: true,
        json: true,
        params: null! as ApiParam.FeedPet,
        response: null! as ApiResponse.FeedPet
    },

    [Api.userGetPet]: {
        method: "GET",
        path: "/user/pet/data",
        auth: true,
        json: true,
        params: void 0,
        response: null! as ApiResponse.GetUserPetInfo
    },

    [Api.marketGetItems]: {
        method: "GET",
        path: "/market/items",
        auth: true,
        json: true,
        params: void 0,
        response: null! as ApiResponse.GetMarketItems
    },

    [Api.marketPurchaseItems]: {
        method: "POST",
        path: "/market/purchase",
        auth: true,
        json: true,
        params: null! as ApiParam.PurchaseMarketItems,
        response: null! as ApiResponse.PurchaseMarketItems
    },

    [Api.petGetList]: {
        method: "GET",
        path: "/pet",
        auth: false,
        json: true,
        params: void 0,
        response: null! as ApiResponse.GetPetList
    },

    [Api.imageObjectDetection]: {
        method: "POST",
        path: "/detect",
        auth: false,
        json: false,
        params: null! as {
            file: Blob;
        },
        response: null! as {
            hidingPoint: { x: number; y: number; };
            mask: string;
        }
    }
};

namespace ApiParam {

    export type UserSetup = {
        name: string;
        pet: {
            growthValue: 0;
            type: PetId;
        };
    };

    export type UserGainCurrency = {
        action: "LOGIN" | "PET" | "TALK" | "CHAT";
        isARMode: boolean;
    };

    export type FeedPet = {
        items: Partial<Record<ItemId, number>>;
    };

    export type PurchaseMarketItems = {
        items: Partial<Record<ItemId, number>>;
    };
}

export namespace ApiResponse {

    export type UserLoginOrSetup = LoginInfo
        & GetUserPetInfo
        & GetUserItems
        & GetMarketItems
        & UserGainCurrency;
    
    export type GetUserItems = {
        backpack: UserItem[];
    };

    export type UserGainCurrency = {
        currencies: UserCurrency[];
    };

    export type GetChatToken = {
        session_token: string;
    };

    export type GetUserPetInfo = {
        pet: UserPetInfo;
    };

    export type FeedPet = GetUserPetInfo & {
        foods: UserItem[];
    };

    export type GetMarketItems = {
        market: MarketItem[];
    };

    export type PurchaseMarketItems = GetUserItems;

    export type GetPetList = {
        pets: PetIntro[];
    };
}

export async function api<T extends Api>(name: T, params?: typeof apiInfo[T]["params"]): Promise<typeof apiInfo[T]["response"]> {
    const info = apiInfo[name];
    if (!info) throw new Error(`API endpoint ${name} not found`);

    const url = new URL(`${ENV.API.BASE_URL}${info.path}`);
    const method = info.method;
    const headers: Record<string, string> = {};

    const fetchConfig: RequestInit = {
        method, headers
    };

    if (info.auth) {
        const token = await Promise.resolve(getCurrentUser())
            .then(user => user?.getIdToken());
        if (!token) throw new Error("User is not authenticated");
        headers.authorization = `Bearer ${token}`;
    }

    if (params) {
        if (method === "GET") {
            for (const [key, value] of Object.entries(params)) {
                url.searchParams.append(key, value as any);
            }
        } else if (info.json) {
            headers["Content-Type"] = "application/json";
            fetchConfig.body = JSON.stringify(params);
        } else {
            const body = new FormData();

            for (const [key, value] of Object.entries(params)) {
                body.append(key, value);
            }

            fetchConfig.body = body;
        }
    }
    
    let response = await fetch(url.toString(), fetchConfig);

    // 可能是 token 尚未更新，嘗試重新取得一次
    for (let tryCount = 0; tryCount < 5 && response.status === 401 && name === Api.userLogin; tryCount++) {
        await sleep(3000); // 避免短時間內重複請求
        response = await fetch(url.toString(), fetchConfig);
    }

    if (!response.ok) {
        const errorMessage = `API ${name} failed: ${response.status} ${response.statusText}`;
        if (isDev) {
            console.error(errorMessage);
        }
        throw new Error(errorMessage);
    }

    return await response.json();
}

// 開發環境下的除錯工具
if (isDev) {
    Object.assign(globalThis, {
        apiDocs: `${ENV.API.BASE_URL}/docs`,
        api: Object.assign((e: any, params: any) => api(e, params), {
            docs: `${ENV.API.BASE_URL}/docs`,
            base: { api: ENV.API.BASE_URL, ws: ENV.API.WS_BASE_URL },

            userLogin: () => api(Api.userLogin),
            userSetup: (params: ApiParam.UserSetup) => api(Api.userSetup, params),
            userGetItems: () => api(Api.userGetItems),
            marketGetItems: () => api(Api.marketGetItems),
            marketPurchaseItems: (params: ApiParam.PurchaseMarketItems) => api(Api.marketPurchaseItems, params),
            chatGetToken: () => api(Api.chatGetToken),
            petFeed: (params: ApiParam.FeedPet) => api(Api.userFeedPet, params)
        })
    });
}