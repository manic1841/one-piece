# One-Piece Data Structure

## Firestore Collection Structure

```
firestore
  ├─ access_control                  # 白名單控制
  │    ├─ whitelistEmails: string[]
  │    ├─ updatedAt: Timestamp
  │    └─ updatedBy: string

  ├─ users                           # 使用者資料
  │    ├─ uid: string
  │    ├─ email: string
  │    ├─ displayName: string
  │    ├─ photoURL: string
  │    ├─ role: "owner" | "admin" | "member" | "guest"
  │    └─ householdId: string        # 最後選擇的家庭

  └─ households/{householdId}        # 家庭（根文檔）
       ├─ name: string
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
       │    │
       │    └─ snapshots/{snapshotId}    # Subcollection: 每月餘額與持倉
       │         ├─ year: number
       │         ├─ month: number
       │         ├─ amount: number       # 總餘額 (折合本位幣)
       │         ├─ originalAmount: number # 原始幣別金額
       │         ├─ exchangeRate: number
       │         ├─ holdings: array      # 證券持倉詳情 (symbol, quantity, cost, etc.)
       │         └─ createdAt: Timestamp

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
       │    ├─ expenses: array
       │    ├─ incomes: array
       │    └─ settings: object

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
