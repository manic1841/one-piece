# 債務帳戶功能說明 (Debt Accounts)

## 1. 概述

債務帳戶（DebtAccount）追蹤家庭的負債部位，如房貸、車貸、個人信貸。
提供每月還款試算、還清進度追蹤、與 Project 的關聯。

本文件保留債務功能的表單、試算與操作流程；債務還款意圖、派生餘額、建立時同步入帳與寬限期狀態的決策，以 [ADR-0014](adr/0014-debt-payment-intenttype.md) 至 [ADR-0017](adr/0017-grace-period-derived-not-stored.md) 為準。退休匯入規則以 [ADR-0032](adr/0032-debt-import-active-only.md) 與 [ADR-0033](adr/0033-debt-expense-principal-interest-mode.md) 為準。

---

## 2. LedgerCode 初始化策略

系統進入債務管理頁面時，會 lazy init 三筆自訂 LedgerCode（若不存在）：

| LedgerCode                | 標籤     |
| ------------------------- | -------- |
| `liability:mortgage`      | 房貸     |
| `liability:car_loan`      | 車貸     |
| `liability:personal_loan` | 個人信貸 |

- 使用 `initDebtLedgerCodesUseCase` 執行，idempotent（可重複執行不影響已有資料）
- fire-and-forget：不阻塞 UI 渲染
- 文件路徑：`households/{householdId}/ledgerCodes/{code}`（以 code 為 docId）

---

## 3. `linkedLedgerCode` 自動對應

`type` 與 `linkedLedgerCode` 的對應由 `DEBT_TYPE_LEDGER_CODE` 常數定義（`src/domains/debt/schemas.ts`）。
使用者**不需**手動選擇 `linkedLedgerCode`，由 `createDebtAccountUseCase` / `updateDebtAccountUseCase` 在寫入時自動帶入。

---

## 4. 刪除邏輯（Smart Delete）

`removeDebtAccountUseCase` 自動判斷：

```
有還款歷史或 snapshots → deactivate（isActive: false）
皆無                   → hard delete（連同建立時的 LIABILITY_BORROW 一起刪除）
```

還款歷史採兩層偵測：

1. **Canonical**：`debtAccountId == <此帳戶>` 且 `intentType == DEBT_PAYMENT`。
   以帳戶 ID 精確比對，共用同一 `linkedLedgerCode` 的其他債務帳戶不會互相阻擋。
2. **Legacy fallback**：`intentType == LIABILITY_PAYMENT` 且
   `ledgerCodes array-contains linkedLedgerCode`。此查詢直接讀取原始文件、
   不經 domain schema（`LIABILITY_PAYMENT` 已自 [ADR-0014](adr/0014-debt-payment-intenttype.md)
   從 IntentType 移除），僅作為歷史資料的保守防護；共用 ledger code 可能造成
   誤判為 soft delete，屬可接受的安全方向。

另外，帳戶下存在任何 `DebtSnapshot` 文件也會強制 soft delete，即使沒有付款交易。

- hard delete 會一併刪除與該 DebtAccount 關聯的借款入帳交易，避免留下孤立負債建立紀錄

---

## 5. 建立貸款同步入帳（LIABILITY_BORROW）

新增 DebtAccount 時，系統會同步建立一筆借款入帳交易，確保負債與現金部位一致。

同步建立與原子性是 [ADR-0016](adr/0016-debt-account-creation-liability-borrow-sync.md) 的決策；以下只保留表單欄位與目前交易流程。

### 表單欄位

| 欄位             | 用途                                     | 預設值                |
| ---------------- | ---------------------------------------- | --------------------- |
| 撥款日期         | `LIABILITY_BORROW` 的 `transaction.date` | `startDate`           |
| 撥款說明（選填） | `LIABILITY_BORROW` 的 `description`      | `{貸款名稱} 借款入帳` |

### 建立流程（原子操作）

1. 寫入 `DebtAccount`（含 `graceEndDate`）
2. 同步建立 `LIABILITY_BORROW` Transaction：

```
date:        撥款日期
intentType:  "LIABILITY_BORROW"
description: 撥款說明
projectId:   null
entries: [
  { ledgerCode: "asset:cash",     debit: originalAmount, credit: 0 },
  { ledgerCode: linkedLedgerCode,   debit: 0,              credit: originalAmount },
]
```

