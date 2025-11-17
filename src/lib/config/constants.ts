// 環境配置常數
export const ENV = {
  // API 配置
  API: {
    PROTOCOL: "http",
    WS_PROTOCOL: "ws",
    HOST: "127.0.0.1:8000",
    get BASE_URL() {
      return `${this.PROTOCOL}://${this.HOST}`;
    },
    get WS_BASE_URL() {
      return `${this.WS_PROTOCOL}://${this.HOST}`;
    },
  },

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

// 開發模式檢查
export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;
