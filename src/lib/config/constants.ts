// 環境配置常數
export const ENV = <const> {
    // API 配置
    API: {
        TSL: true,
        get PROTOCOL() { return this.TSL ? "https" : "http"; },
        get WS_PROTOCOL() { return this.TSL ? "wss" : "ws"; },
        // HOST: "127.0.0.1:8000",
        // HOST: "192.168.28.45:8000",
        HOST: "cards-responding-eleven-buzz.trycloudflare.com", // Cloudflare Tunnel URL
        get BASE_URL() { return `${this.PROTOCOL}://${this.HOST}`; },
        get WS_BASE_URL() { return `${this.WS_PROTOCOL}://${this.HOST}`; }
    },

    // Firebase 配置
    FIREBASE: {
        apiKey: "AIzaSyAB5pLZ_zZVA6a3TNDip5kTiGoARAKIRyk",
        authDomain: "veggibuddy-db.firebaseapp.com",
        projectId: "veggibuddy-db",
        storageBucket: "veggibuddy-db.firebasestorage.app",
        messagingSenderId: "604849657161",
        appId: "1:604849657161:web:5d98aabf189abd4cedf698",
        measurementId: "G-03L2VK6RQG"
    }
};

export const enum PetId {
    mushroom = "pet01",
    carrot = "pet02"
}

export const enum ItemId {
    generalFood = "generalFood",
    premiumFood = "premiumFood",
    coin = "coin",
    translator = "translator",
    veggieCam = "veggieCam",
    ball = "ball"
}

export const enum ItemCategory {
    currencies = "currencies",
    foods = "foods",
    others = "others"
}

// 遊戲配置常數
export const GAME_CONFIG = <const> {
    // UI 常數
    UI: {
        BUTTON_GAP: ".5rem",
        DIALOG_FADE_DURATION: 500,
        NOTIFICATION_DURATION: 5000
    },

    // Three.js 常數
    THREE: {
        FIELD_OF_VIEW: 60,
        NEAR_CLIPPING_PLANE: 0.0625,
        FAR_CLIPPING_PLANE: 1024
    },

    // 互動相關常數
    INTERACT: {
        LONG_PRESS_DURATION: 1200, // 進入撫摸模式的長按時間（毫秒）
        LONG_PRESS_TROLERANCE: 8 * window.devicePixelRatio, // 長按時允許的最大移動距離（像素）
        PET_PROGRESS_STEP_THRESHOLD: 50, // 撫摸進度每次步進所需的長度
        PET_PROGRESS_BASIC_MAX: 20, // 撫摸進度條的基本最大值
        PET_PROGRESS_MAX_DECAY_INTERVAL: 3000 // 撫摸進度最大值衰減間隔（毫秒）
    }
};

// 遊戲機制常數
export const MECHANISM_CONFIG = <const>{
    // 食物成長值
    FOOD_GROWTH_VALUES: {
        [ItemId.generalFood]: 20,
        [ItemId.premiumFood]: 50
    },

    // 寵物等級所需經驗值
    PET_LEVEL_REQUIREMENTS: [120, 280, 500, 900, 1500]
}

// 場景 ID 列舉
export const enum SceneId {
    defaultRoom = "defaultRoom",
    throwingBallGame = "throwingGame",
    hideNSeekGame = "hideNSeekGame"
}

// 開發模式檢查
export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;