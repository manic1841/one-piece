# 退休系統設計與資料流

本文描述退休系統的核心資料模型、收入導入流程、計算流程與維護規則。

## 1. 系統目標

- 以交易分錄為唯一財務來源，避免重複維護平行收入資料。
- 用可追蹤的收入流 (`incomeStreams`) 支援退休投影。
- 保持 Domain 純邏輯，將資料存取留在 Application/Infra。

## 2. 資料模型

### 2.1 退休計畫主文件

路徑：`households/{householdId}/retirement_plans/{planId}`

主文件保留：

- 假設參數（年齡、報酬率、通膨、現有資產）
- 一次性事件 (`events`)
- 快取摘要 (`summary`)
- 啟用旗標 (`isActive`)

啟用規則：

- 同一 `household` 僅允許一筆 `isActive=true` 的退休計畫。
- 當建立或更新任一計畫為 `isActive=true` 時，系統會自動將其他計畫設為 `isActive=false`。

主文件不作為收入/支出類別唯一來源，改由子集合管理。

### 2.2 收入流子集合

路徑：`households/{householdId}/retirement_plans/{planId}/incomeStreams/{incomeStreamId}`

關鍵欄位：

- `incomeCategory`: 對應會計科目，例如 `income:salary:charles`
- `type`: `salary` | `bonus` | `pension` | `rent` | `other`
- `incomeCalculationMode`: `FIXED`、`IMPORTED` 或 `DERIVED`
  - `FIXED`: 用戶手動輸入，按 `baseAmount` 和 `growthRate` 計算
  - `IMPORTED`: 由交易分錄導入，按 `baseAmount` 和 `growthRate` 計算
  - `DERIVED`: 由另一收入來源衍生，使用 `derivedFrom.baseIncomeId` 和 `derivedFrom.multiplier`

年份連動欄位：

- `startYearMode`: `MANUAL` | `LINKED_TO_RETIREMENT`
  - `LINKED_TO_RETIREMENT`: `startYear` 動態從 plan settings 的退休年份讀取（pension 常用）
- `endYearMode`: `MANUAL` | `LINKED_TO_RETIREMENT`
  - `LINKED_TO_RETIREMENT`: `endYear` 動態從 plan settings 的退休年份讀取（salary/bonus 常用）
- `lifelong`: boolean
  - `true`: 忽略 `endYear`，計算至退休投影模型的最後一年（pension 終身領取時使用）
  - `false`: 以 `endYear` 為準

派生收入欄位（`incomeCalculationMode=DERIVED` 時）：

- `derivedFrom.baseIncomeId`: 參考的基礎收入 id
- `derivedFrom.multiplier`: 倍數（例如 1.67 代表 2 個月獎金）

匯入來源統計欄位（`importedFrom=transactionEntries` 時）：

- `autoUpdate`: boolean，true 表示允許系統偵測過期並提示更新
- `calculatedFrom.ledgerCode`: 來源會計科目
- `calculatedFrom.sampleYear`: 資料來源年度（完整年度，e.g. 2025）
- `calculatedFrom.totalAmount`: 該年度加總金額
- `calculatedFrom.monthlyAverage`: totalAmount / 12
- `calculatedFrom.sampleCount`: 該年度分錄筆數
- `calculatedFrom.importedAt`: 匯入時間（ISO datetime）

### 2.3 支出類別子集合

路徑：`households/{householdId}/retirement_plans/{planId}/expenseCategories/{expenseCategoryId}`

關鍵欄位：

- `type`: `general` 或 `debt_payment`
- `sourceDebtAccountId`: 債務匯入對應的 DebtAccount id
- `includesPrincipal`: 是否包含本金（預設債務匯入為 true）
- `interestOnly`: 是否只計利息
- `calculatedFrom`: 債務匯入的來源統計（sample window、totalPaid、interestPaid）

### 2.4 事件模型（分段設定）

事件支援 `phases[]`，可描述不同人生階段的不同計算模式。

事件主欄位：

