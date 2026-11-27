# 系統架構說明 (Architecture)

本專案採用領域驅動設計 (Domain-Driven Design, DDD) 的簡化版本，旨在分離業務邏輯、資料存取與 UI 呈現。

本文件是分層與資料流契約的規範來源。不可逆的架構取捨理由見 [ADR](adr/)。

## 1. 分層結構 (Layers)

### 📂 Domain (領域層) - `src/domains/`

- **職責**: 定義業務實體、值對象與核心邏輯。
- **內容**: `types.ts`, `schemas.ts` (Zod), `mappers.ts`。
- **規則**: 不依賴外部框架或基礎設施；**絕對不依賴於 Application 或 Infrastructure 層。**

#### 目錄結構：預設平放

一個 domain 就是一個資料夾，檔案預設全部平放在該資料夾根層。只有同時符合下列兩條件才開子資料夾：

1. 該群組有 **≥2 個同角色檔案**（單一檔案的群組不開夾）；
2. 該 domain 已達 **≥10 個檔案**。

其他限制：

- 一個 domain 只選**一個**切分軸線：依子聚合（`auth/user`, `auth/whitelist`）或依角色（`calculators/`, `schemas/`），不可混用。
- 子資料夾名稱必須是群組的共同性質，不得使用 `logic`、`utils`、`helpers` 這類萬用字。
- 子資料夾一律以 `index.ts` barrel 對外，外部只 import 資料夾路徑，不深入檔名。
- 未達門檻的既有子資料夾應攤平；搬移時同步更新所有 import 指定符。

### 📂 Application (應用層) - `src/application/`

- **職責**: 協調領域對象與基礎設施，實現具體的使用案例 (Use Cases) 或複雜的業務服務 (Application Services)。
- **內容**:
  - `use_cases/`: 原子級業務操作，封裝單一職責邏輯（如：`createUserUseCase.ts`）。
  - `common/`: 跨 domain 重用的應用層邊界，如 `readGuard.ts`（讀取權限前門）與 `reorderCollectionInTransaction.ts`。
  - **Permission Services**: 專門處理複雜權限校驗的應用服務（如：`HouseholdPermissionService`）。
- **規則**: 負責事務控制與業務流程，不應包含核心業務邏輯（複雜校驗放 Domain Service）。**絕對保持純粹 (Pure TS/JS)，禁止 React Hooks 或任何 UI 框架依賴。**
- 應用層**可以**直接使用 `runTransaction` 與 Firestore query constraints：transaction 在 use case 內部建立並關閉，不跨越層邊界傳遞（見 [ADR-0043](adr/0043-accept-firestore-dependency-in-application.md)）。這讓 use case 能自行負責原子性，不需額外抽象層。

### Workflow Pattern (編排型 Workflow)

當一個流程需要協調多個 use case 時，建立 Workflow（如 `PreviewFinancialReportsWorkflow`、`MonthlyCloseWorkflowUseCase`）。Workflow 只負責組織：決定 use case 的呼叫順序、傳遞資料、組合結果；不得直接依賴 repository 或 domain 計算函數，需要資料或計算時一律呼叫負責的 use case。入口的權限把關（auth check）是例外，屬於 workflow 的本職。

### 📂 Infrastructure (基礎設施層) - `src/infra/`

