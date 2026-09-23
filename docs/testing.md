# 測試指南 (Testing Guide)

本文件說明專案的三層測試策略:單元測試 (unit)、整合測試 (integration) 與瀏覽器 E2E 測試,以及各自的執行方式與邊界。E2E 不取代 domain、application、Emulator boundary tests。

## 測試總覽

| 層級     | 指令                    | 需要模擬器 | 說明                                             |
| -------- | ----------------------- | ---------- | ------------------------------------------------ |
| 單元測試 | `pnpm test`             | 否         | jsdom 環境,驗證 domain、use case 與 UI 元件行為  |
| 覆蓋率   | `pnpm test:coverage`    | 否         | 單元測試範圍的 text/JSON/HTML 報告               |
| 整合測試 | `pnpm test:integration` | 是         | 對 Firebase Emulator 驗證持久化與 security rules |
| E2E 測試 | 未導入(見下)            | 是         | 最小 browser smoke suite,屬 roadmap 最後階段     |

## 單元測試

```bash
pnpm test
```

- 執行 `vitest.config.ts`,include `src/**/*.{test,spec}.{ts,tsx}`,排除 `*.integration.test.*`。
- 不需要 Firebase Emulator;所有 Firebase 依賴以 mock 取代。
- 慣例:mock 被測 use case 觸及的所有 repository 與 permission service,避免意外真實 I/O。
- 產生覆蓋率報告:

```bash
pnpm test:coverage
```

## 整合測試

```bash
pnpm test:integration
```

- 執行 `vitest.integration.config.ts`,include `src/**/*.integration.test.{ts,tsx}`。
- 執行前由 `vitest.integration.setup.ts` 呼叫 `assertEmulatorsAvailable()`，
  在 15 秒期限內重試等待 emulator 可連線，逾時才提早失敗。
- 需要 Firestore (8080) 與 Auth (9099) 模擬器運行中。

### 模擬器環境變數

在 Docker dev stack 內,emulator host 是 service 名稱 `firebase`;本機以
`firebase emulators:start --only firestore,auth` 執行時使用 `127.0.0.1`。

```bash
# Docker dev stack 內
FIRESTORE_EMULATOR_HOST=firebase:8080 \
FIREBASE_AUTH_EMULATOR_HOST=http://firebase:9099 \
FIREBASE_PROJECT_ID=demo-project \
pnpm test:integration

# 本機
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=http://127.0.0.1:9099 \
FIREBASE_PROJECT_ID=demo-project \
pnpm test:integration
```

執行單一整合測試檔,附加路徑即可:

```bash
FIRESTORE_EMULATOR_HOST=firebase:8080 \
FIREBASE_AUTH_EMULATOR_HOST=http://firebase:9099 \
FIREBASE_PROJECT_ID=demo-project \
pnpm test:integration src/test/firestoreRules.integration.test.ts
```

### Firestore security rules 測試