- `name`
- `type`: `income` | `expense`
- `calculationMode`: 事件預設模式（主要作為設定語意）
- `phases[]`

每個 phase 欄位：

- `name`
- `startYear` / `endYear`
- `mode`: `FIXED` | `SALARY_PERCENTAGE`
- `amount` / `growthRate`（`FIXED` 模式）
- `percentage` / `linkedIncomeId`（`SALARY_PERCENTAGE` 模式）

相容性規則：

- 舊版 `year` + `amount` 單次事件仍可讀取。
- 系統會將舊資料視為單段 `FIXED` phase（`startYear=endYear=year`）。

## 3. 收入導入流程

導入來源：`Transaction.entries`

樣本窗口：**上一個完整年度**（`lastFullYear = 當前年份 - 1`）

步驟：

1. 查詢 `lastFullYear` 整年的 `transactions`（1月1日～12月31日）
2. 展開每筆 `entries`
3. 篩選 `ledgerCode` 以 `income:` 開頭的分錄
4. 依 `ledgerCode` 分組後加總 `(credit - debit)`
5. 計算年化金額並建立對應 `incomeStream`

輸出欄位：

- `incomeCategory = ledgerCode`
- `calculatedFrom.ledgerCode = ledgerCode`
- `calculatedFrom.sampleYear = lastFullYear`
- `calculatedFrom.totalAmount = 該年度加總`
- `calculatedFrom.monthlyAverage = totalAmount / 12`
- `calculatedFrom.sampleCount = 該科目分錄數`
- `calculatedFrom.importedAt = 匯入時間`

過期偵測與批次更新（選項B）：

- 進入退休規劃頁時，系統計算 `lastFullYear`
- 檢查所有 `autoUpdate=true` 且 `calculatedFrom.sampleYear < lastFullYear` 的收入流
- 若有過期項目，頁面頂端顯示 banner：「N 筆收入資料仍使用 {sampleYear} 年資料，建議更新至 {lastFullYear} 年。[更新]」
- 使用者確認後，批次重算所有過期收入流，更新 `baseAmount`、`calculatedFrom` 統計欄位與 `sampleYear`
- `autoUpdate=false` 的收入流不納入偵測，使用者可手動觸發單筆更新

## 3.5 派生收入計算流程

派生收入是從另一收入來源衍生的收入（例如獎金 = 月薪 × 倍數）。

特性：

- 自動計算：用戶設定基礎收入、倍數，則派生收入自動跟隨基礎收入計算
- 無獨立成長：派生收入不單獨設定成長率，僅受基礎收入年化成長影響
- 依賴順序：計算時需先算出基礎收入，再計算派生收入

計算規則：

```
派生收入(年度 Y) = 基礎收入(年度 Y) × 倍數
```

例子：

- 用戶設定「月薪」：importedFrom=transactionEntries, baseAmount=$48000, growthRate=3%
- 用戶設定「年終獎金」：incomeCalculationMode=DERIVED, baseIncomeId=salary_id, multiplier=1.67
- 系統計算結果：
  - 年度 1: 獎金 = $48000 × 1.67 = $80160
  - 年度 2: 獎金 = $48000×1.03 × 1.67 = $82565

Repository 行為：

- 計算派生收入時，自動載入所有相關基礎收入並計算出年度值
- 支援多層派生（A→B→C），按依賴順序迭代計算

## 4. 債務還款導入流程

導入來源：`DebtAccount` + `DebtSnapshot`

步驟：

1. 掃描所有 `isActive=true` 的 DebtAccount
2. 每個 DebtAccount 建立一筆 `type=debt_payment` 的退休支出類別
3. 讀取 DebtAccount 的 `name`、`monthlyPayment`、`startDate/endDate`
4. 讀取最近 12 個月 DebtSnapshot，彙總 `totalPaid` 與 `interestPaid`
5. 建立固定支出項目並寫入 `expenseCategories`

計算規則：

- `includesPrincipal=true`: 年支出使用 `monthlyPayment * 12`
- `interestOnly=true`: 年支出使用 snapshots 的 `interestPaid` 年化值

