# 開發指南 (Development Guide)

本文件說明在 One-Piece 專案中新增功能或修改邏輯的標準流程。

## 1. 新增功能的標準流程

當你想要新增一個功能（例如：處理資產買賣、自動對帳）時，請遵循以下步驟：

### 第一步：定義領域模型 (Domain Layer)

- 在 `src/domains/{domain_name}/` 建立 `schemas.ts` 與 `types.ts`。
- **嚴禁**直接在 `src/infra/schemas/` 定義業務類型。

### 第二步：實作存取層 (Infrastructure Layer)

- 在 `src/infra/repositories/` 建立 Repository。
- 一般 CRUD Repository 應繼承 `BaseRepository`，並引用 **Domain Layer** 定義的 Schema。
- 若資料需要專用的 operation schema、server timestamp 或 Firestore transaction
  讀寫封裝，可以使用明確的 custom Repository；仍須把資料契約放在 Domain
  Layer，並讓 transaction context 由 Application Use Case 傳入。

### 第三步：建立原子使用案例 (Application Use Cases)

- 在 `src/application/{domain_name}/use_cases/` 建立單一職責的操作。
- 複雜的校驗邏輯應放進 **Domain Service**。

### 第四步：建立控制器 (Controller Hook)

- 在 `src/ui/features/{feature_name}/hooks/` 建立 Hook。
- Hook 職責：管理 UI 狀態（含表單狀態）、注入 `AuthContext`、呼叫 Use Case。
- 讀寫分離：寫入放 Command（`*Cmds`），讀取放 Query 或 Controller；`*Cmds` 內不得出現讀取。
- 層級與可觸碰清單見 [`ui/ui-layer-architecture.md`](ui/ui-layer-architecture.md)。

### 第五步：建立 UI Form ViewModel 與 Mapper (UI Layer)

- 在 `src/ui/features/{feature_name}/viewmodels/` 建立表單 VM Schema（Zod）。
- 定義 `mapXxxVMToDomain`，集中處理字串/日期/數值轉換。
- 規則：Component 與 Hook 不得直接組裝 Domain payload。

### 第六步：實作 UI 組件

- 呼叫 Hook 並渲染畫面。
- Component 與 Page（Surface）不得 import `@/domains`、`@/application`、`@/infra`，**連型別也不行**；需要 domain 形狀時由 ViewModel 轉出（ADR-0062）。
- 提交路徑必須經過 `Schema.parse -> Mapper -> UseCase`。

## 2. 代碼風格要求

- **不要直接呼叫 Repository**: 除非是極其簡單的讀取，否則應透過 Use Case 排列組合業務邏輯。
- **編排規則**: 單一使用者操作不得編排多個 Use Case——多步流程屬 Workflow（如月度關帳），住在 application 層。一個 Hook 檔提供多個 Use Case 作為操作選單不算編排，是允許的。
- **嚴格型別**: 正式程式碼絕對禁止使用 `any`。測試檔為了建立 mock 或 fixture，已由 ESLint 測試檔規則放寬 `no-explicit-any`；能使用 `unknown`、具體型別或 typed helper 時仍應優先使用。
- **單一職責**: 一個 Use Case 文件只做一件事（例如：`recordTransactionUseCase.ts` 只負責記錄交易）。
- **表單一致性**: 表單資料必須先映射到 ViewModel，再由 mapper 轉換成 domain 型別。
- **驗證一致性**: 所有新表單路徑統一採用 Zod schema，禁止分散式手寫驗證。

## 3. 維護建議

