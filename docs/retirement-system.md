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

- **同一 household 僅允許一筆 `isActive=true`**，由 create/update transaction 內的 active fan-out 原子維護（[ADR-0036](adr/0036-single-active-retirement-plan.md)、[ADR-0040](adr/0040-retirement-plan-atomic-writes.md)）。
- **新建計畫預設狀態**：household 尚無計畫時，首個建立的計畫為 `isActive=true`；之後建立的計畫一律 `isActive=false`，不自動取代現有 active。使用者可在清單頁將任一非 active 計畫設為 active，此時 fan-out 會原子地把其他計畫降為非 active（issue #264）。
- **複製計畫**：完整複製子集合與事件，但新計畫預設 `isActive=false`，不昨接釋放原 active（[ADR-0037](adr/0037-retirement-plan-duplicate-inactive.md)）。
- 計畫不存在時操作回傳 `PLAN_NOT_FOUND`。

### 2.2 收入流子集合

路徑：`households/{householdId}/retirement_plans/{planId}/incomeStreams/{incomeStreamId}`

收入流以會計科目、收入類型、目前/退休兩個金額欄位與來源統計描述；v1 不再有計算模式（見 [ADR-0057](adr/0057-retirement-v1-flat-amount-fields.md)），v2 再移除 `importedFrom` / `autoUpdate` / `startYearMode` / `endYearMode`（見 issue #133）：`currentAnnual` 為 `number | null`，年份連動由遷移腳本解析為具體年份。分錄來源、樣本年度與過期更新見 [ADR-0023](adr/0023-retirement-income-from-entries-only.md) 至 [ADR-0025](adr/0025-retirement-sample-window-auto-shift.md)。欄位詳見 [data-structure.md](data-structure.md)。

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
| 新建計畫預設狀態              | household 首個計畫 `isActive=true`，之後建立的計畫 `isActive=false`；清單頁可手動將非 active 計畫設為 active                                                                                 | issue #264                                                 |
| 複製後預設非啟用              | 新計畫 `isActive=false`                                                                                                                                                                      | [ADR-0037](adr/0037-retirement-plan-duplicate-inactive.md) |
| 寫入原子邊界、上限與併發      | create/update/delete/duplicate 全在單一 transaction 內；preflight（schema 驗證）在 transaction 外先做；單次寫入上限 400 筆，超過回 `PLAN_TOO_LARGE`；transaction 失敗回 `TRANSACTION_FAILED` | [ADR-0040](adr/0040-retirement-plan-atomic-writes.md)      |

目前對應的主要操作包括 `getPlan/getPlans`、`getPlanSummaries`、`countChildren`、`createPlanAtomically`、`updatePlanAtomically`、`deletePlanAtomically` 與 `DuplicateRetirementPlanUseCase`；create/update/delete/duplicate 的寫入一律走 [ADR-0040](adr/0040-retirement-plan-atomic-writes.md) 的單一 transaction 邊界。

## 6. UI 操作

