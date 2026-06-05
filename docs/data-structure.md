# One-Piece Data Structure

## Firestore Collection Structure

```
firestore
  ├─ access_control                  # 白名單控制
  │    └─ emails: string[]

  ├─ users                           # 使用者資料
  │    ├─ uid: string
  │    ├─ email: string
  │    ├─ displayName: string
  │    ├─ photoURL: string
  │    ├─ role: "owner" | "admin" | "member" | "guest"
  │    └─ householdId: string        # 最後選擇的家庭

  └─ households/{householdId}        # 家庭（根文檔）
       ├─ name: string
      ├─ memberUids: string[]        # 成員 uid 索引（供 array-contains 查詢）
       ├─ createdAt: Timestamp
       └─ members: array
       │    ├─ uid: string
       │    ├─ name: string
       │    └─ role: "owner" | "admin" | "member" | "guest"

       ├─ projects/{projectId}       # 專案帳戶 (Management Accounting)
       │    ├─ name: string
       │    ├─ color: string
       │    ├─ icon: string
       │    ├─ description: string
       │    ├─ isPersonal: boolean    # 零用錢標記
       │    ├─ isActive: boolean
       │    ├─ createdAt: Timestamp
       │    └─ updatedAt: Timestamp
       │
       │    └─ snapshots/{snapshotId}  # Subcollection: 每月預算快照
       │         ├─ year: number
       │         ├─ month: number
       │         ├─ openingBalance: number
       │         ├─ income: number
       │         ├─ expense: number
       │         ├─ closingBalance: number
       │         └─ createdAt: Timestamp

       ├─ accounts/{accountId}           # 實體帳戶 (Bank/Securities Accounts)
       │    ├─ name: string
       │    ├─ category: "bank" | "securities" | "cash"
       │    ├─ currency: string
       │    ├─ order: number
     │    ├─ isActive: boolean         # false = 停用（仍保留歷史快照）
       │    │
       │    └─ snapshots/{snapshotId}    # Subcollection: 每月餘額與持倉
       │         ├─ year: number
       │         ├─ month: number
       │         ├─ amount: number       # 總餘額 (折合本位幣)
       │         ├─ originalAmount: number # 原始幣別金額
       │         ├─ exchangeRate: number
       │         ├─ holdings: array      # 證券持倉詳情 (symbol, quantity, cost, etc.)
       │         └─ createdAt: Timestamp

     # Account 停用規則：
     # - 停用帳戶不再出現在記帳表單/月底結算輸入列表
     # - snapshots 子集合為歷史記錄，停用不影響既有資料

       ├─ portfolios/{portfolioId}       # 投資組合 (Investment Tracking)
       │    ├─ name: string
       │    ├─ isActive: boolean
       │    │
       │    └─ snapshots/{snapshotId}    # Subcollection: 每月持倉快照
       │         ├─ year: number
       │         ├─ month: number
       │         ├─ holdings: array
       │         └─ totalValue: number

      ├─ retirement_plans/{planId}      # 退休規劃
      │    ├─ name: string
      │    ├─ isActive: boolean          # 同一 household 僅允許一筆 active=true
      │    ├─ events: array
      │    ├─ settings: object
      │    │
      │    ├─ incomeStreams/{incomeStreamId}   # 由交易分錄推導的收入流
      │         ├─ name: string
      │         ├─ importedFrom: "manual" | "transactionEntries"
      │         ├─ incomeCategory: string       # e.g. "income:salary:charles"
      │         ├─ type: "salary" | "bonus" | "pension" | "rent" | "other"
      │         ├─ incomeCalculationMode: "FIXED" | "IMPORTED" | "DERIVED"
      │         │
      │         │  # --- 年份連動設定 ---
      │         ├─ startYearMode: "MANUAL" | "LINKED_TO_RETIREMENT"
      │         ├─ endYearMode: "MANUAL" | "LINKED_TO_RETIREMENT"
      │         ├─ lifelong: boolean                 # true = 忽略 endYear，計算至模型終止年（pension 用）
      │         │
      │         │  # --- 金額設定 ---
      │         ├─ baseAmount: number                # 年化金額
      │         ├─ growthRate: number                # 年成長率（%），pension 通常設 0 或通膨率
      │         ├─ startYear: number                 # startYearMode=MANUAL 時有效
      │         ├─ endYear?: number                  # endYearMode=MANUAL 且 lifelong=false 時有效
      │         │
      │         │  # --- DERIVED 模式專用 ---
      │         ├─ derivedFrom?: object              # incomeCalculationMode=DERIVED 時必填
      │         │    ├─ baseIncomeId: string         # 參考的基礎收入 id
      │         │    └─ multiplier: number           # 倍數，e.g. 1.67 代表 2 個月獎金
      │         │
      │         │
      │         ├─ calculatedFrom: object
      │         │    ├─ ledgerCode: string      # e.g. "income:salary:charles"
      │         │    ├─ sampleYear: number      # 表示資料來自哪個年度
      │         │    ├─ totalAmount: number
      │         │    ├─ monthlyAverage: number
      │         │    ├─ sampleCount: number
      │         │    └─ importedAt: string      # ISO datetime
      │         ├─ autoUpdate: boolean           # true = 允許系統偵測 sampleYear 過期並提示更新
      │         └─ note?: string       │
       │    └─ expenseCategories/{expenseCategoryId}  # 退休支出類別（含債務匯入）
       │         ├─ name: string
       │         ├─ type: "general" | "debt_payment"
       │         ├─ sourceDebtAccountId?: string
       │         ├─ includesPrincipal: boolean
       │         ├─ interestOnly: boolean
       │         ├─ calculationMode: "FIXED" | "SALARY_PERCENTAGE"
      │         ├─ salaryPercentageRetirementMode?: "MANUAL_FALLBACK" | "INFLATION_BASED"
       │         ├─ baseAmount: number
       │         ├─ growthRate: number
       │         ├─ retirementMultiplier: number
       │         ├─ startYear: number
       │         ├─ endYear?: number | null
       │         ├─ calculatedFrom?: object
       │         │    ├─ debtAccountId?: string
       │         │    ├─ sampleStartYearMonth?: string
       │         │    ├─ sampleEndYearMonth?: string
       │         │    ├─ totalPaid?: number
       │         │    ├─ interestPaid?: number
       │         │    ├─ sampleCount?: number
       │         │    └─ importedAt?: string
       │         └─ note?: string
       ├─ allocations/{allocationId}     # 專案資金分配
       │    ├─ sourceTransactionId: string
       │    ├─ direction: "INCOME" | "EXPENSE"
       │    ├─ yearMonth: string         # YYYY-MM
       │    ├─ totalAmount: number
       │    ├─ items: array
       │    │    ├─ projectId: string
       │    │    ├─ percentage: number
       │    │    └─ amount: number
       │    └─ projectIds: string[]      # 索引最佳化

     ├─ allocationTemplates/{templateId} # 收入分配模板（UI 輔助）
     │    ├─ name: string
     │    ├─ ledgerCode: string          # e.g. "income:salary:charles"
     │    ├─ isDefault: boolean          # fallback 模板
     │    ├─ items: array
     │    │    ├─ projectId: string
     │    │    └─ percentage: number
     │    ├─ createdBy: string
     │    └─ updatedAt: Timestamp
     │
     │    # 規則：
     │    # - 同一 household 中，一個 ledgerCode 僅對應一個 template
     │    # - 可設定一筆 isDefault = true 作為無匹配 ledgerCode 的 fallback
     │    # - template 僅供 UI 預填，修改 template 不會回寫既有 allocations

       ├─ transactions/{transactionId}   # 原始交易記錄 (Source Documents)
       │    ├─ date: Timestamp
       │    ├─ amount: number
       │    ├─ description: string
       │    ├─ intentType: string
       │    ├─ entries: array (JournalEntryLine) # 包含 ledgerCode 與 accountId 的分錄
       │    ├─ projectId?: string
       │    ├─ createdBy: string
       │    ├─ createdAt: Timestamp
       │    ├─ ledgerCodes: string[]      # 索引最佳化 (用於報表查詢)

       ├─ reports/{reportId}             # 財務報表快照
            ├─ year: number
            ├─ month: number
            ├─ type: "income_statement" | "balance_sheet" | "cash_flow"
            ├─ data: object
            └─ generatedAt: Timestamp

       ├─ ledgerCodes/{code}             # 自訂會計科目（isCustom: true）
       │    ├─ code: string              # e.g. "liability:mortgage"
       │    ├─ label: string             # e.g. "房貸"
       │    ├─ type: LedgerType
       │    ├─ isCustom: true
       │    ├─ createdBy: string
       │    └─ createdAt: Timestamp

       └─ debtAccounts/{debtAccountId}  # 債務帳戶
            ├─ name: string             # e.g. 玉山房貸
            ├─ type: "mortgage" | "car_loan" | "personal_loan"
            ├─ repaymentType: "equal_payment"
            ├─ originalAmount: number
            ├─ currentBalance: number
            ├─ interestRate: number     # 年利率 %
            ├─ startDate: Timestamp
            ├─ endDate: Timestamp
            ├─ monthlyPayment: number
            ├─ linkedLedgerCode: string # 由 type 自動對應，e.g. "liability:mortgage"
            ├─ linkedProjectId?: string | null
            ├─ note?: string
            ├─ isActive: boolean        # false = 已結清/停用
            └─ closedAt?: Timestamp | null # 結清日期，isActive=false 時寫入
```