- **決策與規範分開更新**: 修改架構或業務取捨時，新增或修訂 `docs/adr/` 中的決策（只記為什麼）；修改規則、結構或流程時，更新該事實歸屬的主題文件。同一事實只留一處，分工見下。
- **規範數值衝突裁決**: 當兩份文件對同一事實給出不同數值時（例如列高、頁寬），以**該事實歸屬文件中最新的實測值**為準，並在同一個 task 內修掉另一處的 stale 敘述（含 ADR 裡的歷史敘述），不讓兩個數字並存。衝突不會自己消失，只會累積。
- **設計暫置不在版控內**: 設計討論期的暫置內容（spec 套件、原型、實作計畫）不是事實來源；討論階段把決策記在 GitHub issue，原型以 throwaway 分支承載（見下）。功能落地時在同一個 task 內把行為/結構併入對應正式文件、取捨決策併入或修訂 ADR、術語更新 `CONTEXT.md`，然後刪除已整合的暫置檔案（git 歷史保留）；同一事實不得留在兩處。**repo 內不留任何設計暫置資料夾**——已退役的暫置資料夾不得重建。正式文件不得引用暫置路徑或 spec 檔名（含「spec 加編號」這類間接寫法），`pnpm docs:check` 會擋下並指出位置，並在該資料夾重現時直接失敗；CI 與 pre-commit 皆執行。
- **原型捕獲準則**: 原型是為回答一個問題而生的可丟棄產物，不是例行產物，只在「問題需要跑起來才知道答案」時建立；建立流程與兩種形態（logic / UI）見 `.agents/skills/prototype/`。問題得解後依該 skill 規則 6 捕獲：驗證過的決策併入正式程式碼；原型本身作為 primary source commit 到一條 throwaway 分支（自 `main` 切出、永不併回 `main`，且須推到 `origin`，否則 pointer 指向一個別人不存在的 ref）；在**實作 issue** 留下指向該分支的 context pointer，並記下 verdict 與它解決的問題；`main` 只保留已驗證的決策。ADR 只記錄決策，不引用原型或暫置路徑。捕獲時內容不得改動。
- **一份 spec 一條原型分支**: 同一份 spec 的原型只有一個。即使當初因故拆成多個 HTML 檔，所有檔案仍屬同一份原型、放同一條 `prototype/<spec>` 分支，不按檔數拆成多條。
- **維護結構參考**: 如果修改了資料結構，更新 `docs/data-structure.md` 的欄位清單與 ADR 連結。
- **保持 `docs/` 的準確性**: 主題文件說明現在如何運作，規範細節住在這裡；決策理由集中在 ADR。
- **效能考量**: 避免在前端進行超大規模的資料處理與循環引用。
- **備份/還原流程**: Settings 提供 household 等級的 JSON 備份與還原。還原應包含各主集合與其 snapshot 子集合，並限制為 household owner/admin（或 global admin）可執行。

### 文件分工：每份文件回答什麼問題

判斷一份文件該不該存在、內容該放哪，看它**回答什麼問題**，不看它叫什麼名字。每個問題只有一個地方負責回答。

| 文件 | 回答什麼問題 | 不放什麼 |
| --- | --- | --- |
| `CONTEXT.md` | 這個詞在我們的系統裡精確指什麼？ | 實作細節、任何「為什麼」、架構與 UI 詞彙 |
| `docs/adr/` | 這個決定當初為什麼這樣下？ | 欄位清單、enum 全集、錯誤碼表、驗收清單、class 名 |
| 主題文件（`architecture`、`data-structure`、`financial_report`、`retirement-system`、`debt-accounts`、`transaction-flow`、`monthly-close`、`ddd-design-principles`、`ui/*`） | 現在的規則與資料長怎樣？ | 決策理由 |
| `docs/agents/*` | AI agent 在這個 repo 該怎麼運作？ | 給人讀的架構知識 |
| `development-guide`、`testing`、`qa-faq` | 我要怎麼做、怎麼跑、踩過什麼坑？ | 架構解釋 |
| `README.md` | 這是什麼、我要怎麼跑起來？ | 架構決策、domain 定義、長篇說明（README 是路標，不是內容本身） |

UI 與架構詞彙的 glossary 住在 `docs/ui/ui-layer-architecture.md`，不進 `CONTEXT.md`。

### ADR 只記「為什麼」

ADR 回答的是**當初為什麼這樣決定**。規範細節（欄位、enum、公式、數值、驗收清單）住在該事實歸屬的主題文件，ADR 只留一行 `規範來源` 指標。

判斷某個值該留還是該走，問一句：**拿掉這個值，這句話還講得通嗎？**

