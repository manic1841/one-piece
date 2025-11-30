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

       ├─ projects/{projectId}       # 專案帳戶
       │    ├─ name: string
       │    ├─ color: string
       │    ├─ icon: string
       │    ├─ description: string
       │    ├─ isPersonal: boolean    # 零用錢標記
       │    ├─ isActive: boolean
       │    ├─ createdAt: Timestamp
       │    └─ updatedAt: Timestamp
       │
       │    └─ snapshots/{snapshotId}  # Subcollection: 每月快照
       │         ├─ year: number
       │         ├─ month: number
       │         ├─ openingBalance: number
       │         ├─ income: number
       │         ├─ expense: number
       │         ├─ closingBalance: number
       │         └─ createdAt: Timestamp
       │         # 🔹 建議索引: year DESC, month DESC

       ├─ projectTransactions/{transactionId}  # 專案資金調度
       │    ├─ date: Timestamp
       │    ├─ type: "allocation" | "transfer" | "adjustment"
       │    ├─ fromProject: string (nullable)
       │    ├─ toProject: string
       │    ├─ amount: number
       │    ├─ description: string
       │    ├─ incomeSource: string
       │    ├─ createdBy: string
       │    └─ createdAt: Timestamp
       │    # 🔹 建議索引: toProject, date DESC | fromProject, date DESC

       ├─ transactions/{transactionId}         # 日常交易
       │    ├─ date: Timestamp
       │    ├─ amount: number
       │    ├─ type: "income" | "expense"
       │    ├─ projectId: string
       │    ├─ category: string
       │    ├─ description: string
       │    ├─ createdBy: string
       │    └─ createdAt: Timestamp
       │    # 🔹 建議索引: projectId, date DESC | date DESC

       ├─ plannedIncome/{incomeId}            # 計劃收入與分配
       │    ├─ date: Timestamp
       │    ├─ amount: number
       │    ├─ category: "salary" | "bonus" | "other"
       │    ├─ description: string
       │    ├─ createdBy: string
       │    ├─ createdAt: Timestamp
       │    ├─ allocations: array              # 預設分配比例
       │    │    ├─ projectId: string
       │    │    ├─ percentage: number
       │    │    └─ lastUsedAmount?: number
       │    └─ userSettings: object            # 使用者調整
       │         ├─ modifiedAt?: Timestamp
       │         └─ adjustedAllocations?: array
       │              ├─ projectId: string
       │              └─ percentage: number

       ├─ accounts/{accountId}                # 銀行/投資帳戶
       │    ├─ name: string
       │    ├─ type: "bank" | "cash" | "investment" | "loan" | "other"
       │    ├─ currency: string
       │    ├─ isActive: boolean
       │    ├─ createdAt: Timestamp
       │    ├─ updatedAt: Timestamp
       │    └─ holdings: array (optional)     # 投資帳戶的持倉
       │         ├─ symbol: string
       │         ├─ name: string
       │         ├─ shares: number
       │         ├─ averageCost: number
       │         └─ type: "stock" | "etf" | "bond"
       │
       │    └─ snapshots/{snapshotId}         # Subcollection: 每月餘額快照
       │         ├─ year: number
       │         ├─ month: number
       │         ├─ amount: number
       │         ├─ createdBy: string
       │         └─ createdAt: Timestamp
       │         # 🔹 建議索引: year DESC, month DESC

       ├─ portfolios/{portfolioId}            # 投資組合（帳戶群組）
       │    ├─ name: string
       │    ├─ description: string
       │    ├─ accountIds: string[]           # 包含的帳戶
       │    ├─ isActive: boolean
       │    ├─ createdAt: Timestamp
       │    └─ updatedAt: Timestamp
       │
       │    └─ snapshots/{snapshotId}         # Subcollection: 每月績效快照
       │         ├─ year: number
       │         ├─ month: number
       │         ├─ accounts: array            # 該時點各帳戶狀態
       │         │    ├─ accountId: string
       │         │    ├─ accountName: string
       │         │    ├─ type: string
       │         │    ├─ value: number
       │         │    └─ holdings: array (optional)
       │         ├─ totalValue: number
       │         ├─ cashFlow: object
       │         │    ├─ deposits: number
       │         │    └─ withdrawals: number
       │         ├─ performance: object
       │         │    ├─ openingValue: number
       │         │    ├─ closingValue: number
       │         │    ├─ netCashFlow: number
       │         │    ├─ gain: number
       │         │    ├─ returnRate: number
       │         │    ├─ cumulativeGain: number
       │         │    └─ cumulativeReturnRate: number
       │         ├─ createdAt: Timestamp
       │         └─ createdBy: string

       └─ retirementPlans/{planId}            # 退休規劃方案
            ├─ name: string
            ├─ isActive: boolean
            ├─ createdBy: string
            ├─ createdAt: Timestamp
            ├─ updatedAt: Timestamp
            │
            ├─ # === Assumptions（規劃假設）===
            ├─ currentYear: number
            ├─ currentAge: number
            ├─ retirementAge: number
            ├─ lifeExpectancy: number
            ├─ currentSavings: number
            ├─ salaryGrowthRate: number       # 薪資成長率 (%)
            ├─ inflationRate: number          # 通膨率 (%)
            ├─ investmentReturnRate: number   # 投資報酬率 (%)
            │
            ├─ # === Data Collections（內嵌陣列）===
            ├─ incomes: array                 # 收入來源
            │    ├─ id: string
            │    ├─ name: string
            │    ├─ type: "salary" | "bonus" | "pension" | "rent" | "other"
            │    ├─ startYear: number
            │    ├─ endYear: number
            │    ├─ baseAmount: number        # 起始年度金額
            │    ├─ growthRate: number        # 成長率 (%)
            │    └─ note: string
            │
            ├─ expenses: array                # 支出類別
            │    ├─ id: string
            │    ├─ name: string
            │    ├─ sourceProjectId: string   # 來源專案（若匯入）
            │    ├─ baseAmount: number        # 年度金額
            │    ├─ growthRate: number        # 成長率 (%)
            │    ├─ retirementMultiplier: number  # 退休後乘數（0.7 = 70%）
            │    ├─ startYear: number
            │    ├─ endYear: number | null    # null = 終身
            │    └─ note: string
            │
            ├─ events: array                  # 一次性事件
            │    ├─ id: string
            │    ├─ year: number
            │    ├─ type: "income" | "expense"
            │    ├─ amount: number
            │    ├─ name: string
            │    └─ note: string
            │
            ├─ importSettings: object (optional)  # 匯入設定
            │    ├─ fromProjects: boolean
            │    ├─ importDate: Timestamp
            │    ├─ referenceMonths: number
            │    └─ projectMappings: Record<string, string>
            │
            └─ summary: object (optional)     # 計算結果快取
                 ├─ retirementYear: number
                 ├─ savingsAtRetirement: number
                 ├─ minSavings: number
                 ├─ minSavingsYear: number
                 ├─ isBankrupt: boolean
                 └─ lastCalculatedAt: Timestamp
