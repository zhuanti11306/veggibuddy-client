# 菜菜小伙伴 (Veggie Buddy)

這是一個基於 Web 的虛擬寵物養成遊戲，結合了 3D 互動、語音對話以及多種小遊戲。玩家可以領養自己的「蔬菜」夥伴，透過餵食、互動和遊戲來陪伴它成長。

## 專案特色

*   **虛擬寵物養成**：全 3D 的寵物互動體驗，支援餵食、撫摸及日常照顧。
*   **多樣化小遊戲**：
    *   **躲貓貓 (Hide and Seek)**：結合鏡頭互動的 AR 體驗。
    *   **丟球遊戲 (Throwing Ball)**：物理模擬的互動遊戲。
*   **語音互動**：內建語音聊天功能，讓你能與寵物進行對話。
*   **經濟系統**：包含商店與背包系統，可購買食物與道具。
*   **跨裝置體驗**：針對行動裝置優化，支援陀螺儀微調視角。

## 技術棧 (Tech Stack)

本專案採用現代化的前端技術構建：

*   **核心框架**: [Svelte 5](https://svelte.dev/) (使用 Runes 響應式系統) + [Vite](https://vitejs.dev/)
*   **語言**: TypeScript
*   **3D 渲染**: [Three.js](https://threejs.org/)
*   **後端服務**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)
*   **多媒體處理**: FFmpeg (WASM) 用於音訊處理
*   **樣式**: CSS / SCSS

## 專案結構

```text
src/
├── lib/
│   ├── apis/       # 後端 API 整合 (Firebase, Auth)
│   ├── config/     # 全域設定與常數
│   ├── core/       # 核心元件 (Dialogs, Loading)
│   ├── services/   # 遊戲邏輯服務 (Game State, Interaction)
│   └── utils/      # 工具函式庫 (Three.js, FFmpeg, Animation)
├── routes/
│   ├── game/               # 遊戲主路由
│   ├── game-main/          # 主畫面 (大廳)
│   ├── game-hide-and-seek/ # 躲貓貓小遊戲
│   ├── game-throwing-ball/ # 丟球小遊戲
│   ├── game-chat/          # 語音聊天室
│   ├── game-shop/          # 商店
│   └── main-menu/          # 登入與初始選單
└── assets/         # 靜態資源 (3D 模型, 圖片)
```

## 安裝與執行

1.  **安裝依賴**

    ```bash
    npm install
    ```

2.  **啟動開發伺服器**

    ```bash
    npm run dev
    ```

3.  **建置生產版本**

    ```bash
    npm run build
    ```

## 注意事項

*   **API 連線**：本專案部分功能連接至後端伺服器。由於目前使用 Cloudflare Tunnel 進行簡易部署，若後端重啟，API 主機位置可能需要更新。
    *   設定位置：`src/lib/config/constants.ts` 中的 `ENV.API.HOST`。
*   **瀏覽器支援**：由於使用了 WebGL 與 WASM 技術，建議使用最新版本的 Chrome 或 Edge 瀏覽器以獲得最佳體驗。