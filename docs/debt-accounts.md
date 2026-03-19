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

## 5. 每月還款試算

公式（等額還款）位於 `src/utils/loanCalculator.ts`：

```
r = interestRate / 100 / 12
n = 月份差（startDate → endDate）
monthlyPayment = P × r × (1+r)^n / ((1+r)^n - 1)

interestRate = 0：monthlyPayment = P / n
```

---

## 6. 路由

`/debt` → `DebtListPage`（在受保護的 Layout 內）

---

## 7. 相關檔案

| 層 | 路徑 |
|---|---|
| Page | `src/ui/features/debt/pages/DebtListPage.tsx` |

---

## 5. 還款紀錄與快照邏輯 (DEBT_PAYMENT)

當使用者透過「新增交易 > 還款」進行操作時：

1. **Transaction 建立**：
   - `intentType` 為 `DEBT_PAYMENT`。
   - 記錄 `debtAccountId`。
   - 自動分錄：
     - Dr. {LiabilityAccount} (本金)
     - Dr. expense:interest (利息)
     - Cr. asset:cash (總額)

2. **DebtSnapshot 自動產生**：
   - 文件 ID 為 `YYYY-MM`。
   - 同月內若有多次還款，則採累加方式更新 `principalPaid` / `interestPaid` / `totalPaid`。
   - `closingBalance` 依據 `openingBalance` (前一月快照結尾或帳戶即時本金) 扣除累計本金計算。

3. **帳戶餘額同步**：
   - 交易完成後，`DebtAccount.currentBalance` 會同步更新為快照的 `closingBalance`。

---

## 6. 路由

`/debt` → `DebtListPage`（在受保護的 Layout 內）

---

## 7. 相關檔案

| 層 | 路徑 |
|---|---|
| Domain | `src/domains/debt/schemas.ts` |
| Utility | `src/utils/loanCalculator.ts` |
| Calculator (Split) | `src/domains/debt/debtPaymentCalculator.ts` |
| Repository | `src/infra/repositories/debtAccountRepository.ts` |
| Repository (Snapshot) | `src/infra/repositories/debtSnapshotRepository.ts` |
| Use Cases | `src/application/debt/use_cases/` |
| LedgerCode Init | `src/application/ledger/use_cases/initDebtLedgerCodesUseCase.ts` |
| Hooks | `src/ui/features/debt/hooks/` |
| Components | `src/ui/features/debt/components/DebtAccountForm.tsx`, `DebtPaymentHistory.tsx` |
| Page | `src/ui/features/debt/pages/DebtListPage.tsx` |
