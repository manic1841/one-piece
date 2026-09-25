# 退休系統設計與資料流

本文描述退休系統的核心資料模型、收入導入流程、計算流程與維護規則。

本文件是退休系統資料模型、流程與存放庫行為的規範來源。收入來源與匯入窗口的取捨理由見 [ADR-0023](adr/0023-retirement-income-from-entries-only.md) 至 [ADR-0025](adr/0025-retirement-sample-window-auto-shift.md)；子集合、存放庫行為、事件與計畫生命週期見 [ADR-0026](adr/0026-retirement-plan-subcollections.md) 至 [ADR-0037](adr/0037-retirement-plan-duplicate-inactive.md)；v1 平坦金額欄位（currentAnnual / retirementAnnual / 固定支出）與計算模式退役見 [ADR-0057](adr/0057-retirement-v1-flat-amount-fields.md)。欄位清單見 [data-structure.md](data-structure.md)。

## 1. 系統目標

- 以交易分錄為唯一財務來源，避免重複維護平行收入資料。
- 用可追蹤的收入流 (`incomeStreams`) 支援退休投影。
- 保持 Domain 純邏輯，將資料存取留在 Application/Infra。

## 2. 資料模型

### 2.1 退休計畫主文件

路徑：`households/{householdId}/retirement_plans/{planId}`

主文件保留假設參數、事件、快取摘要與 `isActive`。收入與支出類別由子集合管理；其結構見 [ADR-0026](adr/0026-retirement-plan-subcollections.md)。

- **同一 household 僅允許一筆 `isActive=true`**，由 `setOnlyActivePlan` 原子切換（[ADR-0036](adr/0036-single-active-retirement-plan.md)）。
- **複製計畫**：完整複製子集合與事件，但新計畫預設 `isActive=false`，不昨接釋放原 active（[ADR-0037](adr/0037-retirement-plan-duplicate-inactive.md)）。
- 計畫不存在時操作回傳 `PLAN_NOT_FOUND`。

### 2.2 收入流子集合

路徑：`households/{householdId}/retirement_plans/{planId}/incomeStreams/{incomeStreamId}`

收入流以會計科目、收入類型、目前/退休兩個金額欄位與來源統計描述；v1 不再有計算模式（見 [ADR-0057](adr/0057-retirement-v1-flat-amount-fields.md)），v2 再移除 `importedFrom` / `autoUpdate` / `startYearMode` / `endYearMode`（見 issue #133）：`currentAnnual` 為 `number | null`（null = 情境專用流，退休前貢獻 0），年份連動由遷移腳本解析為具體年份。分錄來源、樣本年度與過期更新見 [ADR-0023](adr/0023-retirement-income-from-entries-only.md) 至 [ADR-0025](adr/0025-retirement-sample-window-auto-shift.md)。欄位詳見 [data-structure.md](data-structure.md)。

### 2.3 支出類別子集合

路徑：`households/{householdId}/retirement_plans/{planId}/expenseCategories/{expenseCategoryId}`

支出類別以固定 `currentAnnual`（今日水準）與 `retirementMultiplier`（退休後水準）描述，IMMEDIATE 適用；可由一般設定或 DebtAccount 匯入產生。本金/利息的計算語意見 [ADR-0033](adr/0033-debt-expense-principal-interest-mode.md)，模式退役見 [ADR-0057](adr/0057-retirement-v1-flat-amount-fields.md)，欄位詳見 [data-structure.md](data-structure.md)。

### 2.4 事件模型（分段設定）

事件支援 `phases[]` 以描述不同人生階段的固定金額與選擇性年成長率；phase 不再宣告計算模式或百分比。

phase 形狀與驗證：

- 欄位：`name`、`startYear`、`endYear`、`amount`（必填）、`growthRate?`（缺省 = 計畫通膨率）。
- 驗證規則：`endYear >= startYear`；`amount` 必填。違反時 schema 直接拒絞。
- **舊版相容**：帶 `year` + `amount` 而無 `phases` 的舊事件，讀取時視為單段 phase（`startYear = endYear = year`）（[ADR-0035](adr/0035-legacy-single-event-compatibility.md)）；新寫入一律使用 `phases[]`。

取捨理由見 [ADR-0034](adr/0034-event-phases-segmented.md) 與 [ADR-0035](adr/0035-legacy-single-event-compatibility.md)。

## 3. 收入導入流程

分錄來源與年化規則見 [ADR-0023](adr/0023-retirement-income-from-entries-only.md) 與 [ADR-0024](adr/0024-retirement-income-import-annualized.md)；過期偵測與更新確認見 [ADR-0025](adr/0025-retirement-sample-window-auto-shift.md)。

