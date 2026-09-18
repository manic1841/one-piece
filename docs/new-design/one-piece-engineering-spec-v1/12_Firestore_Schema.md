# 12 — Firestore Schema (Implementation Proposal)

This is a proposed persistence shape. Validate it against actual query volume, security rules, transaction semantics, and backend conventions before implementation.

## Collections
```text
accounts/
account_balances/
security_holdings/
transactions/
ledger_codes/
intent_mappings/
debts/
debt_monthly_records/
portfolios/
projects/
project_snapshots/
monthly_closes/
reports/
```

## accounts/{accountId}
- name
- type
- currency
- isActive
- createdAt

## account_balances/{balanceId}
- accountId
- period
- amount / foreignAmount
- exchangeRate?
- twdValue
- createdAt

## security_holdings/{holdingId}
- accountId
- period
- symbol
- name
- cost
- value
- leverage

## transactions/{transactionId}
- date
- period
- intent
- type
- amount

> **S2 conformance note (2026-09-18)**: allocations are a separate Firestore collection, not embedded in transactions. Per ADR-0011, an allocation references its transaction via sourceTransactionId and reallocation replaces the existing allocation.

- allocations[]
- projectId? (for direct single-project Investment/Financing)
- note
- source: DAILY | MONTHLY_CLOSE
- ledger representation

Do not store separate investment_transactions or financing_transactions collections.

## ledger_codes/{codeId}
- code
- prefix
- parentCode
- name
- isSystem
- createdAt

## intent_mappings/{intent}
- intent
- type
- debitLedgerCode
- creditLedgerCode
- debitUserSelect?
- creditUserSelect?
- allowedDebitPrefix?
- allowedCreditPrefix?

## debts/{debtId}
Loan master fields.

## debt_monthly_records/{recordId}
- debtId
- period
- payment
- principal
- interest
- outstandingBalance

## portfolios/{portfolioId}
- name
- securitiesAccountId
- bankAccountId

## projects/{projectId}
- name
- isActive
- createdAt

## project_snapshots/{snapshotId}
- projectId
- period
- incomeByLedgerCode
- expenseByLedgerCode
- netCashFlow
- debtSummary[]

## monthly_closes/{period}
- status
- currentStep
- needsReview
- step states
- createdAt
- updatedAt
- closedAt?

## reports/{reportId}
- period
- type
- status
- generatedAt
- data
- reconciliation

## Persistence principles
- Keep source data separate from derived reports/snapshots.
- Do not duplicate full Account/Debt/Transaction datasets inside Monthly Close.
- Monthly Close stores workflow state and close-specific results/references.
- Avoid treating report data as editable source data.
