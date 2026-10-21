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

      ├─ retirementPlans/{planId}       # 退休計畫：可重複使用的假設模板（ADR-0083）
      │    ├─ name: string              # trim().min(1)、max(100)
      │    ├─ assumptions: object       # 五個必填純量；currentAge = 當下年度 − birthYear，不落庫
      │    │    ├─ birthYear: integer            # 1900..當下年度；建立後不可變
      │    │    ├─ retirementAge: integer        # 1..120
      │    │    ├─ lifeExpectancy: integer       # > retirementAge、>= currentAge
      │    │    ├─ inflationRate: decimal        # -0.10..0.20，4 位小數
      │    │    ├─ annualReturnRate: decimal     # -0.50..0.30，4 位小數
      │    │    # 交叉檢查：currentAge > 130 報錯；規則見 retirement-system.md §3
      │    ├─ projectionRules: array    # 每條必有 source（fixedAmount 除外）
      │    │    ├─ id: string
      │    │    ├─ name: string
      │    │    ├─ ruleType: "income" | "expense"
      │    │    ├─ source: object       # 與 ruleType 正交
      │    │    │    ├─ type: "ledgerCode" | "rule" | "debtAccount"
      │    │    │    └─ id: string
      │    │    ├─ method: "inflation" | "growthRate" | "percentage" | "fixedAmount" | "debtAmortization"
      │    │    ├─ parameters: object   # 依 method 判別聯集；金額一律為正
      │    │    ├─ endCondition: object # debtAmortization 以外才有
      │    │    ├─ baselinePolicy?: "previousCompleteYear" | "specificYear"
      │    │    └─ enabled: boolean     # 預設 true
      │    ├─ lifeEvents: array         # 每條無 source
      │    │    ├─ id: string
      │    │    ├─ name: string
      │    │    ├─ type: "income" | "expense"
      │    │    ├─ enabled: boolean     # 預設 true
      │    │    └─ phases: array        # min(1)，依 startYear 升冪且不重疊
      │    │         ├─ name?: string
      │    │         ├─ startYear: integer       # 1900..2200
      │    │         ├─ endYear: integer         # >= startYear、<=2200
      │    │         ├─ amount: number           # >= 0
      │    │         └─ growthRate?: decimal     # -0.10..0.20，缺省跟隨通膨
      │    ├─ createdBy: string         # audit；不顯示
      │    ├─ updatedBy: string         # audit；不顯示
      │    ├─ createdAt: Timestamp      # audit；不顯示
      │    └─ updatedAt: Timestamp      # audit；只在前進時改
      │
      │    # 單一文件，上限 900_000 bytes（PLAN_TOO_LARGE）
      # update 整份送出、只 omit birthYear；沒有 partial 版本

      ├─ projections/{projectionId}     # 一次計算的凍結事實；建立後唯讀（ADR-0083）
      │    ├─ name: string              # trim().min(1)；唯一可 rename 的欄位
      │    ├─ engineVersion: integer    # 低於現行 ENGINE_VERSION 即過舊
      │    ├─ createdAt: Timestamp
      │    ├─ createdBy: string
      │    ├─ retirementNetWorth: number | null
      │    ├─ finalNetWorth: number
      │    ├─ minNetWorth: number
      │    ├─ minNetWorthYear: integer | null
      │    ├─ bankruptcyYear: integer | null
      │    ├─ isBankrupt: boolean
      │    │
      │    ├─ snapshots/config          # 固定 docId
      │    │    ├─ startYear: integer
      │    │    ├─ openingNetWorth: object
      │    │    │    ├─ amount: number
      │    │    │    ├─ source: "derived" | "manual"
      │    │    │    └─ anchorYearMonth?: string  # 只在 derived 時存在
      │    │    ├─ assumptions: object  # 與 plan 共用子 schema
      │    │    ├─ projectionRules: array
      │    │    └─ lifeEvents: array
      │    │
      │    ├─ snapshots/source          # 固定 docId；不存分錄明細
      │    │    └─ ruleSources: array
      │    │         ├─ ruleId: string
      │    │         ├─ sourceType: "ledgerCode" | "rule" | "debtAccount"
      │    │         ├─ sourceId: string
      │    │         ├─ baselineYear: integer
      │    │         └─ baselineAmount: number
      │    │
      │    └─ results/annual            # 固定 docId；單一文件不切 chunk
      │         └─ years: array
      │              ├─ year: integer
      │              ├─ age: integer
      │              ├─ isRetired: boolean
      │              ├─ opening: integer
      │              ├─ return: integer
      │              ├─ inflows: integer
      │              ├─ outflows: integer
      │              └─ closing: integer
      │
      │    # 四份文件共用 900_000 bytes 上限（PROJECTION_TOO_LARGE，逐文件判定）
      # 主文件不含 startYear；三份子文件皆無 createdAt
      # repository 無 update；rename 只改 name；delete 子先主後、單一 batch
      # 建立一律四份文件同一個 batch 全寫（ADR-0088）

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
     │
     │    # 規則：
     │    # - 同一 household 中，一個 ledgerCode 僅對應一個 template
     │    # - 可設定一筆 isDefault = true 作為無匹配 ledgerCode 的 fallback
     │    # - template 僅供 UI 預填，修改 template 不會回寫既有 allocations
       ├─ financialPeriods/{yearMonth}    # 財務期間狀態 (ADR-0050/0052)；docId = YYYY-MM，開始關帳才建檔，無紀錄 = 尚未開始關帳
       │    ├─ yearMonth: string          # 財務期間鍵 (YYYY-MM)
       │    ├─ status: "IN_PROGRESS" | "NEEDS_REVIEW" | "CLOSED"
       │    ├─ stages: map<stageId, { status, confirmedBy?, confirmedAt? }>   # 各階段狀態 (ADR-0052 八階段)
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
            ├─ type: "mortgage" | "loan"
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
            ├─ isActive: boolean        # false = 停用（結清時亦為 false）
            ├─ closedAt?: Timestamp | null # 結清日期，結清時寫入（closedAt 有值=已結清，否則=停用）
            └─ snapshots/{yearMonth}     # 每月 DEBT_PAYMENT 累計快照，ID = YYYY-MM