導入來源：`Transaction.entries`

樣本窗口：**上一個完整年度**（`lastFullYear = 當前年份 - 1`）

步驟：

1. 查詢 `lastFullYear` 整年的 `transactions`（1月1日～12月31日）
2. 展開每筆 `entries`
3. 篩選 `ledgerCode` 以 `income:` 開頭的分錄
4. 依 `ledgerCode` 分組後加總 `(credit - debit)`
5. 計算年化金額並建立對應 `incomeStream`

輸出欄位與 metadata 對應見 [data-structure.md](data-structure.md)；相關取捨理由見 [ADR-0023](adr/0023-retirement-income-from-entries-only.md) 與 [ADR-0024](adr/0024-retirement-income-import-annualized.md)。

過期偵測與批次更新依 [ADR-0025](adr/0025-retirement-sample-window-auto-shift.md) 執行：頁面顯示 banner，使用者確認後才批次更新。v2 收入層級的 `autoUpdate` 旗標已移除（issue #133）：計畫層級 Auto Update 是唯一開關，同步目標為帶有匯入統計（`calculatedFrom.ledgerCode` + `sampleYear`）的收入流。

## 3.5 期初餘額與重算流程

- 投影期初餘額不是手動輸入的獨立資料：取自最近已關帳期間的 BALANCE_SHEET 報表淨資產（資產總計 − 負債總計），與 Dashboard 錨定共用同一條計算路徑（見 [financial_report.md](financial_report.md) 第 4 節；取捨理由見 [ADR-0053](adr/0053-dashboard-report-anchored.md) 與 [ADR-0057](adr/0057-retirement-v1-flat-amount-fields.md)）。
- 解析錨點：依 `yearMonth` 排序 persisted reports，取最新且期間狀態為 CLOSED 的月份；無已關帳期間時無法重算，必須先完成月度關帳。
- 期初淨資產與錨定月份存入 summary（`startingNetWorth` / `anchorYearMonth`），讓輸出可標注來源期間。

## 4. 債務還款導入流程

啟用帳戶範圍與本金/利息模式分別見 [ADR-0032](adr/0032-debt-import-active-only.md) 與 [ADR-0033](adr/0033-debt-expense-principal-interest-mode.md)。

導入來源：`DebtAccount` + `DebtSnapshot`

步驟：

1. 掃描所有 `isActive=true` 的 DebtAccount
2. 每個 DebtAccount 建立一筆 `type=debt_payment` 的退休支出類別
3. 讀取 DebtAccount 的 `name`、`monthlyPayment`、`startDate/endDate`
4. 讀取最近 12 個月 DebtSnapshot，彙總 `totalPaid` 與 `interestPaid`
5. 建立固定支出項目並寫入 `expenseCategories`

`includesPrincipal` 與 `interestOnly` 的計算規則見本節上方；取捨理由見 [ADR-0033](adr/0033-debt-expense-principal-interest-mode.md)。

## 5. Repository 行為

存放庫與 Use Case 的規則集中在下表，取捨理由見各自 ADR：

| 行為                          | 規則                                                                                                                                                                                         | 取捨理由                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 摘要查詢避免 N+1              | `getPlanSummaries` 只讀計畫主文件的快取摘要，與 `getPlan` 分開，不為每個計畫讀子集合                                                                                                         | [ADR-0029](adr/0029-plan-summaries-avoid-n-plus-1.md)      |
| income/expense 子集合整批替換 | 整批替換而非逐筆 diff                                                                                                                                                                        | [ADR-0030](adr/0030-retirement-update-batch-replace.md)    |
| 刪除順序（歷史；已原子化）    | 子集合先行、主文件最後                                                                                                                                                                       | [ADR-0031](adr/0031-retirement-delete-order.md)            |
| active plan 唯一性            | 同一 household 至多一筆 `isActive=true`                                                                                                                                                      | [ADR-0036](adr/0036-single-active-retirement-plan.md)      |
| 複製後預設非啟用              | 新計畫 `isActive=false`                                                                                                                                                                      | [ADR-0037](adr/0037-retirement-plan-duplicate-inactive.md) |
| 寫入原子邊界、上限與併發      | create/update/delete/duplicate 全在單一 transaction 內；preflight（schema 驗證）在 transaction 外先做；單次寫入上限 400 筆，超過回 `PLAN_TOO_LARGE`；transaction 失敗回 `TRANSACTION_FAILED` | [ADR-0040](adr/0040-retirement-plan-atomic-writes.md)      |

