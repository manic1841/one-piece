# Implementation Status

This document is the working checkpoint for agent implementation sessions.
Historical per-issue records live in the GitHub issue tracker; design decisions
live in `docs/adr/`; schema and testing facts live in `docs/data-structure.md`
and `docs/testing.md`. This file only records what is done on the current
branch and what is next.

## Current Checkpoint

### #95 Debt repayment watch-list check

- `checkSettlementCompletenessUseCase` gained its third target type: a watched
  debt account is compared against the month's `DEBT_PAYMENT` transactions
  rather than against activity on its `linkedLedgerCode` (ADR-0048 decision 2).
  A loan advanced in the same month keeps that liability code non-zero and would
  hide a missed repayment, which is exactly the month worth flagging.
- Participation rule: the account must be active and its loan period must cover
  the target month. `isLoanActiveInMonth()` (`src/domains/debt/`) compares at
  month granularity — the start month and the maturity month both count, so a
  loan ending 2026-08-31 does not cover September while one maturing 2026-09-05
  still does. Inactive accounts, closed loan periods, and deleted documents are
  skipped. A grace period does not exempt a month, because grace-period payments
  are recorded as interest-only `DEBT_PAYMENT` entries (ADR-0017).
- The debt rows reuse the existing `listDebtPaymentsByDateRange` query and the
  read stays inside the same use case, so the check still has no write path.
  Anomaly rows for debt say 當月沒有找到還款紀錄 instead of the generic
  count/amount hint (`COMPLETENESS_LABELS.repaymentHint`).

### #94 Pre-settlement completeness soft gate (projects and ledger codes)

- `checkSettlementCompletenessUseCase` is the read-only check (ADR-0048): for a
  household and target year-month it returns, per watched target, an activity
  verdict (HAS_ACTIVITY / ZERO_ACTIVITY) plus a count and amount summary, and
  the zero-activity subset as `anomalies`. Projects count the month's
  allocations; ledger codes count transactions via the denormalized
  `ledgerCodes` array (single pass, deduped per transaction).
- The gate lives in a dedicated hook (`useCompletenessGate`) consumed by the
  shared settlement state-machine hook (`useSettlementDialog`), so both
  settlement entry points — the project detail dialog and the full-page monthly
  settlement — get it from the selection step.

  A clean list or an empty watch list passes with zero clicks; a failed check
  never blocks settlement (it surfaces a message and proceeds).

- Anomalies render inline (existing error-banner style) and each needs
  per-item `確認無漏記` before the step is released. Confirmations are
  session-scoped: they survive a month change within one session and clear on
  close/reopen. Wording avoids claiming the user missed an entry (ADR-0048).
- Display wording comes from `src/ui/constants/settlementCompletenessLabels.ts`
  (ADR-0046); target-type names delegate to the watch list label map. The gate
  is a separate hook (`useCompletenessGate`) so the settlement hook keeps one
  use case per call site, and it hands the components a `CompletenessAnomalyVM`
  rather than the application DTO. Each anomaly row shows the month
  count/amount summary (issue #94); the raw check error stays in the console.

### #93 Watch list domain and settings management (commit b8c8096)

- Watch list is an independent domain (ADR-0048): households/{id}/watchList with
  one document per watched object, doc ID namespaced by target type
  (`PROJECT`/`LEDGER_CODE`/`DEBT_ACCOUNT` + target id) so ledger codes with ':'
  do not collide.
- The settings page household section gains a management card that adds and
  removes all three target types from their existing lists (projects, system
  and custom ledger codes, active debt accounts); display labels come from
  `src/ui/constants/watchListLabels.ts` as the single source.
- Completeness checking is a derived behavior of this domain, implemented in #94
  above; the list itself is data with no write path beyond add/remove.
- Firestore security rules tests cover the watch list authorization matrix
  (anonymous/non-member denied, member read-only, owner/admin read-write);
  repository persistence is covered by emulator integration tests.

Validation baseline:

- Unit tests: 93 files, 428 tests passed.

- Integration tests: 17 files, 133 tests passed.
- Lint: 0 errors, 1 pre-existing warning (`scripts/admin/qa-data-plan.ts`
  max-lines).
- Production build: passed.
- Browser QA (emulator, both settlement entry points): gate appears for a
  zero-activity watched project and ledger code, per-item confirm releases the
  step, a watched code with activity is not flagged, an empty watch list passes
  with zero clicks, and reopening the settlement view re-runs the check.
- Browser QA (debt, full-page settlement, watched 玉山房貸): 2026/09 (seeded
  repayment present) passes with no alert; 2026/10 (no repayment) shows
  「債務帳戶／玉山房貸 — 當月沒有找到還款紀錄」with Preview disabled, and the
  per-item confirm clears the alert and releases the step.

## Next

- Parent #92 is complete: project, ledger code, and debt repayment checks all
  run from the same read-only use case. Remaining candidates are the deferred
  follow-ups in ADR-0048 (historical-deviation comparison, and the passive
  reminder surfaces left out of the first version).
