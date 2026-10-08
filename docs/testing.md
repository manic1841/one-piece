# 測試指南 (Testing Guide)

本文件說明專案的三層測試策略:單元測試 (unit)、整合測試 (integration) 與瀏覽器 E2E 測試,以及各自的執行方式與邊界。E2E 不取代 domain、application、Emulator boundary tests。

## 測試總覽

| 層級     | 指令                    | 需要模擬器 | 說明                                                |
| -------- | ----------------------- | ---------- | --------------------------------------------------- |
| 格式     | `pnpm format`           | 否         | Prettier 自動排版（寫入型，commit 前執行）          |
| 單元測試 | `pnpm test`             | 否         | happy-dom 環境,驗證 domain、use case 與 UI 元件行為 |
| 覆蓋率   | `pnpm test:coverage`    | 否         | 單元測試範圍的 text/JSON/HTML 報告                  |
| 整合測試 | `pnpm test:integration` | 是         | 對 Firebase Emulator 驗證持久化與 security rules    |
| E2E 測試 | `pnpm test:e2e`         | 是         | Playwright 最小 browser smoke suite,涵蓋關鍵旅程    |

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

### 元件測試 (UI)

元件測試只服務於**有邏輯的表單與互動**(例如分配比例即時加總),不為純樣式、
文案或 Tailwind class 撰寫斷言。這是前瞻性規則:既有行為測試保留,不受此限;
**架構守門測試**(`design-contract.test.ts`、`layer-boundary.test.ts` 這類驗證
跨檔契約的測試)**不算元件測試**,不受本節約束。

### 測試環境與轉譯(效能)

單元測試環境為 `happy-dom`(非 jsdom),React 轉譯使用 `@vitejs/plugin-react-swc`。
兩者皆為純效能選擇:實測在 12 vCPU 容器上把整套 `<Test Files>` 由約 75s 降到約 54s,
測試集合與結果完全不變。`vite.config.ts`(dev/build)仍使用 babel + react-compiler,
不受影響;請勿為了「一致」而把兩者混用。

兩個已知的 happy-dom 差異與其處理方式:

- CSS 引擎不解析 `conic-gradient`,故 `DonutChart` 的環形幾何改由純函式
  `buildDonutSlices()` 斷言,而非讀取 inline style;`hsl(...)` 仍由 happy-dom 保留,
  圖例 swatch 可直接比對。
- `matchMedia` 有實作且預設回報 1024px 視窗,故 `Layout` 的 mobile bottom sheet
  測試以 `stubMobileViewport()` 明確指定行動版視窗,不再依賴環境預設值。

## 整合測試

```bash
pnpm test:integration
```

- 執行 `vitest.integration.config.ts`,include `src/**/*.integration.test.{ts,tsx}`。
- 執行前由 `vitest.integration.setup.ts` 呼叫 `assertEmulatorsAvailable()`，
  在 15 秒期限內重試等待 emulator 可連線，逾時才提早失敗。
- 需要 Firestore (8080) 與 Auth (9099) 模擬器運行中。

### 模擬器資料會被清空(unit 除外)

**任何一層的測試 reset 都是對 emulator 專案發出整庫 DELETE**——單一事實,不是兩個
各自獨立的地雷:

- **integration**:`resetMockDb()` 於每個 `beforeEach` 清空**整個** `demo-project`
  的 Firestore 資料,**清空後不還原**,跑完 app 會落 `/access-denied`。要繼續手動
  QA 得自行 `pnpm qa:init && pnpm qa:seed`。範圍設計見 issue #208。
- **E2E**:`e2e/support/reset.ts` 用同一種整庫 DELETE,但**清空後立刻**
  `qa:init` + `qa:seed`,環境停在已知良好狀態;執行時會**印出清空警告**,不讓清空
  變成靜默副作用。

`pnpm test`(unit)不使用 emulator,不受影響。

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