```

## Schema 檔案對應

| Collection            | Schema File         | Notes          |
| --------------------- | ------------------- | -------------- |
| `users`               | `core.ts`           | 使用者基本資料 |
| `households`          | `core.ts`           | 家庭與成員管理 |
| `projects`            | `project.ts`        | 專案帳戶與快照 |
| `projectTransactions` | `allocation.ts`     | 資金調度記錄   |
| `transactions`        | `transaction.ts`    | 日常收支交易   |
| `plannedIncome`       | `plannedIncome.ts`  | 收入分配計畫   |
| `accounts`            | `account.ts`        | 銀行/投資帳戶  |
| `portfolios`          | `portfolio.ts`      | 投資組合與績效 |
| `retirementPlans`     | `retirementPlan.ts` | 退休規劃方案   |

## 設計注意事項

### 1. **Retirement Planning System**（退休規劃系統）

- 使用內嵌陣列而非 subcollections，因個人計畫資料量小
- 優點：減少讀取次數、易於複製、簡化同步
- 資料匯入：從 `projects` snapshots 與 `plannedIncome` 自動匯入
- 計算邏輯：前端即時計算，僅快取摘要結果

### 2. **Portfolio System**（投資組合系統）

- `portfolios` 是帳戶的邏輯分組（如「退休帳戶」、「教育基金」）
- Snapshots 記錄完整的帳戶狀態與績效指標
- 支援淨現金流、收益率、累積收益等計算

### 3. **Account Holdings**（帳戶持倉）

- 投資帳戶的 `holdings` 陣列記錄股票/ETF/債券持倉
- Snapshots 保留歷史持倉狀況，用於績效追蹤

### 4. **索引建議**

- 所有依時間查詢的 collection 建議建立複合索引
- 常見查詢路徑：`(householdId, date DESC)` 或 `(projectId, date DESC)`
- Snapshots 建議索引：`(year DESC, month DESC)`

### 5. **IncomeStatement**（損益表） - 計算型資料

- 不儲存在 Firestore，由前端從 `transactions` 與 `projects` 計算
- Schema 定義於 `incomeStatement.ts`，僅用於型別驗證
