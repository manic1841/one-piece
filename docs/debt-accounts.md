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
checkHasPayments(id)
  有 LIABILITY_PAYMENT 記錄 → deactivate（isActive: false）
  無記錄                   → hard delete（連同建立時的 LIABILITY_BORROW 一起刪除）
```

目前實作依 `transactions` 的付款意圖與 `ledgerCodes array-contains linkedLedgerCode` 查詢。

> 注意：目前 repository 的付款查詢仍使用 legacy `LIABILITY_PAYMENT`，而 [ADR-0014](adr/0014-debt-payment-intenttype.md) 定義定期貸款還款使用 `DEBT_PAYMENT`。兩者應在程式碼與決策中進一步統一；本文件不把這個現況誤寫成新的規則。

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

寬限期定義為：`startDate ≤ 今天 < graceEndDate`

實作於 `src/domains/debt/debtPaymentCalculator.ts`：

- `isInGracePeriod(graceEndDate)` — 檢查今天是否在寬限期內

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

| 函數                             | 位置                                           | 目的                           |
| -------------------------------- | ---------------------------------------------- | ------------------------------ |
| `isInGracePeriod()`              | `src/domains/debt/debtPaymentCalculator.ts`    | 判斷是否在寬限期               |
| `calculateGraceMonthlyPayment()` | `src/domains/debt/debtPaymentCalculator.ts`    | 計算寬限期利息                 |
| `calculateLoan()`                | `src/ui/features/debt/utils/loanCalculator.ts` | 試算時包含 `graceEndDate` 參數 |
| `buildDebtPaymentEntries()`      | `src/domains/debt/debtPaymentCalculator.ts`    | 建立分錄時檢查寬限期           |

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

## 7. 債務月結算預覽與警訊

`DebtSettlement` 採用「先預覽、再確認」流程：

1. 使用者選擇 `year` / `month` 後，先執行預覽。
2. 系統逐一檢查啟用中的 `DebtAccount`：

- 當月是否有 `DEBT_PAYMENT` 還款紀錄。
- 當月是否已存在 `Debt Snapshot`。

3. 預覽畫面顯示每個帳戶的：

- 還款筆數與還款總額。
- 快照是否已存在、或本次結算是否會建立快照。

### 無還款警訊規則

- 若某些帳戶在該月沒有還款紀錄，系統必須顯示警訊。
- 這不是阻擋條件：使用者勾選「仍要繼續結算」後，仍可執行結算。
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
