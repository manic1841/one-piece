# 系統架構說明 (Architecture)

本專案採用領域驅動設計 (Domain-Driven Design, DDD) 的簡化版本，旨在分離業務邏輯、資料存取與 UI 呈現。

本文件是分層與資料流契約的規範來源。不可逆的架構取捨理由見 [ADR](adr/)。

## 1. 分層結構 (Layers)

### 📂 Domain (領域層) - `src/domains/`

- **職責**: 定義業務實體、值對象與核心邏輯。
- **內容**: `types.ts`, `schemas.ts` (Zod), `mappers.ts`。
- **規則**: 不依賴外部框架或基礎設施；**絕對不依賴於 Application 或 Infrastructure 層。**

### 📂 Application (應用層) - `src/application/`

- **職責**: 協調領域對象與基礎設施，實現具體的使用案例 (Use Cases) 或複雜的業務服務 (Application Services)。
- **內容**:
  - `use_cases/`: 原子級業務操作，封裝單一職責邏輯（如：`createUserUseCase.ts`）。
  - **Permission Services**: 專門處理複雜權限校驗的應用服務（如：`HouseholdPermissionService`）。
- **規則**: 負責事務控制與業務流程，不應包含核心業務邏輯（複雜校驗放 Domain Service）。**絕對保持純粹 (Pure TS/JS)，禁止 React Hooks 或任何 UI 框架依賴。**
- 應用層**可以**直接使用 `runTransaction` 與 Firestore query constraints：transaction 在 use case 內部建立並關閉，不跨越層邊界傳遞（見 [ADR-0043](adr/0043-accept-firestore-dependency-in-application.md)）。這讓 use case 能自行負責原子性，不需額外抽象層。

### Workflow Pattern (編排型 Workflow)

當一個流程需要協調多個 use case 時，建立 Workflow（如 `PreviewFinancialReportsWorkflow`、`MonthlyCloseWorkflowUseCase`）。Workflow 只負責組織：決定 use case 的呼叫順序、傳遞資料、組合結果；不得直接依賴 repository 或 domain 計算函數，需要資料或計算時一律呼叫負責的 use case。入口的權限把關（auth check）是例外，屬於 workflow 的本職。

### 📂 Infrastructure (基礎設施層) - `src/infra/`

- **職責**: 實作資料持久化 (Firestore)、外部 API 介接。
- **內容**: `repositories/`, `schemas/` (與資料庫對應的實體), `external/` (第三方 API client)。
- **規則**: 依賴 Domain（實作介面、使用領域模型）；不得 import UI（見 [ADR-0062](adr/0062-ui-tier-separation-and-surface-import-ban.md)）。Repository 只負責搬運資料，業務校驗放 Domain Service 或 Use Case。
- **工具**: 繼承 `src/repositories/baseRepository.ts` 進行標準 CRUD。
- **外部 API 介接**: 匯率由 `external/exchangeRateApiClient.ts` 直接從 CORS 開放的每日匯率源取得（免 key、免後端代理，詳見 [ADR-0049](adr/0049-cors-open-exchange-rate-source.md)）；跨匯率換算由 `GetLatestRateUseCase` 以 USD 基準匯率推導，並保留 1 小時記憶體快取。

### 📂 Presentation (呈現層) - `src/ui/`

- **職責**: UI 渲染與使用者互動。
- **內容**:
  - `features/[feature-name]/hooks/`: **控制器 (Controller)**。React 進入點，負責銜接 UI 與核心邏輯。
  - `contexts/`: UI 自有的 React context 與 provider（Controller 範圍，例如認證狀態）。
  - `components/`: React 組件。
- **規則**: Component 只調用 feature Hook (Controller)，不直接觸碰業務邏輯或資料庫。
  層級、可觸碰清單與呼叫方向以 [`ui/ui-layer-architecture.md`](ui/ui-layer-architecture.md) 為準；
  UI 不得 import `@/domains`、`@/application`、`@/infra`，也不得 import `firebase/firestore`
  （跨層實作由 `src/App.tsx` 這個 composition root 注入）。

### 📂 Shared - `src/shared/`

- **職責**: 基礎工具包（共用常數、base schema）。
- **規則**: 只能被其他層依賴，不能依賴任何其他層。

**依賴方向**：所有依賴指向內層——`UI -> Application -> Domain <- Infrastructure`。

## 2. 資料流 (Data Flow)

1. **使用者互動**: `UI Component` -> `Hook (Application Controller)`
2. **流程編排**: `Hook` -> `Use Case` (注入 AuthContext)
3. **處理邏輯**: `Use Case` -> `Domain Service` (核心校驗) -> `Repository` (資料存取)
4. **回傳**: 資料經由 `Mapper` 轉換為 Domain Object 或 DTO 後，由 Hook 更新 UI 狀態。

## 3. 重要約定 (Conventions)

- **意圖導向 (Intent-based)**: 財務操作的分錄架構與 IntentType 分層見 [transaction-flow.md](transaction-flow.md)；取捨理由見 [ADR-0005](adr/0005-journal-entry-architecture.md) 與 [ADR-0010](adr/0010-intenttype-three-tier.md)。
- **Project 與會計科目**: 兩者的責任邊界與餘額計算見 [data-structure.md](data-structure.md)；取捨理由見 [ADR-0006](adr/0006-project-legercode-separation.md)。
- **快照與快取 (Snapshots)**: ProjectSnapshot 與報表快照的來源及產生時機見 [data-structure.md](data-structure.md)；取捨理由見 [ADR-0012](adr/0012-project-snapshot-cache.md) 與 [ADR-0018](adr/0018-manual-financial-report-generation.md)。