- 還講得通 → 它是列舉細節，歸主題文件。
- 講不通 → 它是這個決定的一部分，留在 ADR。

**先加後刪**：同一條事實還沒寫進它的歸屬文件之前，不得從 ADR 刪除。先讓新家成立，再拆舊家，兩件事在同一個 task 內完成。

### 新增文件前的三個測試

1. **這個問題已經有文件在回答嗎？** 有就補進去，不要新開檔案。
2. **這個內容會隨程式碼變動而過期嗎？** 會（例如「目前的 API 參數」）就屬於程式碼旁或自動產生的文件，不該手寫在獨立 markdown 裡。
3. **這是「決定」還是「事實」？** 決定（有取捨、可能被推翻）→ ADR；事實（現在系統長怎樣）→ 主題文件或 `CONTEXT.md`。

## 4. 設計決策層級與變更流程

呈現層的改動依「這是不是一個已確認的決策」分三級；層級決定改動前是否需要先取得同意。

### 設計決策層級

- **DESIGN DECISION（設計決策）**：已確認的產品或 UI 決策。**AI agent 與開發者不得在取得明確同意前變更**。
- **DESIGN GUIDELINE（設計準則）**：設計原則。必要時可依情境調整，但調整後的實作必須與整體設計語言一致。
- **IMPLEMENTATION DETAIL（實作細節）**：工程實作選擇。可在不影響使用者可見設計的前提下自由變更。

判斷順序：先問「這是決策、準則，還是細節？」——決策需要事前同意，準則需要維持一致，細節則不受此限。

### 設計變更流程

引入任何新模式（新元件、新視覺樣式、新互動）之前，先依序回答六個問題：

1. 既有元件是否已經解決這個需求？
2. 這是否符合 ONE PIECE 的視覺語言？
3. 這是否改善資訊層級？
4. 這是否降低認知負擔？
5. 這是否引入不必要的裝飾？
6. 這是否重複既有的財務概念？

若答案不明確，優先採用既有模式，而不是引入新模式。這六個問題與上面的層級是同一件事的兩面：層級說「誰能拍板」，流程說「拍板前該想什麼」。

## 5. UI 變更的 AI 規則

AI agent 修改或建立任何 UI 時，**必須**遵守：

1. 先讀 `docs/ui/` 下的呈現層文件，再動手。
2. 重用既有的 design token。
3. 盡可能重用既有元件。
4. 不在沒有正當理由的情況下引入新顏色。
5. 不引入新的字體排印。
6. 不使用大型圓角卡片。
7. 不使用裝飾性漸層。
8. 維持既有的資訊層級。
9. 維持既有的導航決策。
10. 維持財務資料的語意。
11. 不重複財務資料的輸入流程。
12. 優先採用可推導的值，而非要求使用者重複輸入。
13. 將 Monthly Close 視為 workflow。
14. 將 Navigator 視為獨立的導航層。
15. Pixel Pet 的行為與其最終美術素材保持獨立。

其中屬契約層面的細節（token、顏色、字體排印、圓角、漸層、元件表面）以 `docs/ui/` 的呈現層文件為準；本節只規範 AI agent 的義務。

## 6. 頁面級視覺 review 的掃描方法論

頁面級視覺 review 的價值在於**可重複的程序**：拿一份已落地的呈現層標準，逐節對照實際 UI，產出一份 gap inventory。當次的掃描結果是一次性證據，程序本身才是永久資產。

### 程序

1. **選定標準**：挑一份已落地的呈現層契約（例如 `docs/ui/` 下的標準文件）。
2. **逐節機械式掃描**：對標準的每一節，機械式對照 `src/ui/**` 原始碼與 `src/App.tsx` 的路由清單，列出明顯落差（硬編碼值、缺席的契約、錯誤的元件用法）。
3. **上下文抽查**：對掃描命中的每一點人工查核，排除誤判，並補上靜態掃描看不到的落差（runtime 行為、閱讀順序、行動版退化）。
4. **產出 gap inventory**：先列「已合規面」再列「落差清單」，避免只呈現問題、讓讀者無從判斷整體健康度。

### 每筆 finding 的記法

