# capstone-project

## 部屬

- [PWA](https://web.dev/articles/add-manifest)

## APIs

- WebGPU：場景、介面渲染
- Vibration：振動
- Notifications：通知
- Service Worker：資源穫取、伺服器推送接收、背景運行
- Storage：資源管理

## 抗鋸齒

- 超採樣抗鋸齒 Super-Sampling Anti-Aliasing
- 多重採樣抗鋸齒 Multi-Sampling Anti-Aliasing
- 快速近似抗鋸齒 Fast Approximate Anti-Aliasing

## 未來展望

### WGSL 語法管理

利用 JavaScript 或 TypeScript 實現組成 WGSL 功能，以結合渲染資源管理。如獲取 Vertex Buffer 確定資料序列的 Shared Location，需要綁定的統一變數、存儲緩衝屬於哪一個綁定群組等等。