3. `DebtAccount.currentBalance` 初始值固定為 `originalAmount`

### 一致性保證

- Step 1 與 Step 2 以 Firestore transaction 實作（原子寫入）
- 任一步驟失敗時，整筆建立會回滾，不會留下孤立 DebtAccount

---

## 5.5. 寬限期（Grace Period）

寬限期狀態不另存 boolean，而由日期動態判斷；決策依據見 [ADR-0017](adr/0017-grace-period-derived-not-stored.md)。本節補充試算、分錄與 UI 的操作細節。

### 欄位

`DebtAccount` 新增可選欄位：

```
graceEndDate: Date | null  // 寬限期結束日期，null 表示無寬限期
```

### 判斷邏輯

寬限期定義為：`startDate ≤ paymentDate < graceEndDate`。起始日包含，結束日不
包含；付款日等於 `graceEndDate` 時走正常還款。完整決策以
[ADR-0017](adr/0017-grace-period-derived-not-stored.md) 與
[ADR-0038](adr/0038-command-atomicity-and-retry-policy.md) 為準。

實作於 `src/domains/debt/debtPaymentCalculator.ts`：

- `isInGracePeriod(startDate, paymentDate, graceEndDate)` — 檢查付款日是否在寬限期內

### 試算邏輯

表單（`DebtAccountForm`）支援有無寬限期的試算：

**無寬限期**：

```
monthlyPayment = P × r × (1+r)^n / ((1+r)^n - 1)
  其中 n = startDate → endDate 的月份差
```

**有寬限期**：

```
graceMonths     = startDate → graceEndDate 的月份差
normalMonths    = graceEndDate → endDate 的月份差

graceMonthlyPayment = originalAmount × (interestRate / 100 / 12)  // 利息專用
monthlyPayment      = originalAmount / normalMonths 的等額還款    // 寬限期後

表單顯示：
  寬限期每月應付（利息）: graceMonthlyPayment
  正式還款每月應付: monthlyPayment
  正式還款月數: normalMonths
```

### 還款邏輯 (DEBT_PAYMENT)

**寬限期間**（判斷邏輯於 `buildDebtPaymentEntries`）：

```
// 只記錄利息，本金不動
Dr. expense:interest     interest
Cr. asset:cash           totalPayment

// 注：closingBalance = openingBalance（本金不減少）

寬限期間的 ordinary `DEBT_PAYMENT` 不接受高於適用利息的金額；這不代表可以
透過一般還款流程提前償還本金。低於適用利息的正付款可記錄為實際支付的利息，
並附上未覆蓋利息的 warning。
```

**寬限期後**（正常還款）：

```
Dr. {linkedLedgerCode}  principal
Dr. expense:interest    interest
Cr. asset:cash          totalPayment

// closingBalance = openingBalance - principal
```

### UI 上的寬限期標示

**DebtListPage 卡片**：

- 如果 `isInGracePeriod = true`，顯示 badge：「寬限期至 YYYY/MM」
- 「每月應付」項目改為「本月應付（利息）」，顯示 `calculateGraceMonthlyPayment(currentBalance, interestRate)`

**DebtAccountForm**：

- 日期區塊新增「寬限期結束日」欄位（選填）
- 試算摘要區塊根據是否有寬限期顯示不同內容
- 每月應還金額標籤改為「正式還款期間的每月應還金額」（有寬限期時）

### 相關函數

| 函數                             | 位置                                           | 目的                                           |
| -------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| `isInGracePeriod()`              | `src/domains/debt/debtPaymentCalculator.ts`    | 判斷是否在寬限期                               |
| `isLoanActiveInMonth()`          | `src/domains/debt/debtPaymentCalculator.ts`    | 判斷借款期間是否涵蓋某月份（記帳完整性檢查用） |
| `calculateGraceMonthlyPayment()` | `src/domains/debt/debtPaymentCalculator.ts`    | 計算寬限期利息                                 |
| `calculateLoan()`                | `src/ui/features/debt/utils/loanCalculator.ts` | 試算時包含 `graceEndDate` 參數                 |
| `buildDebtPaymentEntries()`      | `src/domains/debt/debtPaymentCalculator.ts`    | 建立分錄時檢查寬限期                           |

