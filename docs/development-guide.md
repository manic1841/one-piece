# 開發指南 (Development Guide)

本文件說明在 One-Piece 專案中新增功能或修改邏輯的標準流程。

## 1. 新增功能的標準流程

當你想要新增一個功能（例如：處理資產買賣、自動對帳）時，請遵循以下步驟：

### 第一步：定義領域模型 (Domain Layer)

- 在 `src/domains/{domain_name}/` 建立 `schemas.ts` 與 `types.ts`。
- **嚴禁**直接在 `src/infra/schemas/` 定義業務類型。

### 第二步：實作存取層 (Infrastructure Layer)

- 在 `src/infra/repositories/` 建立 Repository。
- 繼承 `BaseRepository`，並引用 **Domain Layer** 定義的 Schema。

### 第三步：建立原子使用案例 (Application Use Cases)

- 在 `src/application/{domain_name}/use_cases/` 建立單一職責的操作。
- 複雜的校驗邏輯應放進 **Domain Service**。

### 第四步：建立應用控制器 (Application Hook)

- 在 `src/application/{domain_name}/hooks/` 建立 Hook。
- Hook 職責：管理 UI 狀態、注入 `AuthContext`、呼叫 Use Case。

### 第五步：建立 UI Form ViewModel 與 Mapper (UI Layer)

- 在 `src/ui/features/{feature_name}/viewmodels/` 建立表單 VM Schema（Zod）。
- 定義 `mapXxxVMToDomain`，集中處理字串/日期/數值轉換。
- 規則：Component 與 Hook 不得直接組裝 Domain payload。

### 第六步：實作 UI 組件

- 呼叫 Hook 並渲染畫面。
- 提交路徑必須經過 `Schema.parse -> Mapper -> UseCase`。

## 2. 代碼風格要求

- **不要直接呼叫 Repository**: 除非是極其簡單的讀取，否則應透過 Use Case 排列組合業務邏輯。
- **編排規則**: 不要讓 Hook 呼叫超過一個以上的 Use Case。
- **嚴格型別**: 絕對禁止使用 `any`。所有資料流動應有清晰的介面定義。
- **單一職責**: 一個 Use Case 文件只做一件事（例如：`recordTransactionUseCase.ts` 只負責記錄交易）。
- **表單一致性**: 表單資料必須先映射到 ViewModel，再由 mapper 轉換成 domain 型別。
- **驗證一致性**: 所有新表單路徑統一採用 Zod schema，禁止分散式手寫驗證。

## 3. 維護建議

- **定期更新文件**: 如果修改了資料結構，務必同步更新 `docs/data-structure.md`。
- **保持 `docs/` 的準確性**: 文件是維護大型專案的唯一救星。
- **效能考量**: 避免在前端進行超大規模的資料處理與循環引用。