至少記錄：檔案與行號、違反標準的哪一節、落差類型，以及**裁決**：

- **resolved**：已修正——記下修正日期與對應 issue。
- **record-only**：維持現狀——記下理由（例如標準明文允許的例外）。
- **fix + 追蹤**：需修但不在當次範圍——開追蹤 issue 並記錄編號。

### 邊界

- **證據一次性、方法可重複**：當次掃描的結果（哪些頁面 fail、runtime 量測數字）不進正式文件；正式文件只保留本節的程序。
- 裁決若牽涉跨文件的數值衝突，依 §3 的 **規範數值衝突裁決** 處理。

## 7. 驗證命令

- `pnpm test`: 執行不依賴 Firebase Emulator 的 unit tests。
- `pnpm test:coverage`: 對相同的 unit test 範圍產生 text、JSON 與 HTML coverage 報告。
- `pnpm test:integration`: 執行需要 Firebase Emulator 的 integration tests；執行前會在期限內重試等待 emulator 可連線。
- `pnpm exec tsc --noEmit -p tsconfig.test.json`: 驗證測試檔的 TypeScript project 設定與 `@/*` 路徑別名；此 project 也由 root solution reference，供 IDE 解析使用，並以 declaration-only、no-check 方式納入 build graph，不進行完整語意型別檢查。
- `pnpm exec tsc -b`: 依 root solution 執行完整 build graph 型別檢查（正式程式碼）。
- `pnpm lint`: 執行唯讀 ESLint 檢查。
- `pnpm lint:fix`: 明確執行 ESLint 自動修正。
- `pnpm docs:check`: 驗證正式文件（`docs/`，加上根目錄 `CONTEXT.md`、`AGENTS.md`）不引用暫置路徑、spec 套件名、暫置檔名，以及「spec 加編號」的間接寫法，並斷言已退役的設計暫置資料夾不存在；實際攔阻樣式見 `scripts/check-doc-references.sh`。`prototype/<name>` 分支指標不在攔阻範圍。

## 7.1 CI/CD 流程

GitHub Actions 位於 `.github/workflows/`：

- **CI**（`test.yml`）：對 main/develop 的 push 與 PR 觸發。依序執行 `pnpm lint`、`pnpm docs:check`、`tsc -b`、unit tests、Firestore Emulator integration tests。Node 版本以 `.nvmrc`
  為單一真相來源；依賴以 `--frozen-lockfile` 安裝並快取 pnpm store。同一分支的新
  push 會取消舊的執行（concurrency），整體逾時 20 分鐘。
- **Deploy to Firebase Hosting on PR**（`firebase-hosting-pull-request.yml`）：
  CI 成功後，對每個 PR 與 develop 的 push 部署 Hosting preview channel。
  checkout 鎖定 `workflow_run.head_sha`，部署的 commit 與測試的 commit 一致。
  channel 名稱由 workflow 自行推導後明確傳入 `channelId`：PR 為
  `pr<N>-<branch>`（存 7 天），develop 的 push 為固定的 `develop`（每次 push
  延長到 30 天），因此 develop 有一條長期穩定的 staging URL。
- **Deploy to Firebase Hosting on merge**（`firebase-hosting-merge.yml`）：
  CI 成功後，對 main 的 push 部署到 live channel，同樣鎖定 `head_sha`。

部署以「CI 綠燈」為閘門；lint 與型別檢查也必須通過，PR 才能被視為可合併。
live 只認 push main：`pull_request` 在 PR 開啟與每次 push 時都會觸發，若讓它寫 live，
合併前、甚至最終不會合併的 PR 都會上線，且 `pull_request` checkout 的是
`refs/pull/N/merge` 這個模擬合併產物，等於把 main 上從未存在的內容推上線。

兩個部署 workflow 都以 `workflow_run` 觸發，因此其 YAML 與 secrets 一律取自預設分支
(`main`)，只有被部署的程式碼取自 `workflow_run.head_sha`。這帶來三點限制：

1. 修改部署 workflow 需合併到 `main` 後才生效；且 `workflow_run` 的執行自帶 secrets，
   所以 CI 綠燈是限制未信任程式碼的唯一防線。
