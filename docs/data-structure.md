# One-Piece Data Structure

本文是 Firestore 集合與欄位的結構參考，不重新定義欄位背後的架構取捨或業務政策。相關決策以 `docs/adr/` 為唯一來源；若欄位清單與 ADR 不一致，應以 ADR 修正本文件。

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

## ADR 索引

下表只列出影響本資料結構的決策；欄位清單仍保留在上方，決策理由與約束請直接閱讀對應 ADR。

| 資料或規則                                | 權威決策                                                                                                                                                                                                                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transaction、entries 與 IntentType        | [ADR-0005](adr/0005-journal-entry-architecture.md)、[ADR-0010](adr/0010-intenttype-three-tier.md)                                                                                                                                                                                                  |
| Project、Account、LedgerCode 的責任與命名 | [ADR-0006](adr/0006-project-legercode-separation.md)、[ADR-0007](adr/0007-account-ledgercode-naming-distinction.md)、[ADR-0008](adr/0008-asset-cash-no-bank-distinction.md)、[ADR-0009](adr/0009-user-defined-ledgercode.md)、[ADR-0021](adr/0021-subcategory-not-snapshot-for-property-income.md) |
| Allocation 與 ProjectSnapshot             | [ADR-0011](adr/0011-allocation-separate-collection.md)、[ADR-0012](adr/0012-project-snapshot-cache.md)、[ADR-0013](adr/0013-negative-project-balance-allowed.md)                                                                                                                                   |
| DebtAccount、還款與寬限期                 | [ADR-0014](adr/0014-debt-payment-intenttype.md)、[ADR-0015](adr/0015-debt-account-balance-derived.md)、[ADR-0016](adr/0016-debt-account-creation-liability-borrow-sync.md)、[ADR-0017](adr/0017-grace-period-derived-not-stored.md)                                                                |
| 財務報表與快照                            | [ADR-0018](adr/0018-manual-financial-report-generation.md)、[ADR-0019](adr/0019-balance-sheet-hybrid-equity-derived.md)、[ADR-0020](adr/0020-cash-flow-ending-vs-actual-balance.md)                                                                                                                |
| RetirementPlan 與收入/支出/事件子集合     | [ADR-0023](adr/0023-retirement-income-from-entries-only.md) 至 [ADR-0037](adr/0037-retirement-plan-duplicate-inactive.md)                                                                                                                                                                          |
