import { getCurrentUser } from "./auth";
import { ENV, isDev, ItemId, Pet } from "../config";
import type { MarketItem, UserItem, UserPetInfo, UserCurrency, PetIntro } from "$lib/services";

export const apiBase = ENV.API.BASE_URL;
export const wsBase = ENV.API.WS_BASE_URL;

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

    petGetList = "get-pets"
}

export const apiInfo = <const>{
    [Api.userLogin]: {
        method: "GET",
        path: "/user/login",
        auth: true,
        params: void 0,
        response: null! as ApiUserLoginResponse
    },

    [Api.userSetup]: {
        method: "POST",
        path: "/user/build",
        auth: true,
        params: null! as ApiUserSetupParams,
        response: null! as ApiUserSetupResponse
    },

    [Api.userGetItems]: {
        method: "GET",
        path: "/user/items",
        auth: true,
        params: void 0,
        response: null! as ApiGetUserItemsResponse
    },

    [Api.userGainCurrency]: {
        method: "POST",
        path: "/user/wallet/add",
        auth: true,
        params: null! as ApiUserGainCurrencyParams,
        response: null! as ApiUserGainCurrencyResponse
    },

    [Api.chatGetToken]: {
        method: "GET",
        path: "/chat/get",
        auth: true,
        params: void 0,
        response: null! as ApiGetChatTokenResponse
    },

    [Api.userFeedPet]: {
        method: "POST",
        path: "/user/pet/grow",
        auth: true,
        params: null! as ApiFeedPetParams,
        response: null! as ApiFeedPetResponse
    },

    [Api.userGetPet]: {
        method: "GET",
        path: "/user/pet/data",
        auth: true,
        params: void 0,
        response: null! as ApiGetUserPetInfoResponse
    },

    [Api.marketGetItems]: {
        method: "GET",
        path: "/market/items",
        auth: true,
        params: void 0,
        response: null! as ApiGetMarketItemsResponse
    },

    [Api.marketPurchaseItems]: {
        method: "POST",
        path: "/market/purchase",
        auth: true,
        params: null! as ApiPurchaseMarketItemsParams,
        response: null! as ApiPurchaseMarketItemsResponse
    },

    [Api.petGetList]: {
        method: "GET",
        path: "/pet",
        auth: false,
        params: void 0,
        response: null! as ApiGetPetListResponse
    }
};

export type ApiUserLoginResponse = LoginInfo
    & ApiGetUserPetInfoResponse
    & ApiGetUserItemsResponse
    & ApiGetMarketItemsResponse
    & ApiUserGainCurrencyResponse;

export type ApiUserSetupParams = {
    name: string;
    pet: {
        growthValue: 0;
        type: Pet;
    };
};

export type ApiUserSetupResponse = ApiUserLoginResponse;

export type ApiGetUserItemsResponse = {
    backpack: UserItem[];
};

export type ApiUserGainCurrencyParams = {
    action: "LOGIN" | "PET" | "TALK" | "CHAT";
    isARMode: boolean;
};

export type ApiUserGainCurrencyResponse = {
    currencies: UserCurrency[];
};

export type ApiGetChatTokenResponse = string;

export type ApiGetUserPetInfoResponse = {
    pet: UserPetInfo;
};

export type ApiFeedPetParams = {
    items: Partial<Record<ItemId, number>>;
};

export type ApiFeedPetResponse = ApiGetUserPetInfoResponse 
    & ApiGetUserItemsResponse;

export type ApiGetMarketItemsResponse = {
    market: MarketItem[];
};

export type ApiPurchaseMarketItemsParams = {
    items: Partial<Record<ItemId, number>>;
};

export type ApiPurchaseMarketItemsResponse = ApiGetUserItemsResponse;

export type ApiGetPetListResponse = {
    pets: PetIntro[];
};

export async function api<T extends Api>(name: T, params?: typeof apiInfo[T]["params"]): Promise<typeof apiInfo[T]["response"]> {
    const info = apiInfo[name];
    if (!info) throw new Error(`API endpoint ${name} not found`);

    const url = new URL(`${apiBase}${info.path}`);
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
        } else {
            headers["Content-Type"] = "application/json";
            fetchConfig.body = JSON.stringify(params);
        }
    }

    if (isDev) {
        console.log(`[API] ${name} headers:`, headers);
        if (fetchConfig.body) {
            console.log(`[API] ${name} body:`, fetchConfig.body);
        }
    }

    const response = await fetch(url.toString(), fetchConfig);

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
        apiDocs: `${apiBase}/docs`,
        api: Object.assign((e: any, params: any) => api(e, params), {
            docs: `${apiBase}/docs`,
            base: { api: apiBase, ws: wsBase },

            userLogin: () => api(Api.userLogin),
            userSetup: (params: ApiUserSetupParams) => api(Api.userSetup, params),
            userGetItems: () => api(Api.userGetItems),
            marketGetItems: () => api(Api.marketGetItems),
            marketPurchaseItems: (params: ApiPurchaseMarketItemsParams) => api(Api.marketPurchaseItems, params),
            chatGetToken: () => api(Api.chatGetToken),
            petFeed: (params: ApiFeedPetParams) => api(Api.userFeedPet, params)
        })
    });
}