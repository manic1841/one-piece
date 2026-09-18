# 05 — Monthly Close

> **S3 conformance note (2026-09-18):** Stage 02 (Transaction Validation) is implemented end to end: `validateMonthTransactions` (domain) batch-checks entries, balance, intent mapping, amount, and ledger codes; `ValidateMonthTransactionsUseCase` adds allocation-sum and project-link checks and produces evidence only. The UI exposes the step with issue evidence. Financing intents (SHAREHOLDER_FINANCING / DIVIDEND_PAYOUT) are entered inside the SECURITIES_TRADE stage and create transactions with ledger codes resolved from the intent mapping (single source). Each stage action now lives in a standalone use case under `src/application/monthly_close/use_cases/`.

> **S1 conformance note (2026-09-18):** The implemented canonical stage model has 9 stages (`CLOSE_STAGE_IDS`): ACCOUNT_BALANCE, TRANSACTION_VALIDATION, SECURITIES_TRADE, PORTFOLIO_CASH_FLOW, PROJECT_SETTLEMENT, DEBT_REPAYMENT, COMPLETENESS_CHECK, FINANCIAL_REPORTS, CLOSE_PERIOD. Stage order is UI guidance only; the system does not enforce it (ADR-0052). Stage 02 below was renamed from "Ledger" to "Transaction Validation" per CONTEXT.md (Ledger is an avoid-term). "Investment & Financing" maps to SECURITIES_TRADE plus financing intents inside the same close workflow. Stage id mapping: 01→ACCOUNT_BALANCE, 02→TRANSACTION_VALIDATION, 03→DEBT_REPAYMENT, 04→SECURITIES_TRADE (+ financing), 05→FINANCIAL_REPORTS (Project Snapshot is the PROJECT_SETTLEMENT stage product), 06→CLOSE_PERIOD. The implementation additionally has PORTFOLIO_CASH_FLOW and COMPLETENESS_CHECK stages with no counterpart in this spec.

## Purpose
Close one financial period by collecting month-end state, validating accounting events, reviewing debt, recording investment/financing transactions, generating reports, reconciling differences, and explicitly closing the period.

## Workflow
```text
01 ACCOUNT BALANCE              → ACCOUNT_BALANCE
        ↓
02 TRANSACTION VALIDATION       → TRANSACTION_VALIDATION
        ↓
03 DEBT                         → DEBT_REPAYMENT
        ↓
04 INVESTMENT & FINANCING       → SECURITIES_TRADE (+ financing intents)
        ↓
05 REPORTS                      → FINANCIAL_REPORTS
        ↓
06 REVIEW & CLOSE               → CLOSE_PERIOD
```

## 01 Account Balance
For Cash/Bank:
- Previous Balance
- Ending Balance
- Foreign Amount and Exchange Rate for foreign currency
- System-calculated TWD Value
- Status

For Securities:
- Import previous month holdings
- Edit current holdings
- System calculates Market Value
- Confirm

All accounts are handled in one Close workspace. Account Detail is optional drill-down, not required to complete Close.

> S1: the close-workflow confirmation input currently accepts `{accountId, amount}` (base-currency) and idempotently writes account snapshots via batchRecordSnapshotsUseCase. Foreign-amount/exchange-rate wiring into the close input is deferred to S2/S3 (fields already exist on the account schema). Per ADR-0052, snapshots are created only for accounts with input; no zero-value fabrication.

## 02 Transaction Validation
Validate current-month Transaction records:
- Intent mapping exists
- Amount is valid
- Allocation totals 100% when present
- Project link is valid when present
- Ledger codes are valid

> S1 (decision Q4a: adopt as a new stage; Q5: stage id `TRANSACTION_VALIDATION`). This stage is a close-time batch validation step (new use case + UI step, landed in S3). Existing write-time validation at the ledger boundary stays. The previous stage name "Ledger" was an avoid-term per CONTEXT.md; the canonical term is Transaction (交易).

## 03 Debt
For every active Debt:
- System Calculation
- User Review
- Edit if needed
- Confirm

Validate optional Project assignment.

> S1 (decision Q4c): the UI completes System Calculation → User Review → Edit inside the close workspace WITHOUT writing; the write remains a single confirm that submits the repayments array with idempotency keys (createDebtPaymentUseCase + settleDebtAccountsUseCase). This is not the rejected two-phase write (ADR-0052): no data exists before confirm, so there is no "stage PENDING but data exists" intermediate state. Discipline: the UI preview must call the same domain calculator (debtPaymentCalculator.ts) as the write path; no second calculation path in the UI layer. Created repayments remain non-editable (changed amount = new idempotency key = new transaction, M1).

## 04 Investment & Financing
Create Transaction records from Monthly Close using INVESTMENT or FINANCING Intent Types.
These are not separate entities.
Each can optionally link one Project.

No data is required if there are no activities.

> S1 (decision Q4d: B - adopt per spec). The SECURITIES_TRADE close-workflow input is extended into an Investment & Financing input: SECURITY_BUY/SELL transactions as today, plus SHAREHOLDER_FINANCING (Dr asset:cash / Cr equity:capital) and DIVIDEND_PAYOUT (Dr equity:capital / Cr asset:cash) transaction creation. The intents already exist in the implementation's intent mapping (including project cash-flow direction); the close workflow lacks an input block for them. Landed in S3 (workflow input schema + UI + tests).

## 05 Reports
Generate and validate:
- Balance Sheet
- Income Statement
- Cash Flow
- Project Snapshot

Also compare Account Balance against Ledger Cash and record the difference.

> S1: the implementation generates the three formal statements in FINANCIAL_REPORTS (generateFinancialReportsUseCase); the Project Snapshot is the PROJECT_SETTLEMENT stage product (settleProjectsUseCase), so all four outputs exist across the close workflow. The Account-Balance-vs-Ledger-Cash comparison exists as the report-level cash adjustment (reportCalculations.ts: actualBalance - endingBalance) per ADR-0020; a decision field (PENDING|ACCEPT|REVIEW) is NOT adopted in S1 - see S3 scope in issue #118.

## 06 Review & Close
Show final summary, unresolved exceptions, report status, and reconciliation decisions.
Final Close requires explicit user confirmation.

> S1: CLOSE_PERIOD's only hard gate today is all three reports persisted (isPersisted). The unresolved-exceptions list and reconciliation-decisions display are UI work deferred to S4 (issue #119).

## Backward editing
Users may go back to a previous completed step.
When data changes:
1. The changed step remains/returns to review as appropriate.
2. All downstream derived results are invalidated.
3. Downstream validation/regeneration must be performed again.
4. Close cannot complete until required downstream work is valid.

Example: changing Account Balance invalidates affected later validation and report results.

## Closed period modification
```text
CLOSED
  ↓ source data modified
IN PROGRESS + NEEDS REVIEW
  ↓ revalidate / regenerate
READY TO CLOSE
  ↓ explicit close
CLOSED
```
No version history is retained. Existing values are overwritten, while NEEDS REVIEW remains the routing mechanism.
