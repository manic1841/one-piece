# 退休系統設計與資料流

本文描述退休系統的核心資料模型、收入導入流程、計算流程與維護規則。

本文件是退休功能的流程與實作參考，不重新定義資料模型的決策約束。收入來源與匯入窗口見 [ADR-0023](adr/0023-retirement-income-from-entries-only.md) 至 [ADR-0025](adr/0025-retirement-sample-window-auto-shift.md)；子集合、計算模式、Repository 行為、事件與計畫生命週期見 [ADR-0026](adr/0026-retirement-plan-subcollections.md) 至 [ADR-0037](adr/0037-retirement-plan-duplicate-inactive.md)。欄位清單見 [data-structure.md](data-structure.md)。

## 1. 系統目標

- 以交易分錄為唯一財務來源，避免重複維護平行收入資料。
- 用可追蹤的收入流 (`incomeStreams`) 支援退休投影。
- 保持 Domain 純邏輯，將資料存取留在 Application/Infra。

## 2. 資料模型

### 2.1 退休計畫主文件

路徑：`households/{householdId}/retirement_plans/{planId}`

主文件保留假設參數、事件、快取摘要與 `isActive`。收入與支出類別由子集合管理；其結構見 [ADR-0026](adr/0026-retirement-plan-subcollections.md)，同一 household 的 active 唯一性見 [ADR-0036](adr/0036-single-active-retirement-plan.md)，複製後的啟用狀態見 [ADR-0037](adr/0037-retirement-plan-duplicate-inactive.md)。

### 2.2 收入流子集合

路徑：`households/{householdId}/retirement_plans/{planId}/incomeStreams/{incomeStreamId}`

收入流以會計科目、收入類型、計算模式、年份連動設定與來源統計描述。三種計算模式的邊界見 [ADR-0027](adr/0027-income-calculation-mode-three-tier.md) 與 [ADR-0028](adr/0028-derived-income-no-independent-growth.md)；分錄來源、樣本年度與過期更新見 [ADR-0023](adr/0023-retirement-income-from-entries-only.md) 至 [ADR-0025](adr/0025-retirement-sample-window-auto-shift.md)。欄位詳見 [data-structure.md](data-structure.md)。

### 2.3 支出類別子集合

路徑：`households/{householdId}/retirement_plans/{planId}/expenseCategories/{expenseCategoryId}`

支出類別可由一般設定或 DebtAccount 匯入產生；本金/利息的計算語意見 [ADR-0033](adr/0033-debt-expense-principal-interest-mode.md)，欄位詳見 [data-structure.md](data-structure.md)。

### 2.4 事件模型（分段設定）

事件支援 `phases[]` 以描述不同人生階段的計算模式。phase 欄位與驗證見 [ADR-0034](adr/0034-event-phases-segmented.md)；舊版 `year` + `amount` 的讀取相容性見 [ADR-0035](adr/0035-legacy-single-event-compatibility.md)。

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

輸出欄位與 metadata 對應見 [data-structure.md](data-structure.md)；決策約束以 [ADR-0023](adr/0023-retirement-income-from-entries-only.md) 與 [ADR-0024](adr/0024-retirement-income-import-annualized.md) 為準。

過期偵測與批次更新依 [ADR-0025](adr/0025-retirement-sample-window-auto-shift.md) 執行：頁面顯示 banner，使用者確認後才批次更新；`autoUpdate=false` 的收入流不納入自動更新。

## 3.5 派生收入計算流程

派生收入的語意與無獨立成長率規則見 [ADR-0028](adr/0028-derived-income-no-independent-growth.md)。計算時先解析基礎收入，再依下式計算：

```
派生收入(年度 Y) = 基礎收入(年度 Y) × 倍數
```

實作支援多層派生，計算順序需先完成基礎收入，再計算依賴它的收入。

## 4. 債務還款導入流程

啟用帳戶範圍與本金/利息模式分別見 [ADR-0032](adr/0032-debt-import-active-only.md) 與 [ADR-0033](adr/0033-debt-expense-principal-interest-mode.md)。

導入來源：`DebtAccount` + `DebtSnapshot`

步驟：

1. 掃描所有 `isActive=true` 的 DebtAccount
2. 每個 DebtAccount 建立一筆 `type=debt_payment` 的退休支出類別
3. 讀取 DebtAccount 的 `name`、`monthlyPayment`、`startDate/endDate`
4. 讀取最近 12 個月 DebtSnapshot，彙總 `totalPaid` 與 `interestPaid`
5. 建立固定支出項目並寫入 `expenseCategories`

`includesPrincipal` 與 `interestOnly` 的計算規則以 [ADR-0033](adr/0033-debt-expense-principal-interest-mode.md) 為準。

## 5. Repository 行為

Repository 與 Use Case 的規則集中在下表，本文不再複述決策理由：

| 行為                          | 權威 ADR                                                   |
| ----------------------------- | ---------------------------------------------------------- |
| 摘要查詢避免 N+1              | [ADR-0029](adr/0029-plan-summaries-avoid-n-plus-1.md)      |
| income/expense 子集合整批替換 | [ADR-0030](adr/0030-retirement-update-batch-replace.md)    |
| 刪除順序                      | [ADR-0031](adr/0031-retirement-delete-order.md)            |
| active plan 唯一性            | [ADR-0036](adr/0036-single-active-retirement-plan.md)      |
| 複製後預設非啟用              | [ADR-0037](adr/0037-retirement-plan-duplicate-inactive.md) |

目前對應的主要操作包括 `getPlan/getPlans`、`getPlanSummaries`、`createPlan`、`updatePlan`、`deletePlan`、`setOnlyActivePlan` 與 `DuplicateRetirementPlanUseCase`。

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

驗證應由 domain schema 與相關 ADR 驅動：收入模式與派生依賴見 [ADR-0027](adr/0027-income-calculation-mode-three-tier.md)／[ADR-0028](adr/0028-derived-income-no-independent-growth.md)，事件格式與相容性見 [ADR-0034](adr/0034-event-phases-segmented.md)／[ADR-0035](adr/0035-legacy-single-event-compatibility.md)，債務匯入見 [ADR-0032](adr/0032-debt-import-active-only.md)／[ADR-0033](adr/0033-debt-expense-principal-interest-mode.md)，計畫生命週期見 [ADR-0036](adr/0036-single-active-retirement-plan.md)／[ADR-0037](adr/0037-retirement-plan-duplicate-inactive.md)。

匯入測試仍應覆蓋收入只取 `income:*`、使用 `(credit - debit)`、保留來源 metadata，以及目標年度沒有資料時保留原金額並留下警告等現行實作行為。
