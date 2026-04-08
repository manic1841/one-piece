# 系統架構說明 (Architecture)

本專案採用領域驅動設計 (Domain-Driven Design, DDD) 的簡化版本，旨在分離業務邏輯、資料存取與 UI 呈現。

## 1. 分層結構 (Layers)

### 📂 Domain (領域層) - `src/domains/`

- **職責**: 定義業務實體、值對象與核心邏輯。
- **內容**: `types.ts`, `schemas.ts` (Zod), `mappers.ts`。
- **規則**: 不依賴外部框架或基礎設施。

### 📂 Application (應用層) - `src/application/`

- **職責**: 協調領域對象與基礎設施，實現具體的使用案例 (Use Cases) 或複雜的業務服務 (Application Services)。
- **內容**:
  - `use_cases/`: 原子級業務操作，封裝單一職責邏輯（如：`createUserUseCase.ts`）。
  - `hooks/`: **應用控制器 (Application Controller)**。React 進入點，負責：
    - 管理 `loading`、`error` 狀態。
    - 注入 `AuthContext`（使用者權限上下文）。
    - 處理 UI 副作用。
  - **Permission Services**: 專門處理複雜權限校驗的應用服務（如：`HouseholdPermissionService`）。
- **規則**: 這裡負責事務控制與業務流程。**絕對禁止在此層級使用 React Hooks 或依賴任何 UI 框架。**

### 📂 Infrastructure (基礎設施層) - `src/infra/`

- **職責**: 實作資料持久化 (Firestore)、外部 API 介接。
- **內容**: `repositories/`, `schemas/` (與資料庫對應的實體)。
- **工具**: 繼承 `src/repositories/baseRepository.ts` 進行標準 CRUD。

### 📂 Presentation (呈現層) - `src/ui/features/`, `src/ui/components/`

- **職責**: UI 渲染與使用者互動。
- **內容**: 
  - `features/[feature-name]/hooks/`: **應用控制器 (Application Controller)**。React 進入點，負責銜接 UI 與核心邏輯。
  - `components/`: React 組件。
- **規則**: Component 只調用 Hook (Application Controller)，不直接觸碰業務邏輯或資料庫。

## 2. 資料流 (Data Flow)

1. **使用者互動**: `UI Component` -> `Hook (Application Controller)`
2. **流程編排**: `Hook` -> `Use Case` (注入 AuthContext)
3. **處理邏輯**: `Use Case` -> `Domain Service` (核心校驗) -> `Repository` (資料存取)
4. **回傳**: 資料經由 `Mapper` 轉換為 Domain Object 或 DTO 後，由 Hook 更新 UI 狀態。

## 3. 重要約定 (Conventions)

- **意圖導向 (Intent-based)**: 財務操作應盡量描述使用者的「意圖」（如：購物、薪資發放），由系統將其轉換為底層會計分錄。
- **快照與快取 (Snapshots)**: 為優化讀取效能，歷史報表資料應使用每月 `snapshots`，而非每次重新計算所有原始交易。