- **職責**: 實作資料持久化 (Firestore)、外部 API 介接。
- **內容**: `repositories/`, `schemas/` (與資料庫對應的實體), `external/` (第三方 API client)。
- **規則**: 依賴 Domain（實作介面、使用領域模型）；不得 import UI（見 [ADR-0062](adr/0062-ui-tier-separation-and-surface-import-ban.md)）。Repository 只負責搬運資料，業務校驗放 Domain Service 或 Use Case。
- **工具**: 繼承 `src/infra/repositories/baseRepository.ts` 進行標準 CRUD。
- **Firebase 實例**: auth 的初始化與 gateway 在 `src/firebase.ts`，Firestore 實例在 `src/infra/firestore.ts`。兩者分開是為了讓啟動路徑（auth ＋ router ＋ shell）不必付 `firebase/firestore` 的下載成本；`src/ui/**` 仍然只看得到 gateway 與 repository，不直接 import 這兩者。
- **本機持久化**: Firestore 以 `persistentLocalCache` 開啟 IndexedDB 快取，並用多分頁管理器。回訪時已知資料立刻回放、離線仍可讀且寫入會排隊；代價是磁碟佔用與「畫面可能先是快取值」。快取只是傳輸層加速，不快照也不改寫任何不變量——快照與餘額的真相仍見 [data-structure.md](data-structure.md)。沒有 IndexedDB 的執行環境（測試用 DOM、部分 WebView）退回記憶體快取。
- **外部 API 介接**: 匯率由 `external/exchangeRateApiClient.ts` 直接從 CORS 開放的每日匯率源取得（免 key、免後端代理，詳見 [ADR-0049](adr/0049-cors-open-exchange-rate-source.md)）；跨匯率換算由 `GetLatestRateUseCase` 以 USD 基準匯率推導，並保留 1 小時記憶體快取。

### 📂 Presentation (呈現層) - `src/ui/`

- **職責**: UI 渲染與使用者互動。
- **規則**: Component 只調用 feature Hook (Controller)，不直接觸碰業務邏輯或資料庫。

層級、可觸碰清單、呼叫方向與跨層注入一律以
[`ui/ui-layer-architecture.md`](ui/ui-layer-architecture.md) 為準，本文件不重述。

### 📂 Shared - `src/shared/`

- **職責**: 基礎工具包（共用常數、base schema、平台安全的 id 產生器、單飛 TTL 快取、分批平行）。
- **規則**: 只能被其他層依賴，不能依賴任何其他層。

**依賴方向**：所有依賴指向內層——`UI -> Application -> Domain <- Infrastructure`。

## 2. 資料流 (Data Flow)

1. **使用者互動**: `UI Component` -> `Hook (Application Controller)`
2. **流程編排**: `Hook` -> `Use Case` (注入 AuthContext)
3. **處理邏輯**: `Use Case` -> `Domain Service` (核心校驗) -> `Repository` (資料存取)
4. **回傳**: 資料經由 `Mapper` 轉換為 Domain Object 或 DTO 後，由 Hook 更新 UI 狀態。

### 讀取的權限前門與量測

- 需要 AuthContext 的讀取型 use case 以 `withReadPermission(householdId, auth, run)` 開場（`src/application/common/readGuard.ts`）；免驗權限的內部 seam（如 `GetFinancialPeriodUseCase`）不強制。並行、錯誤優先序與 `skipPermissionCheck` 的理由寫在該檔註解，此處不重述。
- 並行的代價是未授權時查詢仍會發出（多一次讀取、結果丟棄）；外層已驗過的批次或巢狀呼叫以 `skipPermissionCheck: true` 跳過內層檢查，不要逐列重驗。
- 寫入型 use case 維持先驗後寫：交易內容在權限確定後才組。
- 互不相依的讀取一律並行，不得在迴圈裡 `await`；需要同一集合的多個月狀態時，優先一次查該集合（如 `ListFinancialPeriodsUseCase`）而不是逐月 `get`。筆數跟著使用者資料長的並行讀取走 `src/shared/batch.ts` 的 `mapInBatches`，不要整批 `Promise.all`。
- 量測走 `src/shared/perf.ts` 的 `measure()`，僅在 dev 生效（測試環境靜音）。`BaseRepository` 的 `get`／`list` 已內建，直接呼叫 `getDoc`／`getDocs` 的 repository 要自己包；權限檢查已由 guard 包好。要在瀏覽器看耗時分佈就開 dev server 看 console 的 `[perf]` 行。

### 讀取上限