Monthly close 種子寫入三個期間狀態形狀(見
[monthly-close.md](monthly-close.md) §2);期間矩陣與 `2026-09` 不寫入
紀錄的原因見 [qa-seed-data.md](qa-seed-data.md) §4(種子的單一來源),
本文件不複述。

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

## 覆蓋率政策

覆蓋率門檻是**防退化**,不是一次達標的願望。政策:

- **全域 ratchet**:門檻設在目前實測值,只允許往上調,不允許退步。
- **`src/domains/**` 另設專屬門檻\*\*:風險真正集中在「數字算對」,domain 的門檻
  高於全域並獨立往上收。
- **UI 不設門檻**:避免為了衝數字而寫沒有意義的 render 斷言。

具體百分比是會隨程式碼變動的值,只住在 `vitest.config.ts` 的
`coverage.thresholds`,本文件不複述數字;「domain 高、UI 不設、只升不降」
才是這裡要守的語意不變式。

## 不變量與黃金資料集

### 黃金資料集單一來源

確定性的完整資料集由 `pnpm qa:seed` 提供(建構邏輯在 `scripts/qa/plan`),
是**唯一來源**:報表與結算的測試從同一份 seed plan 讀資料,不另建 test-only
的資料集,避免同一份事實有兩個家。

預期數字一律**獨立手算**,不重算被測程式自己的算式——這延續
`src/test/qaSeedPlan.test.ts` 的既有原則,讓斷言能抓到實作錯誤而非複述它。

### 不變量

以下四條以跑在黃金資料集上的**確定性 round-trip** 驗證,不引入 property-based
測試框架:

1. 每筆 Transaction 借方合計 = 貸方合計。
2. 專案餘額可由 Transaction + Allocation 完整重算,與 Snapshot 一致。
3. `currentBalance` 可由 entries 重算。
4. 資產負債表永遠平衡(權益為推算值)。

①在 `src/test/qaSeedPlan.test.ts`,②③④在 `src/test/qaSeedInvariants.test.ts`;
每一條都走與產生 seed 文件**不同**的生產路徑重算,再與 seed 的結果比對。
③只涵蓋視窗內有 entry 的債務帳戶(視窗外結清的帳戶其餘額無 entry 可推)。

## Fixture factory

`src/test/factories/` 提供 `buildAccount()`、`buildTransaction()`、
`buildDebtAccount()` 與各 snapshot builder:預設值合法、可用 `Partial` override、
**不含 Firestore write**(純物件)。集合路徑與 `setDoc` 集中在 `src/test/seeds.ts`
的 seed writer(薄薄一層包住 builder),跨檔重複的 seed helper 只留下單一檔案特有的
參數形狀,集合路徑不再各自重寫。

## E2E 測試(瀏覽器)

