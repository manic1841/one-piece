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

### 金融 source 與 denormalized cache

Transaction 與 journal entries 是唯一權威來源；`DebtAccount.currentBalance`、
`DebtSnapshot` 等 denormalized cache 只是加速讀取的派生資料。凡由同一 financial
command 產生的 source record 與 cache，必須在同一個 Firestore transaction 內更新；
任何單獨更新 cache 的路徑都不符合本政策。Transaction abort 或 optimistic-concurrency
conflict 時，不得留下部分 source、snapshot、balance 或成功的 operation result。

### Command 分類

每個 command 必須屬於以下其中一類，並遵守該類別的重試規則：

1. **Idempotent command**：同一請求執行多次，結果與執行一次相同，重試直接重新執行。
   只適用於「設定相同 desired state」的操作（例如 reorder），不適用於新增一筆事件。
2. **Deterministically retry-safe command**：業務資源有穩定且可重建的 identity。
   重試會讀取該 identity；payload 相同回傳既有結果，payload 不同則拒絕，不得覆蓋原資料。
3. **Atomic desired-state command**：更新多個代表同一 desired state 的 durable records。
   所有必要的讀取與寫入必須在同一個 Firestore transaction 內完成，失敗時一起回滾。
4. **Explicitly non-repeatable command**：每次成功執行都會新增不可重複的 source event，
   或產生不可逆的財務效果。必須要求 caller 產生的 idempotency key，並以 operation
   record 將 key、payload 與結果綁在同一個原子操作中。`DEBT_PAYMENT` 屬於此類。

Command 不得只因使用 deterministic document ID 就宣稱 retry-safe；例如同月
DebtSnapshot 的 upsert 是累加操作，仍需保護其對應的 source Transaction。

### 三種 identity 的界線

- **Idempotency key**：caller 為「一次使用者意圖」產生的 opaque token。相同意圖的每次
  retry 必須重用同一 key；新的使用者意圖必須產生新的 key。它在 household 範圍內與
  operation type 組合使用，不是時間戳、email、auth token，也不能每次 attempt 重產。
- **Firestore document ID**：資料庫用來定位一份文件的 persistence identity。它不代表
  command 已成功，也不等於 caller 的 idempotency key。
- **Deterministic snapshot/report identity**：由 household、對象、期間與型別等業務欄位
  穩定推導的資源 identity（例如 debt account 的 `YYYY-MM` snapshot、報表的期間與類型）。
  它用於查找或取代同一觀察點，不能取代 financial command 的 idempotency key。

### Household operation record

需要 key 的 command 在該 command 的 household 下維護
`households/{householdId}/operations/{operationRecordId}`；`operationRecordId` 由
operation type 與 idempotency key 穩定、安全地映射。欄位至少包含：

```text
operationType: string
idempotencyKey: string
fingerprintVersion: number
payloadFingerprint: string
status: "IN_PROGRESS" | "SUCCEEDED" | "FAILED"
resultReference: object | null
createdAt: Timestamp
updatedAt: Timestamp
completedAt?: Timestamp | null
createdByUid: string
```

`resultReference` 只保存足以重新取得結果的 resource references，不寫入完整 auth
context、token、email 或不必要的個資；時間欄位由 server timestamp 產生。

同一 household、operation type 與 key 的行為固定如下：

- 相同 payload fingerprint 且已有 `SUCCEEDED`：回傳原本的 result reference，不新增
  source record、不重寫 snapshot，也不再次改變 balance。
- 不同 payload fingerprint：回傳穩定的 `IDEMPOTENCY_CONFLICT` application error。
- `IN_PROGRESS`：由 Firestore transaction contention/重試處理；呼叫端不得另建 operation。
- `FAILED` 或 command 在 validation、permission、missing resource 階段失敗：不得留下
  `SUCCEEDED` record；對 atomic financial command，失敗的 operation record 與 source
  records 必須同時回滾。

`DEBT_PAYMENT` 使用 operation type `DEBT_PAYMENT`，要求非空且由 caller 產生的
idempotency key。其 fingerprint version 1 只包含會影響 operation 的輸入：

```text
operationType
fingerprintVersion
debtAccountId
totalPayment
canonicalPaymentDate
normalizedDescription
explicitProjectId
```

`canonicalPaymentDate` 是正規化後的付款日；`normalizedDescription` 是去除僅影響呈現的
多餘空白後的說明；`explicitProjectId` 只記錄 caller 明確提供的 project identity，不把
從 DebtAccount fallback 的 project 寫入 fingerprint。Generated document IDs、execution
timestamps、authentication context、email 與 stored balance 都排除在 fingerprint 外。
版本升級時建立新的 fingerprint version，不能靜默改變既有 key 的解讀。

### Reorder 契約（atomic desired-state 的實例）

Account、Project、Portfolio 的 reorder command 皆為 all-or-nothing：同一 household 的
整份排序在一次 Firestore transaction 內提交，任一驗證或寫入失敗時全部回滾。不做
partial update，也不引入 idempotency key——重試同一 desired state 是安全的。

- `orders` 為空陣列時直接成功返回。
- 重複的目標 id 回傳 `INVALID_ORDERS`。
- 不存在的目標文件在 transaction 內 `tx.get` 後顯式拒絕 `TARGET_NOT_FOUND`，不靜默略過。
- 其他 transaction 失敗包裝為 `TRANSACTION_FAILED`。
- 兩個成員同時 reorder 會產生 transaction 衝突，後提交者重試後收斂為其中一方的完整排序，
  不需要額外的 contention token。
- 不做動態寫入數計算；單一 household 的數量遠低於 Firestore transaction 的 500 筆上限，
  若未來接近上限再依 retirement plan 的模式補驗證。

取捨理由見 [ADR-0038](adr/0038-command-atomicity-and-retry-policy.md) 與
[ADR-0041](adr/0041-reorder-atomic-contract.md)。

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