## 5. Repository 行為

`retirementRepository` 的規則：

- `getPlan/getPlans`：讀取主文件後，載入 `incomeStreams` + `expenseCategories` 並組裝到 plan（完整資料）
- `getPlanSummaries`：僅讀取 `retirement_plans` 主文件，不載入 `incomeStreams/expenseCategories`（供清單頁使用，避免 N+1）
- `createPlan`：主文件建立時不直接寫 `incomes/expenses`，改寫入對應子集合
- `updatePlan`：若 payload 含 `incomes` 或 `expenses`，以「整批替換」方式同步到子集合
- `deletePlan`：先刪除 `incomeStreams`、`expenseCategories` 子集合文件，再刪除主文件
- `setOnlyActivePlan`：批次更新同 household 所有 retirement plans，保留指定 `planId` 為 `isActive=true`

Use Case 協作規則：

- `CreateRetirementPlanUseCase`：當新建 plan 為 active，會呼叫 `setOnlyActivePlan`
- `UpdateRetirementPlanUseCase`：當更新 `isActive=true`，會呼叫 `setOnlyActivePlan`
- `DuplicateRetirementPlanUseCase`：複製來源 plan（含 assumptions/incomes/expenses/events/summary），新 plan 預設 `isActive=false`

## 6. UI 操作

- 收入頁面提供「匯入近 12 個月收入」按鈕。
- 支出頁面提供「匯入債務還款」按鈕。
- 計畫清單頁提供「Duplicate」按鈕，可快速建立計畫副本。
- 事件頁改為分段編輯：可新增多個 phase，並可在每段設定 `FIXED` 或 `SALARY_PERCENTAGE`。
- Projection Results：
  - 圖表中 `Savings` 使用柱狀圖並綁定右側縱軸。
  - 明細表可逐年展開，查看當年每一筆收入明細與支出明細。
  - 明細表額外顯示 `投資收益` 欄位（與 `收入` 分開）。
- 收入匯入結果以 `incomeCategory` 對齊：
  - 已存在相同 `incomeCategory`：更新既有項目（保留原 id）
  - 不存在：新增項目
- 債務匯入結果以 `sourceDebtAccountId` 對齊：
  - 已存在相同 `sourceDebtAccountId`：更新既有項目（保留原 id）
  - 不存在：新增項目

## 7. 驗證重點

- 收入匯入只統計 `income:*` 科目，避免把資產/負債分錄誤算成收入。
- 收入分錄金額使用 `(credit - debit)`，避免方向顛倒。
- 債務匯入必須只處理 `isActive=true` 帳戶。
- `interestOnly` 模式必須來自 DebtSnapshot `interestPaid`，不可混用本金。
- 所有導入 metadata 保留來源欄位（ledgerCode/debtAccountId），便於追蹤與稽核。
- phase 驗證：
  - `endYear >= startYear`
  - `FIXED` 必填 `amount`
  - `SALARY_PERCENTAGE` 必填 `percentage`
- 事件資料需符合以下任一條件：
  - 新版：`phases.length > 0`
  - 舊版相容：同時具備 `year` 與 `amount`
- active plan 唯一性必須成立（同 household 不能同時存在兩筆 `isActive=true`）。
- 年份連動驗證：
  - `endYearMode=LINKED_TO_RETIREMENT` 時，計算引擎必須從 plan settings 動態讀取退休年份，不可讀 `endYear` 欄位
  - `startYearMode=LINKED_TO_RETIREMENT` 時同理
  - `lifelong=true` 時忽略 `endYear`，計算至模型終止年，不可因 `endYear` 為空而報錯
- 過期偵測驗證：
  - `sampleYear` 必須為完整年度數字，不可為空或非數字
  - 批次更新時，若某科目在 `lastFullYear` 無任何分錄，保留原 `baseAmount` 不變，僅更新 `sampleYear` 並加註警告
- 退休金（pension）驗證：
  - `lifelong=true` 時不可要求填入 `endYear`
  - `startYear` 允許大於退休年份（晚於退休才開始領取）
