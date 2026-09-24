# 匯率源使用 CORS 開放的每日匯率 CDN,不自建代理

**狀態：** 已接受(2026-09)
**規範來源：** [architecture.md](../architecture.md) §1；[CONTEXT.md](../../CONTEXT.md)（匯率）

舊匯率源不送 CORS header，生產環境無法取得匯率，而開發環境靠 Vite proxy 掩蓋了這個問題。Hosting 的 rewrites 無法代理外部 URL，同源代理只剩開後端一條路，而零後端是既有現狀（ADR-0002）。

系統的匯率消費特性是決定性的：只在快照編輯器的「取得匯率」按鈕被消費，取得後凍結進 snapshot，下游全是純台幣加總，實際用量約每月一次。即時性不是需求，每日更新的匯率源完全足夠。

## Considered Options

- **`open.er-api.com`**：老牌、文件完整，但條款要求頁面放置 attribution 連結。拒絕。
- **Cloud Functions 代理**：為一個 GET 引入整條後端鏈，違反零後端現狀。拒絕。
- **沿用 Vite proxy 與 dev/prod 分支**：代理只是掩蓋 CORS 缺口，讓生產問題無法在開發環境重現。拒絕。

## Consequences

- 匯率準確性依賴社群維護的 CDN 資料源；若上游變更或終止，失敗會以明確錯誤浮現（不靜默），屆時再評估替代源。
- 取得失敗顯示錯誤並保留既有欄位值，不以預設值填補——靜默回傳 1 會讓外幣帳戶以數十倍誤差低估資產。
