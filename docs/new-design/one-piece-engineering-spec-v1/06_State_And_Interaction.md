# 06 — State & Interaction

> **S3 conformance note (2026-09-18):** Full downstream invalidation is implemented as revalidation-on-evidence-refresh: the monthly close page refreshes stage evidence (including transaction validation issues) when the period state changes; a validation failure now surfaces as a load error instead of failing silently. Stage input dating: securities, financing, and debt repayment entries are dated inside the closing period (YYYY-MM), satisfying the close-input boundary (ADR-0052).

> **S1 conformance note (2026-09-18):** The implemented lifecycle is OPEN → IN_PROGRESS → NEEDS_REVIEW → CLOSED (`FinancialPeriodStatus`), where NEEDS_REVIEW is an enum value carrying `reviewSourceStageId`, matching the spec's "flag" intent but persisted as a status. Step states: stage records persist PENDING|COMPLETED only; the five-glyph step states below are a UI rendering concern (StatusGlyph already implements active/verified/waiting/review/error). The only implemented NEEDS_REVIEW source is the Completeness Check zero-activity anomaly (ADR-0052); the sources listed below are aspirational until S3 decides otherwise. Backward editing and downstream invalidation are partially implemented (reviewSourceStageId + revalidation path); full invalidation semantics are S3 scope.

## Monthly Close lifecycle
```text
OPEN → IN PROGRESS → READY TO CLOSE → CLOSED
```

`NEEDS REVIEW` is a flag, not a separate lifecycle state.

## Step states
- VERIFIED / completed: `✓`
- CURRENT / active: `●`
- WAITING: `○`
- NEEDS REVIEW: `!`
- ERROR: `×`

## State semantics
### OPEN
Period exists but close has not started.

### IN PROGRESS
User is working through Close.

### READY TO CLOSE
All required steps are valid and final review is complete.

### CLOSED
User explicitly closed the period.

## Needs Review sources
- Account discrepancy
- Transaction validation issue
- Debt review/edit
- Investment/Financing issue
- Report reconciliation difference
- Post-close source modification

> S1: "Ledger validation issue" renamed to "Transaction validation issue" per CONTEXT.md (avoid-term Ledger), matching the new TRANSACTION_VALIDATION stage. The implemented NEEDS_REVIEW source is Completeness Check zero-activity anomalies only (ADR-0052); whether additional sources are adopted is S3 scope (issue #118).

## Downstream invalidation
Any change to a step's source data invalidates dependent later results. Re-run only the affected step and its downstream dependencies.

## Interaction patterns
- List row click → Detail
- Add/Edit → Modal or dedicated form
- Review → same workspace, not a separate editing system
- Long report generation → terminal-style progress
- Destructive/final close → explicit confirmation dialog
- Mobile dialogs may use Bottom Sheet when appropriate
- Loading/empty/error states are explicit