目前對應的主要操作包括 `getPlan/getPlans`、`getPlanSummaries`、`createPlan`、`updatePlan`、`deletePlan`、`setOnlyActivePlan` 與 `DuplicateRetirementPlanUseCase`；create/update/delete/duplicate 的寫入一律走 [ADR-0040](adr/0040-retirement-plan-atomic-writes.md) 的單一 transaction 邊界。

## 6. UI 操作

- 收入頁面提供「Import from Ledger」按鈕（上一完整年度匯入行為不變）。
- 支出頁面提供「匯入債務還款」與「Import from Ledger」按鈕。
- 計畫清單頁以系統表格呈現：欄位為 Name、Retirement Age、Final Net Worth、Status；點擊列進入計畫詳情，Duplicate 為列尾圖示動作，New Plan 留在頁首；未重新計算的計畫 Final Net Worth 顯示「—」（無 fallback 值）。
- Projection 摘要為快取：Recalculate 時重新推導 netWorthAtRetirement（退休年期初淨資產）與 finalNetWorth（投影期末淨資產），不使用遷移腳本。
- 事件頁為分段編輯：可新增多個 phase，每段設定 Start/End Year 與金額（必填），Growth Rate 留空代表隨計畫通膨。
- 收入頁每筆收入只有一組金額欄位：目前年金額（匯入時唯讀帶入；null = 情境專用流，顯示「—」帶 Import from Ledger 提示，退休前貢獻 0）與退休年金額（可編輯）。
- 收入對話框為 v2 形狀（issue #133）：Type、唯讀 Current Annual、可編輯 Retirement Annual、Growth（Advanced 展開明確成長率）、Start/End Year 與 Lifelong 收進 Advanced；無 Source 選擇器、Ledger Code、Sample Year、收入層級 Auto Update、試算預覽與連動退休年 Badge（計畫層級 Auto Update 是唯一開關）。
- 支出對話框以 Duration 顯示期間：未設定 End Year 即 Lifelong，設定後顯示 Until {endYear}；Debt Payment 的 End Year 保留在主表單。Start/End Year 收進 Advanced 展開區（Start Year 預設當前年度，無 2100 預設值）。
- 支出成長率預設跟隨計畫通膨並顯示「Using plan inflation: {rate}%」，Advanced 展開後才能輸入明確成長率（留空 = 計畫通膨，0 = 明確 0%）；目前年支出一般支出可編輯，Debt 匯入值為系統推導唯讀，退休後費用比例（%）維持必填。
- Projection Results：
  - 圖表中 `Savings` 使用柱狀圖並綁定右側縱軸。
  - 明細表可逐年展開，查看當年每一筆收入明細與支出明細。
  - 明細表額外顯示 `投資收益` 欄位（與 `收入` 分開）。
  - Mobile（<md）不使用橫向捲動表格（issue #138）：每年為 compact row，Year 與 Savings（收盤淨資產）固定顯示，其餘欄位（Age、Status、Income、Expense、投資收益、Net）與收支明細在展開區，閱讀順序與桌面一致；md+ 維持系統表格。
- 收入匯入結果以 `incomeCategory` 對齊：
  - 已存在相同 `incomeCategory`：更新既有項目（保留原 id）
  - 不存在：新增項目
- 債務匯入結果以 `sourceDebtAccountId` 對齊：
  - 已存在相同 `sourceDebtAccountId`：更新既有項目（保留原 id）
  - 不存在：新增項目
- 退休詳情頁為單頁 Scenario Workspace（2026-09-20 #120）：固定閱讀順序為「投影輸出在上、假設與輸入在下」（Output first → Input later）——輸出區依序 Overview / Results、Current Financial State、Projected Net Worth、Cash Flow Projection，輸入區依序 Scenario Assumptions、Income、Living Expenses、Life Events；無 Tabs，各區塊為可收合 section（共用 accordion primitive），全 viewport 適用。

## 7. 驗證重點

驗證應由 domain schema 與相關 ADR 驅動：收入金額欄位與支出攤平見 [ADR-0057](adr/0057-retirement-v1-flat-amount-fields.md)，事件格式與相容性見 [ADR-0034](adr/0034-event-phases-segmented.md)／[ADR-0035](adr/0035-legacy-single-event-compatibility.md)，債務匯入見 [ADR-0032](adr/0032-debt-import-active-only.md)／[ADR-0033](adr/0033-debt-expense-principal-interest-mode.md)，計畫生命週期見 [ADR-0036](adr/0036-single-active-retirement-plan.md)／[ADR-0037](adr/0037-retirement-plan-duplicate-inactive.md)。

匯入測試仍應覆蓋收入只取 `income:*`、使用 `(credit - debit)`、保留來源 metadata，以及目標年度沒有資料時保留原金額並留下警告等現行實作行為。