2. `workflows: [...]` 比對的是被觸發 workflow 的 `name`，而該 name 取自各分支自己的
   `test.yml`。兩個部署檔目前同時監聽 `CI` 與改名前的 `Unit Tests`，屬過渡設定；等所有
   分支都跑新名字後可移除 `Unit Tests`。
3. payload 不含 `pull_request`，所以 Firebase action 不會留言到 PR、也不會建立
   `Deploy Preview` check run，且其自動命名的 channel id 會是空字串而使部署以
   `HTTP 400` 失敗。這就是上面必須自行傳入 `channelId` 的原因；preview URL 改寫入
   該次 run 的 job summary。

兩個 workflow 都會在 checkout 前確認 `head_sha` 非空，避免 `actions/checkout` 在 `ref`
為空時無聲地退回預設分支。

**preview URL 會打生產後端**，且 URL 只是難猜而非私有。詳見
[ADR 0047](adr/0047-preview-channel-shares-production-backend.md)：preview 僅供視覺確認，
不在上面錄入資料；需要可寫入的環境請用本機 Firebase Emulator。

不為 preview 另開 Firebase project（單一家庭使用，設定同步成本高於隔離效益）。Hosting
配額是 **project 層級**而非 channel 層級（免費額度 10 GB 儲存與 10 GB/月傳輸）；channel
數量本身不計費，但每個 channel 的 release 會佔用儲存，必要時在 console 設定各 channel 的
「releases to keep」上限。

各測試層級的完整說明(模擬器環境變數、security rules 測試、E2E 規劃)見
[測試指南](testing.md)。

## 8. CI/CD

見上方 7.1 節的 GitHub Actions 流程說明。

## 9. Docker 開發環境

專案提供 root-level Docker development stack，固定 Node.js 24 與 pnpm 10，並以同一個 Compose project 啟動 Vite 與 Firebase Emulator。適合需要一致工具鏈或不想在 host 安裝 Node/pnpm 的開發者。

```bash
docker compose up --build
```

Vite 預設在 `http://localhost:5173`；若 host port 已被占用，可改用其他 port：

```bash
VITE_PORT=5174 docker compose up --build
```

- Vite host port: `5173` by default, or the value supplied through `VITE_PORT`
- Firebase Emulator UI: `http://localhost:4000`
- Firestore Emulator: `localhost:8080`
- Auth Emulator: `localhost:9099`

### 瀏覽器如何連到 emulator

Compose 只發佈 app 的 port（`5173`）；emulator 的 `8080`/`9099` 只在 compose 網路內，且瀏覽器解析不到 `firebase` 這個 service hostname。因此前端預設**不直連 emulator**，而是走 Vite dev server 的同源 proxy（設定在 `vite.config.ts`，路徑常數在 `src/infra/emulatorEndpoints.ts`）：

| 前端請求 | 轉發目標 |
| --- | --- |
| `/__emulator/firestore/*` | `http://firebase:8080/*` |
| `/identitytoolkit.googleapis.com/*`、`/securetoken.googleapis.com/*`、`/www.googleapis.com/*` | `http://firebase:9099/*` |

Auth 之所以用「假 API host」前綴而非自己的路徑前綴，是因為 `connectAuthEmulator` 會強制把 URL 路徑換成 `/`；Firestore 則是 channel base URL 直接由 `host:port` 字串串接，所以路徑前綴可以放在 host 裡。細節見 `src/infra/emulatorEndpoints.ts` 的註解。

若瀏覽器本身就在 compose 網路內（可解析 `firebase`），可略過 proxy：

```bash
VITE_FIREBASE_EMULATOR_HOST=firebase docker compose up --build
```

Proxy 的上游可用 `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST` 覆寫（兩者都接受有無 scheme 的寫法）。

在 container 中執行驗證命令：

```bash
docker compose run --rm app pnpm test
docker compose run --rm app pnpm test:integration
docker compose down
```

`pnpm test` 不需要 emulator；`pnpm test:integration` 會透過 Compose service name 連線到 Firebase Emulator。若直接在 host 執行 integration tests，helper 會使用 published localhost ports。