### 記帳完整性檢查中的債務語意

監看清單（ADR-0048）可監看債務帳戶。結算前檢查以當月 `DEBT_PAYMENT` 交易為準，
**不看** `linkedLedgerCode` 的活動：還債分錄借方正是該負債科目，當月若有新借款
入帳，該科目活動不為零就會掩蓋漏還。

參與檢查的條件：

- `isActive = true`（停用／已結清的債務不參與檢查）
- 借款期間涵蓋目標月份，由 `isLoanActiveInMonth(startDate, endDate, monthStart)`
  以「月份」為粒度判斷：起始月與到期月都算在期間內（到期日 2026-08-31 不涵蓋
  9 月，2026-09-05 仍涵蓋 9 月）
- **寬限期不豁免檢查**。寬限期間的還款仍會產生利息的 `DEBT_PAYMENT` 交易
  （見本節上方），所以該月零筆還款就是漏記的訊號，與 ADR-0017 一致
- 債務文件已不存在時跳過（監看清單可能留有已刪除對象的殘留紀錄）
- 無 `debtAccountId` 的 legacy 還款（`LIABILITY_PAYMENT`，見第 4 節）不計入：
  `debtAccountId` 是 ADR-0014 之後還款交易的正典索引，本檢查只認正典格式；
  誤報方向是請使用者確認，屬可接受

已知偏差：日期比較一律採**本地日期**（`isInGracePeriod()` 亦同）。表單以
`<input type="date">` 建立日期，字串 `2026-09-01` 会被解析成 UTC 午夜，因此在
**UTC 負偏移**的瀏覽器上，本地日期會落到 8/31；若 `startDate` 或 `endDate` 恰好
落在月初 1 日，涵蓋的月份會比預期早一個月。本專案目前沒有跨時區使用的需求，
且此行為與既有債務日期判讀一致，故不另作處理；若要修正，應統一改採 UTC 欄位
或日期字串比較，影響範圍含寬限期判斷。

---

## 5.6. 結清欄位與狀態（Debt Settlement State）

`DebtAccount` 包含下列結清相關欄位：

```
isActive: boolean                   // true=啟用中, false=已結清/停用
closedAt: Date | null | undefined   // 結清日期，結清時寫入
```

`closedAt` 為記錄用途；當帳戶被標記結清時，需同時寫入：

```
DebtAccount.isActive = false
DebtAccount.closedAt = today
```

---

## 5.7. DEBT_PAYMENT 後的結清偵測

`currentBalance` 的來源與派生規則見 [ADR-0015](adr/0015-debt-account-balance-derived.md)。

每次 `DEBT_PAYMENT` 建立成功後，流程為：

```
寫入 DEBT_PAYMENT
  → 重算並更新 DebtAccount.currentBalance
  → 若 currentBalance <= 0
      顯示結清確認對話框
```

Transaction、該月份 DebtSnapshot 與 DebtAccount.currentBalance 必須和付款的
operation record 在同一個 Firestore transaction 內提交；任一寫入失敗時不得
留下部分財務資料。重試與同 key replay 規則以
[ADR-0038](adr/0038-command-atomicity-and-retry-policy.md) 為準。

備註：

- 因尾款四捨五入，`currentBalance` 可能略小於 0。
- 系統直接視為可結清，不額外做負值特例流程。

---

## 5.8. 結清確認對話框

觸發條件：`DEBT_PAYMENT` 成功後，`currentBalance <= 0`。

內容：

- 標題：`{貸款名稱} 已還清`
- 內文：`剩餘本金已為 0，是否將此貸款標記為結清？`
- 按鈕：`確認結清` / `稍後再說`

行為：

- `確認結清`：寫入 `isActive=false`、`closedAt=today`
- `稍後再說`：不修改帳戶，讓使用者可稍後手動結清

---

## 5.9. 手動結清入口

在債務管理頁中，符合以下條件的帳戶會顯示 `標記結清` 按鈕：

```
currentBalance <= 0 && isActive == true
```

