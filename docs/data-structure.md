# One-Piece Data Structure

本文是 Firestore 集合與欄位的結構參考，也是欄位與跨集合規則的規範來源。取捨的理由記載在 `docs/adr/`；調整結構時先改本文件，決策理由的變動才寫進 ADR。

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
       └─ members: map<uid, { role, joinedAt }>
            ├─ role: "owner" | "admin" | "member" | "guest"
            └─ joinedAt: Timestamp

       ├─ projects/{projectId}       # 專案帳戶 (Management Accounting)
       │    ├─ name: string
       │    ├─ order: number           # 系統排序（reorder transactions）
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
       │         ├─ holdings: array      # 證券持倉詳情 (symbol, cost, marketValue, leverage; ADR-0060 市值制，不記錄數量)
       │         └─ createdAt: Timestamp

     # Account 停用規則：
     # - 停用帳戶不再出現在記帳表單/月底結算輸入列表
     # - snapshots 子集合為歷史記錄，停用不影響既有資料

       ├─ portfolios/{portfolioId}       # 投資組合 (Investment Tracking, ADR-0054)
       │    ├─ name: string
       │    ├─ securitiesAccountId: string  # 恰好一個證券帳戶（類別須為 securities）
       │    ├─ bankAccountId: string        # 恰好一個銀行/現金帳戶；建立後連結不可變更
       │    ├─ isActive: boolean
       │    │
       │    # 規則（ADR-0054）：
       │    # - 每個來源帳戶至多屬於一個 portfolio（create 時由 use case 驗證）
       │    # - accountIds[]/description 為舊欄位，讀取時由 schema strip，遷移腳本 scripts/admin/migrate-portfolio-links.ts
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
      │         ├─ incomeCategory: string       # e.g. "income:salary:charles"
      │         ├─ type: "salary" | "bonus" | "pension" | "rent" | "other"
      │         │
      │         │  # --- 金額設定（v2：無計算模式、無連動年份模式）---
      │         ├─ currentAnnual: number | null    # 匯自完整年度實際資料（唯讀）；null = 情境專用流，退休前貢獻 0
      │         ├─ retirementAnnual?: number        # 退休年金額；缺省時以 currentAnnual 調整後水準沿用
      │         ├─ growthRate?: number              # 年成長率（%），缺省 = 計畫通膨率
      │         ├─ startYear: number                 # 具體年份（v2 無 startYearMode；連動由遷移解析寫入）
      │         ├─ endYear?: number                  # 具體年份（v2 無 endYearMode；lifelong 終身流不寫 endYear）
      │         │
      │         │
      │         ├─ calculatedFrom: object
      │         │    ├─ ledgerCode: string      # e.g. "income:salary:charles"
      │         │    ├─ sampleYear: number      # 表示資料來自哪個年度
      │         │    ├─ totalAmount: number
      │         │    ├─ monthlyAverage: number
      │         │    ├─ sampleCount: number
      │         │    └─ importedAt: string      # ISO datetime
      │         └─ note?: string       │
       │    └─ expenseCategories/{expenseCategoryId}  # 退休支出類別（含債務匯入）
       │         ├─ name: string
       │         ├─ type: "general" | "debt_payment"
       │         ├─ sourceDebtAccountId?: string
       │         ├─ includesPrincipal: boolean
       │         ├─ interestOnly: boolean
       │         ├─ expenseCategory?: string       # 匯入來源科目；"Import from Ledger" merge 對齊鍵
       │         ├─ currentAnnual: number          # 目前年支出（匯自完整年度實際資料；v1 攤平為固定金額）
       │         ├─ growthRate?: number            # 年成長率（%），缺省 = 計畫通膨率
       │         ├─ retirementMultiplier: number   # 退休後水準（factor 0-1），IMMEDIATE 適用
       │         ├─ startYear: number
       │         ├─ endYear?: number | null        # general: 缺省 = 終身；債務匯入填 endYear
       │         ├─ calculatedFrom?: object
       │         │    ├─ debtAccountId?: string
       │         │    ├─ sampleStartYearMonth?: string
       │         │    ├─ sampleEndYearMonth?: string
       │         │    ├─ totalPaid?: number
       │         │    ├─ interestPaid?: number
       │         │    ├─ sampleCount?: number
       │         │    └─ importedAt?: string
       │         └─ note?: string
      ├─ allocations/{allocationId}     # 專案資金分配；新建資料的 ID = sourceTransactionId；legacy random ID 以 sourceTransactionId fallback 並在取代時 lazy normalize
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

      ├─ watchList/{docId}              # 監看清單 (ADR-0048)；docId = "{targetType}:{targetId}"
       │    ├─ targetType: "PROJECT" | "LEDGER_CODE" | "DEBT_ACCOUNT"
       │    ├─ targetId: string          # 監看對象 id（ledger code 含 ':'，故 docId 以 targetType 命名空間隔離）
       │    └─ name: string              # 名稱快照，供警示顯示
     │
     │    # 規則：
     │    # - 同一 household 中，一個 ledgerCode 僅對應一個 template
     │    # - 可設定一筆 isDefault = true 作為無匹配 ledgerCode 的 fallback
     │    # - template 僅供 UI 預填，修改 template 不會回寫既有 allocations
       ├─ financialPeriods/{yearMonth}    # 財務期間狀態 (ADR-0050/0052)；docId = YYYY-MM，開始關帳才建檔，無紀錄 = OPEN
       │    ├─ yearMonth: string          # 財務期間鍵 (YYYY-MM)
       │    ├─ status: "OPEN" | "IN_PROGRESS" | "NEEDS_REVIEW" | "CLOSED"
       │    ├─ stages: map<stageId, { status, confirmedBy?, confirmedAt? }>   # 各階段狀態 (ADR-0052 九階段)
       │    ├─ reviewSourceStageId?: string # NEEDS_REVIEW 時的來源階段；null = 前期關帳重開的連鎖降級 (ADR-0066)
       │    ├─ createdBy: string
       │    └─ updatedAt: Timestamp
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

      ├─ operations/{operationRecordId}  # household-scoped command retry record；operation type + key 穩定映射
      │    ├─ operationType: string
      │    ├─ idempotencyKey: string
      │    ├─ fingerprintVersion: number
      │    ├─ payloadFingerprint: string
      │    ├─ status: "IN_PROGRESS" | "SUCCEEDED" | "FAILED"
      │    ├─ resultReference: object | null
      │    ├─ createdAt: Timestamp
      │    ├─ updatedAt: Timestamp
      │    ├─ completedAt?: Timestamp | null
      │    └─ createdByUid: string

       ├─ reports/{reportId}             # 財務報表快照
            ├─ year: number
            ├─ month: number
            ├─ type: "income_statement" | "balance_sheet" | "cash_flow"
            ├─ data: object
            └─ generatedAt: Timestamp

       ├─ ledgerCodes/{code}             # 自訂會計科目（isCustom: true）
       │    ├─ code: string              # e.g. "liability:mortgage"、"asset:property:taipei"
       │    ├─ label: string             # e.g. "房貸"
       │    ├─ type: LedgerType          # = code 的第一段，不可由呼叫端自報
       │    ├─ isCustom: true
       │    ├─ isActive: boolean
       │    ├─ createdBy: string
       │    └─ createdAt: Timestamp
       │
       │    # 建立規則（ADR-0009）；建立後 code 不可變更，生命週期只有啟用／停用，沒有刪除。
       │    # - code 形狀為 type:category 或 type:category:detail，僅小寫英數字與底線；
       │    #   最多細分到明細科目，明細科目之下不可再分。
       │    # - type 限 asset | liability | equity | income | expense。
       │    # - 明細科目的 parent 必須是既有的 category，且必須啟用中。
       │    # - 停用 category 前必須先停用其明細科目；已被分錄引用的科目不得停用
       │    #   （以 transactions.ledgerCodes 判斷）。

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
            ├─ closedAt?: Timestamp | null # 結清日期，isActive=false 時寫入
            └─ snapshots/{yearMonth}     # 每月 DEBT_PAYMENT 累計快照，ID = YYYY-MM
