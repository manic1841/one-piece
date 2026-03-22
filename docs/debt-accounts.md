# 債務帳戶功能說明 (Debt Accounts)

## 1. 概述

債務帳戶（DebtAccount）追蹤家庭的負債部位，如房貸、車貸、個人信貸。
提供每月還款試算、還清進度追蹤、與 Project 的關聯。

---

## 2. LedgerCode 初始化策略

系統進入債務管理頁面時，會 lazy init 三筆自訂 LedgerCode（若不存在）：

| LedgerCode | 標籤 |
|---|---|
| `liability:mortgage` | 房貸 |
| `liability:car_loan` | 車貸 |
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
  無記錄                   → hard delete
```

查詢依據：transactions 的 `intentType == 'LIABILITY_PAYMENT'` AND `ledgerCodes array-contains linkedLedgerCode`

---

## 5.5. 寬限期（Grace Period）

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

| 函數 | 位置 | 目的 |
|------|------|------|
| `isInGracePeriod()` | `src/domains/debt/debtPaymentCalculator.ts` | 判斷是否在寬限期 |
| `calculateGraceMonthlyPayment()` | `src/domains/debt/debtPaymentCalculator.ts` | 計算寬限期利息 |
| `calculateLoan()` | `src/ui/features/debt/utils/loanCalculator.ts` | 試算時包含 `graceEndDate` 參數 |
| `buildDebtPaymentEntries()` | `src/domains/debt/debtPaymentCalculator.ts` | 建立分錄時檢查寬限期 |

---

## 7. 路由

`/debt` → `DebtListPage`（在受保護的 Layout 內）

---

## 8. 相關檔案

| 層 | 路徑 |
|---|---|
| Domain | `src/domains/debt/schemas.ts` |
| Utility | `src/ui/features/debt/utils/loanCalculator.ts` |
| Calculator (Split & Grace) | `src/domains/debt/debtPaymentCalculator.ts` |
| Repository | `src/infra/repositories/debtAccountRepository.ts` |
| Repository (Snapshot) | `src/infra/repositories/debtSnapshotRepository.ts` |
| Use Cases | `src/application/debt/use_cases/` |
| LedgerCode Init | `src/application/ledger/use_cases/initDebtLedgerCodesUseCase.ts` |
| Hooks | `src/ui/features/debt/hooks/` |
| Components | `src/ui/features/debt/components/DebtAccountForm.tsx`, `DebtPaymentHistory.tsx` |
| Page | `src/ui/features/debt/pages/DebtListPage.tsx` |
