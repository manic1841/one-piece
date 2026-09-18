# 03 — Ledger & Accounting

## Ledger Prefix
System-fixed top-level classes:
- `asset`
- `liability`
- `equity`
- `income`
- `expense`

## System Ledger Codes
### Asset
- `asset:cash`
- `asset:investment`
- `asset:property`

### Liability
- `liability:loan`
- `liability:mortgage`

### Equity
- `equity:capital`

### Income
- `income:salary`
- `income:bonus`
- `income:investment`
- `income:refund`
- `income:other`

### Expense
- `expense:food`
- `expense:transportation`
- `expense:shopping`
- `expense:entertainment`
- `expense:living`
- `expense:housing`
- `expense:vehicle`
- `expense:healthcare`
- `expense:education`
- `expense:social`
- `expense:family`
- `expense:rent`
- `expense:loan_interest`
- `expense:mortgage_interest`
- `expense:insurance`
- `expense:tax`
- `expense:other`

## User-defined third level
Users may define a child code under an allowed system category.
Example:
`asset:property:apartment`

Do not allow arbitrary top-level prefixes from users.

> **S2 conformance note（2026-09-18）**：28 個系統碼已逐項比對與實作 `LEDGER_CODES` 一致。三層碼的 domain 契約已支援（`CustomLedgerCodeCreateSchema.code` 自由字串、REAL_ESTATE_BUY/SELL 已有 `debitUserSelect + allowedDebitPrefix: 'asset:property'`），缺的是建立三層碼的 UI 入口（`LedgerCodeSettings` 目前只能建二層碼），排 S4 UI/IA session 一併驗證選單的 allowedPrefix 過濾。

## Intent mapping
Each Intent Mapping defines:
- intent
- type
- debitLedgerCode
- creditLedgerCode
- optional user selection for Debit/Credit
- allowed prefix for selectable code

Examples:
```text
FOOD
DR expense:food
CR asset:cash

SALARY
DR asset:cash
CR income:salary

SECURITY_BUY
DR asset:investment
CR asset:cash

SECURITY_SELL
DR asset:cash
CR asset:investment

REAL_ESTATE_BUY
DR asset:property:* (user selectable)
CR asset:cash

REAL_ESTATE_SELL
DR asset:cash
CR asset:property:* (user selectable)

LOAN_BORROW
DR asset:cash
CR liability:loan

LOAN_REPAYMENT
DR liability:loan
CR asset:cash

SHAREHOLDER_FINANCING
DR asset:cash
CR equity:capital

DIVIDEND_PAYOUT
DR equity:capital
CR asset:cash
```

## Removed intent
`TRANSFER_GENERIC` / TRANSFER is removed. ADJUSTMENT is also removed.

## Accounting UX rule
Users normally see Intent Type and human-readable names. Debit/Credit and Ledger Codes are hidden from normal entry UI and available in accounting/detail views when needed.