```

## 跨集合規則

- **專案餘額**由 Allocation 與 Transaction 推導（管理會計）；**報表**則從分錄的 LedgerCode 計算（財務會計）。兩者語意不同，不得互相推導（ADR-0006）。
- **ProjectSnapshot 是可重算的快取**，entries 才是唯一真相；程式碼永遠不直接寫快照，只寫 Transaction 與 Allocation（ADR-0012）。
- **現金不細分帳戶**：統一以 `asset:cash` 記錄，不區分是哪張銀行帳戶或信用卡；分錄不回答「這筆錢從哪個帳戶付的」（ADR-0008）。
- **不動產與收入以明細科目區分，不用快照**：例如 `asset:property:taipei`、`income:salary:charles`。報表層對明細科目的父科目 roll-up 尚未實作（ADR-0021）。
- **排序是 desired-state 全量序列**：reorder 一律送完整的 `[{id, order}]` 序列，成功或全數失敗；缺漏與重複一律拒絕（ADR-0041）。

## ADR 索引

下表只列出影響本資料結構的決策；欄位清單與規則保留在本文件上方，決策的取捨理由請閱讀對應 ADR。

| 資料或規則                                | 權威決策                                                                                                                                                                                                                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transaction、entries 與 IntentType        | [ADR-0005](adr/0005-journal-entry-architecture.md)、[ADR-0010](adr/0010-intenttype-three-tier.md)                                                                                                                                                                                                  |
| Project、Account、LedgerCode 的責任與命名 | [ADR-0006](adr/0006-project-legercode-separation.md)、[ADR-0007](adr/0007-account-ledgercode-naming-distinction.md)、[ADR-0008](adr/0008-asset-cash-no-bank-distinction.md)、[ADR-0009](adr/0009-user-defined-ledgercode.md)、[ADR-0021](adr/0021-subcategory-not-snapshot-for-property-income.md) |
| Allocation 與 ProjectSnapshot             | [ADR-0011](adr/0011-allocation-separate-collection.md)、[ADR-0012](adr/0012-project-snapshot-cache.md)、[ADR-0013](adr/0013-negative-project-balance-allowed.md)                                                                                                                                   |
| DebtAccount、還款與寬限期                 | [ADR-0014](adr/0014-debt-payment-intenttype.md)、[ADR-0015](adr/0015-debt-account-balance-derived.md)、[ADR-0016](adr/0016-debt-account-creation-liability-borrow-sync.md)、[ADR-0017](adr/0017-grace-period-derived-not-stored.md)、[ADR-0038](adr/0038-command-atomicity-and-retry-policy.md)    |
| Command 原子性、重試與 operation record   | [ADR-0038](adr/0038-command-atomicity-and-retry-policy.md)                                                                                                                                                                                                                                         |
| 財務報表與快照                            | [ADR-0018](adr/0018-manual-financial-report-generation.md)、[ADR-0019](adr/0019-balance-sheet-hybrid-equity-derived.md)、[ADR-0020](adr/0020-cash-flow-ending-vs-actual-balance.md)                                                                                                                |
| 財務期間與關帳工作流                      | [ADR-0050](adr/0050-financial-period-workflow-state.md)、[ADR-0051](adr/0051-reconciliation-statement-level-consistency.md)、[ADR-0052](adr/0052-monthly-close-stage-data-boundary.md)                                                                                                             |
| RetirementPlan 與收入/支出/事件子集合     | [ADR-0023](adr/0023-retirement-income-from-entries-only.md) 至 [ADR-0040](adr/0040-retirement-plan-atomic-writes.md)                                                                                                                                                                               |