## 設計注意事項

### 1. **Management vs Financial Accounting**

- **Management Accounting (專案)**: 用於預算管理、目標追蹤（`projects/`）。
- **Financial Accounting (複式簿記)**: 記帳邏輯以 `transactions` 中的 `entries` 為主。
- **Ledger Codes**: 會計科目不再是獨立的文檔集合，而是具備層級關係的字串標記（如 `asset:cash:bank_a`）。

### 2. **Source Document Pattern**

- `transactions` 集合儲存使用者的原始輸入（意圖）以及產生的會計分錄（entries）。

### 3. **Asset & Valuation**

- **資產主要依據 `accounts/snapshots` 取得**: 實體帳戶的金額與持倉即為資產最準確的來源。
- **移除舊有無效集合**: 移除 `asset` (資產)、`market_price` (市場價格)、`bankstatement` (對帳單) 以及獨立的 `journalentry`。

### 4. **Retirement Planning**

- 退休規劃資料獨立存儲於 `retirement_plans`。
- 收入流 (`incomeStreams`) 來源以 `transactions.entries` 中 `ledgerCode` 前綴為 `income:` 的分錄為準。
- 收入匯入以**完整年度**為單位，固定抓上一個完整年度（`lastFullYear = 當前年份 - 1`），依 `ledgerCode` 分組加總並年化，結果存入 `calculatedFrom.sampleYear`。
- 過期偵測：進入退休規劃頁時，系統檢查所有 `autoUpdate=true` 且 `calculatedFrom.sampleYear < lastFullYear` 的收入流，若有過期項目則顯示 banner 提示使用者批次更新（選項B：詢問確認後執行）。
- 薪資類收入（salary/bonus）通常設 `endYearMode=LINKED_TO_RETIREMENT`，退休年份調整時自動同步結束年。
- 退休金收入（pension）通常設 `startYearMode=MANUAL`（領取起始年可能晚於退休年），`lifelong=true` 表示終身領取，計算至模型終止年。
- 派生收入（DERIVED）從基礎收入乘以倍數計算，不單獨設成長率，跟隨基礎收入年化成長。
- 債務還款匯入來源為 active `debtAccounts` 搭配最近 12 個月 `snapshots`；產物寫入 `expenseCategories`。
- `debt_payment` 支出可標註是否包含本金 (`includesPrincipal`) 或僅計利息 (`interestOnly`)。
- `events` 支援分段設定 `phases[]`（每段可使用 `FIXED` 或 `SALARY_PERCENTAGE`），可用於教育、醫療等人生階段型支出/收入。
- 舊版單次事件欄位（`year`/`amount`）仍可讀取，系統會視為單段 `FIXED` phase 以維持相容性。
- 複製 retirement plan 會建立一筆完整副本（含 incomes / expenses / events / assumptions），並預設 `isActive=false`。
- 當任一 plan 被建立或更新為 `isActive=true` 時，系統會自動將同一 household 其他 plans 的 `isActive` 設為 `false`。