```

## 跨集合規則

- **專案餘額**由 Allocation 與 Transaction 推導（管理會計）；**報表**則從分錄的 LedgerCode 計算（財務會計）。兩者語意不同，不得互相推導（ADR-0006）。
- **ProjectSnapshot 是可重算的快取**，entries 才是唯一真相；程式碼永遠不直接寫快照，只寫 Transaction 與 Allocation（ADR-0012）。
- **現金不細分帳戶**：統一以 `asset:cash` 記錄，不區分是哪張銀行帳戶或信用卡；分錄不回答「這筆錢從哪個帳戶付的」（ADR-0008）。
- **不動產與收入以明細科目區分，不用快照**：例如 `asset:property:taipei`、`income:salary:charles`。報表層對明細科目的父科目 roll-up 已實作（ADR-0069）：損益與現金流以父科目成列、明細巢狀為 subItems；資產負債表的欄位項（不動產、資本）由 group 承擔 roll-up，`items` 直接記錄明細科目（ADR-0074）。
- **排序是 desired-state 全量序列**：reorder 一律送完整的 `[{id, order}]` 序列，成功或全數失敗；缺漏與重複一律拒絕（ADR-0041）。

## ADR 索引

下表只列出影響本資料結構的決策；欄位清單與規則保留在本文件上方，決策的取捨理由請閱讀對應 ADR。

| 資料或規則                                | 權威決策                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transaction、entries 與 IntentType        | [ADR-0005](adr/0005-journal-entry-architecture.md)、[ADR-0010](adr/0010-intenttype-three-tier.md)                                                                                                                                                                                                         |
| Project、Account、LedgerCode 的責任與命名 | [ADR-0006](adr/0006-project-legercode-separation.md)、[ADR-0007](adr/0007-account-ledgercode-naming-distinction.md)、[ADR-0008](adr/0008-asset-cash-no-bank-distinction.md)、[ADR-0009](adr/0009-user-defined-ledgercode.md)、[ADR-0021](adr/0021-subcategory-not-snapshot-for-property-income.md)        |
| Allocation 與 ProjectSnapshot             | [ADR-0011](adr/0011-allocation-separate-collection.md)、[ADR-0012](adr/0012-project-snapshot-cache.md)、[ADR-0013](adr/0013-negative-project-balance-allowed.md)                                                                                                                                          |
| DebtAccount、還款與寬限期                 | [ADR-0014](adr/0014-debt-payment-intenttype.md)、[ADR-0015](adr/0015-debt-account-balance-derived.md)、[ADR-0016](adr/0016-debt-account-creation-liability-borrow-sync.md)、[ADR-0017](adr/0017-grace-period-derived-not-stored.md)、[ADR-0038](adr/0038-command-atomicity-and-retry-policy.md)           |
| Command 原子性、重試與 operation record   | [ADR-0038](adr/0038-command-atomicity-and-retry-policy.md)                                                                                                                                                                                                                                                |
| 財務報表與快照                            | [ADR-0018](adr/0018-manual-financial-report-generation.md)、[ADR-0019](adr/0019-balance-sheet-hybrid-equity-derived.md)、[ADR-0020](adr/0020-cash-flow-ending-vs-actual-balance.md)、[ADR-0069](adr/0069-report-layer-rollup-label-resolution.md)、[ADR-0074](adr/0074-balance-sheet-group-items-flat.md) |
| 財務期間與關帳工作流                      | [ADR-0050](adr/0050-financial-period-workflow-state.md)、[ADR-0051](adr/0051-reconciliation-statement-level-consistency.md)、[ADR-0052](adr/0052-monthly-close-stage-data-boundary.md)                                                                                                                    |
| 退休計畫與投影                            | [ADR-0083](adr/0083-projection-is-frozen-plan-is-template.md) 至 [ADR-0089](adr/0089-delete-legacy-no-migration.md)                                                                                                                                                                                       |
