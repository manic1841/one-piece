# One-Piece DDD Design Principles

Based on modern DDD practices and adjusted for our project's scale, these principles define the boundaries and dependency rules for our architecture.

## 1. 層級職責 (Layer Responsibilities)

### 📂 Domain Layer (領域層) - `src/domains/`
- **Core Entities & Aggregates**: 業務資料的單一事實來源。
- **Domain Services**: 處理跨多個 Entity 的純業務邏輯（不涉及外部 IO）。
- **Contracts**: 定義 Repository 介面（雖然在當前專案中簡化為直接使用 `infra` 實作，但邏輯上屬於外部依賴）。
- **Rules**: 絕對不依賴於 Application 或 Infrastructure 層。

### 📂 Application Layer (應用層) - `src/application/`
- **Use Cases**: Atomic operations (`src/application/[domain]/use_cases/`).
- **Application Services**: Complex business orchestration.
- **Orchestration**: Responsible for:
    - **Transaction control** (Passing Firestore `Transaction` objects)
    - **Cross-domain orchestration**
- **Rules**: 不應包含核心業務邏輯。**絕對保持純粹 (Pure TS/JS)，不依賴於任何 UI 框架。**

### Workflow Pattern (編排型 Workflow)

當一個流程需要協調多個 use case 時，可建立 Workflow（如 `previewFinancialReportsWorkflow`）。
Workflow 與 use case 的分工如下：

- **Workflow 只負責組織**：決定 use case 的呼叫順序、傳遞資料、組合結果。
- **Workflow 不得直接依賴**：repository、domain 計算函數、firebase SDK。
  需要資料讀取或領域計算時，必須呼叫負責的 use case。
- **Use case 擁有邏輯**：資料讀取（如 `fetchReportDataUseCase`）、
  領域計算（呼叫 domain pure function）、權限檢查（如 persistence state 檢查）
  都屬於 use case 的職責。
- Workflow 可以執行入口的權限把關（auth check），因為它是該流程的入口。

### 📂 Infrastructure Layer (基礎層) - `src/infra/`
- **Concrete Implementations**: 具體的資料庫操作 (Firestore Repositories)、外接 API。
- **Persistence Schemas**: 與資料庫存儲結構對應的 Schema。
- **Rules**: 依賴 Domain (為了實作介面/使用領域模型)。

---

## 2. React 中各層級對應 (React Layer Mapping)

在 React 專案中，傳統 DDD 層級與前端開發習慣的對應關係如下：

| DDD 層級                         | React 對應                              | 說明                                              |
| ------------------------------ | ------------------------------------- | ----------------------------------------------- |
| Controller (Adapter)           | **UI Controller Hook**                | 負責注入 Context、管理 Loading/Error、呼叫 Use Case  |
| Use Case                       | Atomic Use Case Module/Class          | 單一職責的業務編排 (Pure TS)                       |
| Domain Service                 | Pure JS / TS function / class         | 核心業務邏輯，不依賴 React 或外部狀態                 |
| Repository / Infrastructure    | BaseRepository / API Client           | 外部資源存取                                      |

### 典型 React 調用鏈 (Typical Flow)
`Surface (Component/Page)` -> `Controller Hook` -> `Use Case` -> `Domain Service` / `Repository`

層級、可觸碰清單與呼叫方向以 [`ui/ui-layer-architecture.md`](ui/ui-layer-architecture.md) 為準；
本節只做 DDD 與 React 的術語對應。

---

## 3. 程式碼範例 (Code Examples)

### Application Hook (Controller)
```typescript
export function useUpdateUser() {
  const [loading, setLoading] = useState(false);
  const authContext = useAuthIdentity(); // 注入權限上下文（身分投影）

  const execute = async (uid: string, data: any) => {
    setLoading(true);
    try {
      // 調用 Use Case 並傳入 Context
      await updateUserUseCase.execute({ uid, data, auth: authContext });
    } finally {
      setLoading(false);
    }
  };
  return { execute, loading };
}
```

### Use Case (Atomic Orchestrator)
```typescript
export class UpdateUserUseCase {
  async execute(request: { uid: string, data: any, auth: AuthContext }) {
    const { uid, data, auth } = request;
    // 1. 權限校驗 (使用 Permission Service)
    await userPermissionService.assertUpdate(auth, uid);
    
    // 2. 業務邏輯與存儲
    await userRepository.update(uid, data);
  }
}
```

---

## 4. 事務與原子性 (Transaction / UoW)

前端雖然沒有 SQL 級別的 Transaction，但應在 Hook 內部實作「原子性」操作或 Rollback 模式。

```typescript
async function executeCreation() {
  // 1. Prepare (State Buffer)
  // 2. Validate (Domain Service)
  // 3. Execute (Repository API)
  // 4. Commit (Update React State / Store)
  // 5. Rollback (If failed, discard changes / notify user)
}
```

---

## 5. 依賴方向 (Dependency Direction)

**規則：所有依賴必須指向「內層」（領域層）。**

`UI (Presentation + Hooks) -> Application (Use Cases) -> Domain <- Infrastructure`

- **Domain** 是核心，純粹的 JS/TS。
- **UI Controller Hooks** orchestrate Domain & Application. Surface 不得觸碰 domain/application（連型別也不行）。
- **Infrastructure** Implements Domain interfaces；且不得 import UI（見 ADR-0062）。
- **Shared** 只能被依賴，不能依賴其他層層（除了基礎工具包）。

---

## 6. 實作指南 (Implementation Guidelines)

### 當你需要新增一個功能時：
1. **先在 Domain 定義資料結構與核心邏輯**。
2. **在 Application 設定 Use Case 或 Service**：
    - 在這裡處理「驗證權限」（通常呼叫 `householdApplicationService.assertWritePermission`）。
    - 在這裡決定「存儲流程」。
3. **在 Infrastructure 實作 Repository** (若尚未存在)。
4. **最後在 UI Hook 調用 Application Layer**。

### 避免的陷阱 (Anti-patterns)：
- **不要讓 Hook 直接調用 Repository**：這會導致權限校驗遺漏與業務邏輯洩漏（既有違規見實作 issue 的盤點）。
- **不要在 Application Service 寫複雜計算**：應封裝進 Domain Service 或 Entity 方法中。
- **不要在 Repository 寫業務校驗**：Repository 只負責搬運資料。

---

## 7. Linus Torvalds 的提醒
> "Good code doesn't need comments, it needs a structure so obvious that you feel like an idiot for not writing it that way initially."
- 保持層級簡約。
- 如果一個 Use Case 只有 3 行 code 且沒有複雜編排，直接在 Application Service 寫一個 method 即可，不要過度設計。
