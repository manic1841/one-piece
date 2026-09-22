# 11 — Project / Portfolio / Debt Details

> **S2 conformance note（2026-09-18）**：Portfolio 欄位與四條約束已完整採用（ADR-0054）：具名 `securitiesAccountId + bankAccountId`、`createPortfolioUseCase` 走 `validatePortfolioConstraints`（存在性 + 分類 + 唯一性）、update 拒改連結；`bankAccountId` 接受 bank 或 cash 類別（ADR-0008，報表層同規則）。舊 `accountIds[]`/`description` 已從 schema 移除，遷移腳本 `scripts/admin/migrate-portfolio-links.ts`。LedgerCode 三層碼 UI 入口未建（domain 已支援三層），目前不處理，追蹤於 GitHub issue #159。

## Project
Core purpose: project financial tracking.

Fields:
- name
- isActive

No Budget.
No Start Date / End Date.

Project financial analysis:
- Income / Expense via Allocation
- Investment / Financing via optional direct Project link
- Debt via optional direct Debt→Project link

Monthly Snapshot is read optimization.

## Portfolio
Fields:
- name
- securitiesAccountId
- bankAccountId

Constraints:
- exactly one Securities Account
- exactly one Bank Account
- both must exist
- each source Account can belong to at most one Portfolio
- links cannot be changed after creation

Value:
`Securities Market Value + Bank Account Ending Balance`

Performance is based on Monthly Close periods and exists as a formal result after a period is Closed.

## Portfolio Return
Return calculation UI should expose:
- Previous Portfolio Value
- Current Portfolio Value
- Investment Cash Flow
- Non-investment Cash Flow
- Calculated Return
- Return Rate

Preserve the product's chosen return model; do not silently replace it with another standard formula.

## Debt
Basic fields:
- Loan Name
- Type
- Loan Amount
- Annual Interest Rate
- Start Date
- End Date
- Grace Period
- Project optional

Monthly Close:
- Calculate Payment / Principal / Interest / Outstanding Balance
- User reviews and can edit
- Confirm

Grace period default: interest-only.
Repayment method currently fixed to equal principal + interest.