- Plan Setup 的 **Financial Baseline** 區域合併原 Income 與 Living Expenses，作為 ledger 來源的管理視圖（spec #301 §4）。列一律由 **Import from Ledger**／**匯入債務還款**產生，**沒有手動新增**；沒有匯入來源（`currentAnnual` 為空）的舊列保留但唯讀（無編輯動作，仍可刪除）。表格為六欄：名稱／資料來源（`ledgerCode`／`incomeCategory`／`sourceDebtAccountId`）／基準年金額（唯讀，由匯入推導）／成長率（表格顯示推導值，於側邊編輯器 Advanced 編輯）／結束條件（§2.2 推導標籤）／動作。桌面用系統 `DataTable`、行動版用 `MobileDataList`／`MobileExpandableRow`。篩選只用 `FilterStrip`（全部／收入／支出／債務），不做搜尋；Import 動作置於區域工具列，空狀態主要 CTA 亦指向 Import from Ledger。區域具備空／載入／錯誤三態。
- 基準列的刪除以 **toast＋Undo** 完成（單一 Undo 槽、逾時 6 秒，spec #301 §2.4），不再使用確認模態；Undo 以補償性整批取代還原先前的集合。
- 計畫清單頁以系統表格呈現：欄位為 Name、Retirement Age、Final Net Worth、Status；active 計畫置頂（其餘維持 repository 的 updatedAt 由新到舊），並以列左緣品牌色條與文字狀態徽章（使用中／未使用）凸顯——顏色只是輔助，不可作為唯一訊號。點擊列進入計畫詳情，Duplicate 與 Set as active（僅非 active 計畫）為列尾圖示動作，New Plan 留在頁首；未重新計算的計畫 Final Net Worth 顯示「—」（無 fallback 值）。空／載入／錯誤三態沿用共用元件（EmptyState／Skeleton／inline Alert + 重試）。
- Projection 摘要為快取：Recalculate 時重新推導 netWorthAtRetirement（退休年期初淨資產）與 finalNetWorth（投影期末淨資產），不使用遷移腳本。
- 事件頁為分段編輯：可新增多個 phase，每段設定 Start/End Year 與金額（必填）、可選 Growth Rate（留空代表隨計畫通膨）；phase 以 repeater 編輯（`md` 以上為欄位對齊的單列、行動版為兩欄堆疊區塊，不橫向捲動），各欄位共用系統表單欄位與樣式。
- 事件清單列顯示該事件的**終身費用總和**（每個 phase 逐年以自身成長率或計畫通膨成長後加總），並在金額下方註記 phase 數量（僅分段事件）；收入事件以 `+`、支出事件以 `-` 標示。
- 收入與支出列以**共用側邊編輯器**編輯（取代舊對話框，spec #301 §2.1）：桌面為右側面板、行動版為全螢幕 bottom sheet，重用 `ui/sheet` + `DrawerPanel`（不新建 SidePanel）；明示 `Save`／`Cancel`（對齊整批替換 ADR-0030／0040），開啟時焦點進首欄、關閉歸還觸發列，未存變更以 `useConfirm` 攔截關閉，存檔成功給 toast（無 Undo）。
- 側邊編輯器為單一共用元件加兩小分支：Type（收入可選類型／支出隱藏）與 Debt（隱藏結束條件、`endYear` 唯讀、隱藏匯入來源）。收入目前年金額為匯入推導唯讀、支出目前年支出可編輯（Debt 匯入值唯讀）；成長率收在 Advanced 展開區，與結束條件同一個側欄。
- **結束條件語意**（收入流與支出類別共用，spec #301 §2.2）：編輯時擇一（退休時結束／指定年齡 N／指定年份 Y／持續至預期壽命），儲存時塌縮為具體 `endYear`（`lifelong = false`）或 `lifelong = true` 並清除 `endYear`；`startYear` 不帶語意。預設 Salary → 退休時結束，Pension／Rent／Other 與一般生活費 → 持續至預期壽命；Debt Payment 不屬四語意（`endYear` 由匯入）。讀取既有資料保守回推語意標籤（純函式即時推導）：`lifelong` → 持續至預期壽命、`endYear === birthYear + retirementAge` → 退休時結束、其餘 → 指定年份；「指定年齡」不回推。
- **退休後水準退出 UI**（spec #301 §2.3）：`retirementAnnual` 與 `retirementMultiplier` 不再顯示或輸入（schema 與架構不變；存檔時保留既有值，新支出預設 100%）。
- 支出成長率留空代表隨計畫通膨並顯示「Using plan inflation: {rate}%」，Advanced 展開後才能輸入明確成長率（0 = 明確 0%）。
- Projection Results：
  - 現金流圖以共用 `ComposedChart` 呈現：收入帶與投資報酬帶**堆疊**在零以上（投資報酬帶畫在收入帶之上，值為收入＋投資報酬，`baselineValues` 即收入線）、支出帶在零以下，各帶為單色資料歸屬漸層；再加上淨現金流線（primary，左軸）與淨資產線（`savings`，右軸，`asset` 藍，逐年遞增）；淨資產即投影期末餘額，與其他序列同源。圖例與 tooltip 皆逐序列列出收入／投資報酬／支出／淨現金流／淨資產。
  - Overview 另有獨立的淨資產軌跡圖（單一淨資產面積線，標出退休年與歸零線）。
  - 明細表走系統 data-table（桌面）與 `MobileExpandableRow`（行動版），逐年以列展開顯示當年收入明細與支出明細。
  - 明細表額外顯示 `投資收益` 欄位（與 `收入` 分開）。
  - Mobile（<md）不使用橫向捲動表格（issue #138）：每年為 compact row，Year 與 Savings（收盤淨資產）固定顯示，其餘欄位（Age、Status、Income、Expense、投資收益、Net）與收支明細在展開區，閱讀順序與桌面一致；md+ 維持系統表格。
