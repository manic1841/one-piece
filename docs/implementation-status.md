# Implementation Status

This document is the working checkpoint for agent implementation sessions.
Historical per-issue records live in the GitHub issue tracker; design decisions
live in `docs/adr/`; schema and testing facts live in `docs/data-structure.md`
and `docs/testing.md`. This file only records what is done on the current
branch and what is next.

## Current Checkpoint

### #94 Pre-settlement completeness soft gate (projects and ledger codes)

- `checkSettlementCompletenessUseCase` is the read-only check (ADR-0048): for a
  household and target year-month it returns, per watched target, an activity
  verdict (HAS_ACTIVITY / ZERO_ACTIVITY) plus a count and amount summary, and
  the zero-activity subset as `anomalies`. Projects count the month's
  allocations; ledger codes count transactions via the denormalized
  `ledgerCodes` array (single pass, deduped per transaction). Debt accounts are
  ignored here; they get their own `DEBT_PAYMENT` check (#95).
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

- Unit tests: 93 files, 415 tests passed.

- Integration tests: 17 files, 129 tests passed.
- Lint: 0 errors, 0 warnings.
- Production build: passed.
- Browser QA (emulator, both settlement entry points): gate appears for a
  zero-activity watched project and ledger code, per-item confirm releases the
  step, a watched code with activity is not flagged, an empty watch list passes
  with zero clicks, and reopening the settlement view re-runs the check.

## Next

- #95 debt repayment check (`DEBT_PAYMENT` based, ADR-0048 decision 2) is the
  remaining piece of parent #92.
