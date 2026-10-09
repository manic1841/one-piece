# E2E 採 Playwright，只在 PR/main gate 跑關鍵旅程

**日期：** 2026-10-07
**狀態：** 已接受
**規範來源：** [testing.md](../testing.md) §E2E 測試（瀏覽器）

本專案的風險集中在「數字算對」（domain）與「權限擋對」（security rules），不在 UI 互動；因此測試重心放在 domain 單元與 Emulator 邊界測試，E2E 只作為最後一層信心來源。導入 Playwright 執行**最小 browser smoke suite**，只涵蓋使用者真正走得完的關鍵旅程——涵蓋哪幾條是會變動的內容，由 [testing.md](../testing.md) 維護，本 ADR 只記「刻意維持精簡」這個取捨。只在 **PR 與 main push** 觸發——PR 是 merge 閘門，main push 是 live 部署前一刻，兩者都必須綠燈；E2E 因此納入 CI（`test.yml`），否則部署 workflow 以「CI 綠燈」為閘門的設計會讓 E2E 形同虛設。工具選 Playwright 是因為它以瀏覽器真實行為驅動、內建 trace 與 `webServer`/`globalSetup`，能重用既有的 Vite 同源 emulator proxy 與 QA seed，不需為 E2E 另建資料來源。登入不由 UI 驅動：應用只提供 Google popup（Auth emulator 不模擬 Google 帳號選擇），因此對 Auth emulator 的 REST 端點取得 session 後注入 SDK 儲存，讓每個旅程從已登入狀態開始。

## Considered Options

- **不導入 E2E。** 拒絕：跨頁面、跨層的旅程（例如登入 → 記帳 → 月結 → 報表）沒有單一層級的測試能覆蓋，缺少這層就無法在部署前確認「使用者真的走得完」。
- **Cypress。** 拒絕：Playwright 的 `webServer`、跨 context、trace viewer 與 CI headless 支援更契合本專案「少量、穩定、只在 gate 跑」的定位。
- **擴大 E2E 覆蓋（貸款、退休匯入、offline、跨瀏覽器引擎）。** 拒絕：E2E 較慢且 flaky 成本高，擴張會把維護負擔從「數字正確」轉移到「瀏覽器相容」，與風險分布相反；這些列為 backlog，需要時再逐條評估。
- **對 production preview 而非 dev server 跑。** 拒絕：emulator 同源 proxy 只掛在 Vite `server:`，對 preview 需另補 `preview:` proxy；而「build artifact 有沒有壞」已由 `tsc -b` 與 `vite build` 覆蓋，E2E 的價值是旅程走得通。
- **驅動應用登入頁做 `signInWithPassword`。** 拒絕：應用登入頁只提供 Google popup，沒有 email/password 表單可走；Auth emulator 也不模擬 Google 帳號選擇。改以 Auth emulator REST 取得 session 後注入 SDK 儲存——代價是綁定 SDK 的儲存格式（`firebaseLocalStorageDb`），故登入斷言改為驗證「登入後畫面的可見性」（白名單進得去、白名單外被擋），而非登入流程本身。

## Consequences

- 新增 Playwright 為 devDependency，CI 需下載瀏覽器；CI 時間增加，故 E2E 只在 PR/main 跑，不在每次 push。
- E2E 需先備妥 emulator 與 seed 資料（重用 `qa:init` / `qa:seed`）；emulator 仍由外部啟動，與 integration test 的心智模型一致。
- 導入新的 E2E gate 後，若未同步更新部署 workflow 的觸發條件，E2E 不會真的擋住部署——`test.yml` 是唯一的 gate 落點。