- **匯入行為（spec #301 §4.3）**：Import 只引入／更新列、**永不重算**（重算只由 Recalculate 觸發）。重新匯入以來源鍵對齊——收入用 `incomeCategory`（回退 `calculatedFrom.ledgerCode`）、一般支出用 `expenseCategory`、債務還款用 `sourceDebtAccountId`：
  - 已存在相同來源鍵：**保留原 id**，只覆寫**基準年金額**與來源統計（`calculatedFrom`）；債務還款的 `endYear` 亦跟隨匯入（不屬四語意）。**使用者假設（`growthRate`、結束條件 `endYear`／`lifelong`、名稱等可編輯欄位）一律保留**。
  - 來源不存在：新增列（沿用匯入產生的 id）。
  - **來源已不存在的既有列不刪除**，僅於匯入後提示「N 列未對應到來源」（沒有來源鍵的舊列不計入）。
- 匯入成功給成功 toast（spec #301 §2.4）；**初次建立＝空狀態＋主要 CTA「Import from Ledger」，不自動建立任何預設列**。
- 退休詳情頁為單頁 Scenario Workspace（2026-09-20 #120；2026-10 改為分頁，issue #264）：頂部分為三個底線式 Tabs，全 viewport 適用；行動版分頁列可橫向捲動（不堆疊）。
  - **Overview**：Outcome（退休時資產／最低資產年份／是否破產，以 MetricGroup 排版非卡片）、Current Financial State、淨資產軌跡圖、關鍵風險（退休年／破產年／最低資產年／預期壽命終點，皆由既有資料直接列出）。
  - **Projection**：現金流投影圖與年度明細。
  - **Plan Setup**：Scenario Assumptions、Financial Baseline、Life Events。
  - Scenario Assumptions 以唯讀摘要呈現五格指標（目前年齡／退休年齡／預期壽命／通膨率／投資報酬率），不另有 Current Year／Birth Year 欄位；推導年份以括註附在年齡欄位旁（例：`65（2045）`）。按 `Edit` 就地在區塊內展開編輯表單，分「人生時程」與「財務假設」兩群，並有明示 `Save`／`Cancel`。順序驗證為退休年齡 > 目前年齡、預期壽命 > 退休年齡。年齡與年份以 `birthYear` 為唯一換算基礎：`birthYear` 為不變錨，`currentYear` 於存檔時以「今天」覆寫，目前年齡為推導顯示值（由基準年份減出生年），編輯目前年齡即重新錨定 `birthYear`。
  - 桌面切換分頁會卸載未顯示的分頁（本地編輯狀態不保留）；無投影結果時，Overview 與 Projection 顯示單一空狀態（前往每月關帳）。

## 7. 驗證重點

驗證應由 domain schema 與相關 ADR 驅動：收入金額欄位與支出攤平見 [ADR-0057](adr/0057-retirement-v1-flat-amount-fields.md)，事件格式與相容性見 [ADR-0034](adr/0034-event-phases-segmented.md)／[ADR-0035](adr/0035-legacy-single-event-compatibility.md)，債務匯入見 [ADR-0032](adr/0032-debt-import-active-only.md)／[ADR-0033](adr/0033-debt-expense-principal-interest-mode.md)，計畫生命週期見 [ADR-0036](adr/0036-single-active-retirement-plan.md)／[ADR-0037](adr/0037-retirement-plan-duplicate-inactive.md)。

匯入測試仍應覆蓋收入只取 `income:*`、使用 `(credit - debit)`、保留來源 metadata，以及目標年度沒有資料時保留原金額並留下警告等現行實作行為。