`src/test/firestoreRules.integration.test.ts` 使用
[`@firebase/rules-unit-testing`](https://firebase.google.com/docs/rules-unit-testing)
驗證 `firestore.rules` 的強制執行。Rules 在 `beforeAll` 透過 emulator 的
`securityRules` REST API 熱載入,並在 `afterAll` 還原為寬鬆設定,因此不影響
其他整合測試。除了運行中的 emulator 外不需額外設定。

### 瀏覽器 QA 用模擬器資料

需要登入狀態的瀏覽器測試(手動 QA 或未來的 E2E)可先執行模擬器 bootstrap:

```bash
pnpm qa:init
```

此腳本建立測試帳號、whitelist、household 與 user profile,並印出可貼入
DevTools 的 localStorage session 注入片段。細節見
[scripts/admin/README.md](../scripts/admin/README.md)。

### QA 財務資料 seed

`qa:init` 只建立帳號門戶;要讓每個 domain 有可測試的實際資料,再執行:

```bash
pnpm qa:seed
```

此腳本以固定 doc ID 寫入確定性的財務資料集(projects、accounts、
ledgerCodes、intent_mappings、allocationTemplates、transactions、
allocations、debtAccounts、portfolios、retirement_plans 全套子集合,
以及由純 domain calculator 推導出的 project/account/debt/portfolio
snapshots 與三份財務報表)。腳本可重複執行(upsert,非 append)。
資料窗口固定在 2025-01～2026-09,確保退休收入流的 sampleYear 與報表
本期都有資料支撐。`operation` 集合不 seed(runtime 重試記錄)。

### 瀏覽器 QA 環境注意事項

以下為 2026-09-11 在 Docker dev stack 內做瀏覽器 QA 時實測到的限制:

- `qa:init` 與 admin scripts 讀取 `FIRESTORE_EMULATOR_HOST` /
  `FIREBASE_AUTH_EMULATOR_HOST` / `FIREBASE_PROJECT_ID`,值可含或不含
  `http://` 前綴;未設定時預設 `localhost:8080/9099`,並會印出實際解析
  後的連線目標。在 Docker dev stack 內直接附上 service 名稱即可:

  ```bash
  FIRESTORE_EMULATOR_HOST=firebase:8080 \
  FIREBASE_AUTH_EMULATOR_HOST=firebase:9099 \
  FIREBASE_PROJECT_ID=demo-project \
  pnpm qa:init
  ```
- Firebase JS SDK v12 的登入 session 以 IndexedDB
  (`firebaseLocalStorageDb` 的 `firebaseLocalStorage` store)為主要來源,
  localStorage 只是 fallback。只注入 localStorage 片段可能不會生效;注入
  失敗時可改以 Identity Toolkit REST API 對 Auth emulator 呼叫
  `signInWithPassword` 取得 token,再同時寫入 localStorage 與 IndexedDB。
- 容器化瀏覽器內的 Google 登入 popup 可能無法完成(需存取 Google 網域),
  瀏覽器 QA 請優先使用測試帳號。
- 需要 production build 的 QA 頁面時,使用 `pnpm preview`(或開發中的
  `pnpm dev`),兩者皆有 SPA fallback;以一般靜態伺服器直接伺服 `dist/`
  缺少 fallback,深層連結(如 `/transactions`)會 404。
- 更多的除錯案例(REST 種子文件 schema 靜默吞錯、session 注入儲存層、
  listen channel quirk、種子資料掛錯家戶等)索引於
  [QA FAQ](./qa-faq.md)。

## 應用邊界與測試 seam

### 月度關帳應用邊界

月度關帳的對外測試邊界是**月度關帳 use case 的整合測試**:

`src/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase.integration.test.ts`

測試在 Firebase Emulator 上驅動 `monthlyCloseWorkflowUseCase`
(`MonthlyCloseWorkflowUseCase`) 的 `start` 與 `confirmStage`,只從 use case
邊界觀察整個流程,不穿透斷言內部步驟:

- `start` 後期間進入 IN_PROGRESS,並可觀察目前階段。
- `confirmStage` 逐階段推進 workflow 狀態;階段順序僅為 UI 引導,系統不強制
  (見 [ADR-0052](adr/0052-monthly-close-stage-data-boundary.md))。
- 對帳差異或缺漏必填輸入產生 review-required 狀態,阻止期間被錯誤關閉。
- FINANCIAL_REPORTS 階段產生三份報表後,期間才可關閉。
- 關閉後期間狀態為 CLOSED,Dashboard 的關帳狀態反映新狀態。

此邊界只暴露對外可觀察的財務狀態變化,文件不使用設計討論期的暫稱。

### 不新增高層測試 seam

除上述月度關帳應用邊界外,**不新增其他跨模組的高層測試 seam**。理由:現有
unit / integration / E2E 三層已足以覆蓋對外行為;多一條 seam 就多一層要同步
維護的抽象,卻不增加可觀察行為的覆蓋。只有在單一應用邊界經實作驗證仍無法暴露
所需外部行為時,才新增 seam。

## E2E 測試(瀏覽器)

目前尚未導入 E2E 測試。E2E 是最後一層信心來源:在 complex hook 的 loading/error/retry/cancellation/
double-submit coverage 完成後,加入最小 browser smoke suite,涵蓋:

- onboarding
- transaction entry
- monthly settlement
- report viewing

定位:E2E 驗證「使用者可完成關鍵旅程」,不取代 domain、application 與
Emulator boundary tests。導入時應更新本文件與 `package.json` 的 test scripts。

## Docker 環境執行

```bash
docker compose run --rm app pnpm test
docker compose run --rm app pnpm test:integration
docker compose down
```

`pnpm test` 不需要 emulator;`pnpm test:integration` 會透過 Compose service
名稱連線到 Firebase Emulator。若直接在 host 執行 integration tests,helper
會使用 published localhost ports。
