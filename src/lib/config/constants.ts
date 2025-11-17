// 環境配置常數
<<<<<<< HEAD
export const ENV = {
  // API 配置
  API: {
    PROTOCOL: "http",
    WS_PROTOCOL: "ws",
    HOST: "127.0.0.1:8000",
    get BASE_URL() {
      return `${this.PROTOCOL}://${this.HOST}`;
=======
export const ENV = <const> {
    // API 配置
    API: {
        PROTOCOL: "http",
        WS_PROTOCOL: "ws",
        // HOST: "127.0.0.1:8000",
        HOST: "192.168.28.45:8000",
        get BASE_URL() { return `${this.PROTOCOL}://${this.HOST}`; },
        get WS_BASE_URL() { return `${this.WS_PROTOCOL}://${this.HOST}`; }
>>>>>>> origin/develop
    },
    get WS_BASE_URL() {
      return `${this.WS_PROTOCOL}://${this.HOST}`;
    },
  },

<<<<<<< HEAD
  // Firebase 配置
  FIREBASE: {
    apiKey: "AIzaSyAB5pLZ_zZVA6a3TNDip5kTiGoARAKIRyk",
    authDomain: "veggibuddy-db.firebaseapp.com",
    projectId: "veggibuddy-db",
    storageBucket: "veggibuddy-db.firebasestorage.app",
    messagingSenderId: "604849657161",
    appId: "1:604849657161:web:5d98aabf189abd4cedf698",
    measurementId: "G-03L2VK6RQG",
  },
} as const;

// 遊戲配置常數
export const GAME_CONFIG = {
  // UI 常數
  UI: {
    BUTTON_GAP: ".5rem",
    DIALOG_FADE_DURATION: 500,
    NOTIFICATION_DURATION: 5000,
  },
} as const;
=======
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

// 遊戲配置常數
export const GAME_CONFIG = <const> {
    // UI 常數
    UI: {
        BUTTON_GAP: ".5rem",
        DIALOG_FADE_DURATION: 500,
        NOTIFICATION_DURATION: 5000
    },

    INTERACT: {
        LONG_PRESS_DURATION: 1200, // 進入撫摸模式的長按時間（毫秒）
        LONG_PRESS_TROLERANCE: 8 * window.devicePixelRatio, // 長按時允許的最大移動距離（像素）
        PET_PROGRESS_STEP_THRESHOLD: 50, // 撫摸進度每次步進所需的長度
        PET_PROGRESS_BASIC_MAX: 20, // 撫摸進度條的基本最大值
        PET_PROGRESS_MAX_DECAY_INTERVAL: 3000 // 撫摸進度最大值衰減間隔（毫秒）
    }
};
>>>>>>> origin/develop

export const enum PetId {
  mushroom = "pet01",
  carrot = "pet02",
}

export const enum ItemCategory {
  currencies = "currencies",
  foods = "foods",
  others = "others",
}

export const enum ItemId {
  generalFood = "generalFood",
  premiumFood = "premiumFood",
  coin = "coin",
  translator = "translator",
  ball = "ball",
  veggieCam = "veggieCam",
}

export const enum CoinId {
  coin = ItemId.coin,
}

export const FOOD_GROWTH_VALUES = <const> {
    [ItemId.generalFood]: 20,
    [ItemId.premiumFood]: 50
}

export const PET_LEVEL_REQUIREMENTS = <const> [120, 280, 500, 900, 1500];

// 開發模式檢查
export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;