- 清單型讀取一律帶 `limit`，數字集中在 `src/shared/readLimits.ts`，理由寫在該檔，不在呼叫端各自發明。
- 只有「畫面要看到全部、截斷只是少了尾巴」的讀取才設上限，且必須有確定性的排序，讓截斷落在最舊或最後的一端（報表用 `yearMonth` 遞減、帳戶用 `order` 遞增、沒有自然順序的集合用 `__name__`）。需要完整性的讀取不設上限：備份匯出／還原、跨整段歷史的報表計算，以及靠完整集合決定順序或去重的寫入路徑（`createPortfolioUseCase`、`saveAllocationTemplateUseCase`、`createCustomLedgerCodeUseCase`）。
- 上限只是擋住失控成長，不是分頁機制，所以截斷目前是無聲的：沒有提示也沒有頁碼，使用者不會知道自己少看到尾巴。真正需要翻頁時另走 cursor。

### 索引

- 查詢需要的複合索引只宣告在 `firestore.indexes.json`，不在程式碼裡加註解說明。單欄位查詢由 Firestore 的預設單欄位索引服務，不必宣告。
- 索引是有序的：完全相符的條件（等值、`array-contains`）可互換先後但必須在前，範圍與排序在後且必須有向。換序不算覆蓋。`__name__` 只有遞增方向可用，要由新到舊就得改排一個有值的欄位。
- emulator 不檢查索引，缺索引的查詢要等部署才失敗。`src/infra/firestoreIndexCoverage.test.ts` 因此把查詢形狀與索引檔對起來，兩個方向都驗：缺索引，以及宣告了卻沒人用的死索引（白吃寫入成本）。
- 該測試讀得懂同一句裡的條件陣列，也會跟著 `constraints.push(...)` 併回整個陣列；但條件若繞經別的函式或參數傳遞就會漏接，所以新查詢盡量在建立 constraint 的同一個函式裡看到全貌。

### 路由授權的決策重用

- 路由守衛在每次換頁都重跑 `AuthorizeRouteAccessUseCase`，決策結果按「身分 + household + 是否要求 household」為 key 短期重用（`src/application/auth/routeAccessCache.ts`）；key 組成、TTL 與 fail-closed 的取捨寫在該檔，此處不重述。White list 與成員讀取因此每個輸入只付一次。
- 會改變答案的寫入必須失效：白名單（`UpdateWhitelistUseCase`）、household 更新（`UpdateHouseholdUseCase`，成員增刪改都經過它），以及同樣會寫回 `members` 的備份還原（`ImportHouseholdBackupUseCase`）。
- 同一個短 TTL 機制也用在 household 文件本身（`GetHouseholdUseCase`）：它是權限檢查的底層讀取，所以權限判斷可能有數秒延遲，不即時。
- 只快取決策，不快取 session 狀態：有沒有登入仍是 infra 的觀測（ADR-0062）。

### 帳戶清單的讀取契約

- 批次讀取只驗一次 household 權限；同一文件的短期快取在寫入或備份還原後立即失效，較舊的異步回應不得覆蓋新狀態。
- 列表預設只載入啟用帳戶；切換至「含停用」後才載入完整清單。重排一律以完整清單重編全域順序；尚未載入時先補齊再套用拖曳結果，拖曳不受載入狀態阻擋。
- 帳戶清單只讀取各帳戶最新期別快照，並行讀取互不相依的帳戶資料。年度／月度報表另有期間明細查詢，不沿用此列表契約。
- Controller 只處理查詢與畫面狀態；新增帳戶時的尾端順序由 application 以完整帳戶集合決定。

## 3. 重要約定 (Conventions)

- **意圖導向 (Intent-based)**: 財務操作的分錄架構與 IntentType 分層見 [transaction-flow.md](transaction-flow.md)；取捨理由見 [ADR-0005](adr/0005-journal-entry-architecture.md) 與 [ADR-0010](adr/0010-intenttype-three-tier.md)。
- **Project 與會計科目**: 兩者的責任邊界與餘額計算見 [data-structure.md](data-structure.md)；取捨理由見 [ADR-0006](adr/0006-project-legercode-separation.md)。
- **快照與快取 (Snapshots)**: ProjectSnapshot 與報表快照的來源及產生時機見 [data-structure.md](data-structure.md)；取捨理由見 [ADR-0012](adr/0012-project-snapshot-cache.md) 與 [ADR-0018](adr/0018-manual-financial-report-generation.md)。