手動結清執行邏輯與對話框確認相同：

```
DebtAccount.isActive = false
DebtAccount.closedAt = today
```

---

## 5.10. 結清後 UI 規則

- 債務列表頁：預設只顯示啟用中帳戶，使用者可透過「顯示已結清」切換查看歷史
- Dashboard 債務摘要：僅統計 `isActive=true` 帳戶
- 新增交易的 `DEBT_PAYMENT` 帳戶選單：僅顯示 `isActive=true` 帳戶
- 月初待繳提醒/待繳筆數：僅計算 `isActive=true` 帳戶

---

## 6. 退休系統導入規則（Debt -> Retirement）

只匯入啟用中的債務，以及本金/利息的退休支出模式，分別由 [ADR-0032](adr/0032-debt-import-active-only.md) 與 [ADR-0033](adr/0033-debt-expense-principal-interest-mode.md) 定義；以下保留匯入流程與欄位對應。

退休系統支援「匯入債務還款」：

1. 掃描 `isActive=true` 的 DebtAccount
2. 每個帳戶建立一筆退休 `expenseCategory`（`type = debt_payment`）
3. 欄位來源：
   - `name` <- DebtAccount.name
   - `baseAmount` <- DebtAccount.monthlyPayment \* 12（`includesPrincipal=true`）
   - `startYear/endYear` <- DebtAccount.startDate/endDate
4. 讀取最近 12 個月 DebtSnapshot，寫入 `calculatedFrom` 統計

### 本金與利息策略

匯入支出可用以下旗標描述：

- `includesPrincipal: true`
  - 表示包含本金與利息，預設使用 `monthlyPayment * 12`
- `interestOnly: true`
  - 表示只計利息，使用 DebtSnapshot 的 `interestPaid` 年化值

備註：本金在會計上不是損益費用，但退休現金流模型可依需求納入現金流出；需以上述旗標清楚標記。

## 7. 債務月結算與警訊

債務月結算僅能透過月度關帳流程（`/close` 的 `DEBT_REPAYMENT` 階段）執行，不再有獨立的結算對話框入口。`DEBT_REPAYMENT` 階段確認時一次完成兩件事：

1. 依輸入建立還款交易（`createDebtPaymentUseCase`，含冪等鍵）。
2. 執行 `settleDebtAccountsUseCase`，為當月尚無 `Debt Snapshot` 的啟用中 `DebtAccount` 建立快照（已存在的快照不會重複建立）。

### 無還款警訊規則

- 若某些帳戶在該月沒有還款紀錄，Completeness Check 階段會標記為零活動異常，暫停關帳流程（`NEEDS_REVIEW`）。
- 這不是永久阻擋：使用者確認檢視後重新確認 `COMPLETENESS_CHECK` 階段即可繼續。
- 結算時，無還款帳戶會建立「零還款快照」：
  - `principalPaid = 0`
  - `interestPaid = 0`
  - `totalPaid = 0`
  - `closingBalance = openingBalance`

---

## 7. 路由

`/debt` → `DebtListPage`（在受保護的 Layout 內）

---

## 8. 相關檔案

| 層                         | 路徑                                                                            |
| -------------------------- | ------------------------------------------------------------------------------- |
| Domain                     | `src/domains/debt/schemas.ts`                                                   |
| Utility                    | `src/ui/features/debt/utils/loanCalculator.ts`                                  |
| Calculator (Split & Grace) | `src/domains/debt/debtPaymentCalculator.ts`                                     |
| Repository                 | `src/infra/repositories/debtAccountRepository.ts`                               |
| Repository (Snapshot)      | `src/infra/repositories/debtSnapshotRepository.ts`                              |
| Use Cases                  | `src/application/debt/use_cases/`                                               |
| LedgerCode Init            | `src/application/ledger/use_cases/initDebtLedgerCodesUseCase.ts`                |
| Hooks                      | `src/ui/features/debt/hooks/`                                                   |
| Components                 | `src/ui/features/debt/components/DebtAccountForm.tsx`, `DebtPaymentHistory.tsx` |
| Page                       | `src/ui/features/debt/pages/DebtListPage.tsx`                                   |