E2E 由 [Playwright](https://playwright.dev/) 驅動,是最後一層信心來源,
驗證「使用者可完成關鍵旅程」,不取代 domain、application 與 Emulator boundary
tests。刻意維持精簡;目前涵蓋的旅程如下(清單隨需求增減,不固定條數):

- 登入:白名單內可進、白名單外被擋。
- 記收入 → 確認分配 → 目標專案該月收入增加(觀測點是專案 MONTHLY CASH FLOW 的
  當月列:SUMMARY 固定為最近 12 個月合計、PROJECT BALANCE 是快照衍生值,
  兩者都不是「即時增加」的觀測點,見 [visual-standards.md](ui/visual-standards.md))。
- 記支出 → 交易列表出現(專案餘額同樣是快照衍生值,於結算時更新)。
- 關帳:從「尚未開始關帳」的期間開始(seed 的 `2026-09`),依序走完 8 階段
  (帳戶餘額 → … → Close Period)、正式關帳,報表歷史出現該期間。
- 報表漂移阻擋關帳:關帳走完 8 階段後補記一筆落在該期間的支出,關帳畫面出現
  `<persisted> -> <preview>` 漂移標註且關帳鈕停用;走漂移區塊的捷徑回到 Financial
  Reports 重新產生報表後,漂移消失、關帳通過(ADR-0073,見
  [monthly-close.md](monthly-close.md) §3)。
- 預填／草稿的期間邊界:在 `2026-09`(測試自行按下「開始關帳」)的帳戶餘額輸入一組
  可辨識的草稿值,切換期間至 `2026-08` 後,斷言該欄位是自己期間的數字——既非草稿、
  也非另一期間的預填(`2026-08` 種子為 `CLOSED`,欄位唯讀並顯示該月快照,是這條
  邊界最強的觀測形狀;CONTEXT §預填)。
- 重開已關帳期間觸發連鎖降級:重開 `2026-07`(種子 `CLOSED`)後,該期間不再是 CLOSED、
  退回 Financial Reports 待確認,既有已產生報表保留為比對基準;其後已關帳的 `2026-08`
  轉為 `NEEDS_REVIEW`(ADR-0066)。狀態轉移與降級後的階段形狀由
  `financial_period/stateMachine.test.ts` 與
  `monthlyCloseWorkflowUseCase.integration.test.ts` 守;這條旅程守的是使用者實際看到的
  跨期間畫面結果——cascade banner 由 `isCascadeDemoted` 分支渲染,下層不斷言畫面。

專案間轉帳不在範圍(功能暫停,見 [ADR-0042](adr/0042-pause-project-transfer-feature.md));
貸款、退休匯入、offline 等列為 backlog。

### 執行方式與邊界

```bash
pnpm test:e2e
```

- **只跑 chromium,對 `pnpm dev`(Vite dev server)驅動**:沿用 `vite.config.ts`
  既有的同源 emulator proxy。對 production preview 執行需另補 `preview:` proxy,
  且 build artifact 的正確性已由 `tsc -b` 與 `vite build` 覆蓋,列為 backlog。
- **emulator 由外部啟動**,與 integration test 的心智模型一致;Playwright 的
  `webServer` 只負責起 Vite dev server,`globalSetup` 負責對 emulator 執行
  `qa:init` / `qa:seed`,不另寫一份 seed。
- **會動狀態的 spec 自行 reset**:`qa:seed` 以 merge 寫入、**永不刪除** spec 新建的
  文件,因此關帳/重開等 spec 若沿用前一輪殘留的狀態,就無法單獨執行。這類 spec 在
  `beforeAll` 呼叫 `e2e/support/reset.ts` 的 reset(清空 Firestore → `qa:init` →
  `qa:seed`),使結果與執行順序無關;`globalSetup` 也用它建立首次的乾淨狀態。
- **登入以 Auth emulator REST 取得 session 後注入 SDK 儲存**:走
  `signInWithPassword` 拿 token,寫入 localStorage 與 IndexedDB(集中在
  `e2e/support/auth.ts` 一個檔)。應用目前只有 Google popup 登入,容器內無法完成,
  故不驅動登入頁;injection 只在 Playwright context 內生效,不進生產 bundle,且僅指向
  本機 emulator(`demo-project`、公開假 API key、拋棄式 QA 帳號),不得指向生產專案。
- **gate 位置**:只在 PR 與 main push 跑(見 `test.yml`),不放進每次 push。
  決策取捨見 [ADR-0082](adr/0082-e2e-playwright-limited-critical-journeys.md)。

E2E 檔案住在根目錄 `e2e/`(非 `src/`,避免被 Vitest 的 `include` 與 `tsc -b` 誤收),
設定在根目錄 `playwright.config.ts`。

## Docker 環境執行

```bash
docker compose run --rm app pnpm test
docker compose run --rm app pnpm test:integration
docker compose down
```

`pnpm test` 不需要 emulator;`pnpm test:integration` 會透過 Compose service
名稱連線到 Firebase Emulator。若直接在 host 執行 integration tests,helper
會使用 published localhost ports。
