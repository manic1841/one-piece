# 10 — Retirement Specification

> v1 定案（2026-09-21 grilling，Q1-Q12 全部落定）。本檔記錄已定案的目標規格；與現行實作的差異與遷移追蹤見 GitHub issue #127。

## Purpose
Scenario-driven long-term retirement simulation using real household financial state plus editable assumptions. Result-first Scenario Workspace; a simulation layer, not a source of accounting truth.

## Inputs
### Current Financial State
Read-only, never an editable form:
- Assets: latest closed period's account ending snapshots
- Liabilities: debt balances
- Starting Net Worth: assets − liabilities, reusing the balance sheet Net Worth base (single calculation path)

No closed period → empty state with a pointer to Monthly Close; projection is blocked. No manual input field, no fallback value.

### Income
Baseline from the previous full year's actual income, imported as read-only `currentAnnual` (`number | null`): `null` for scenario-only streams created without a ledger source — UI shows `—`, never editable, pre-retirement contribution is 0; a number is always system-derived from the ledger import. User assumptions:
- `retirementAnnual` (effective from the retirement year)
- growth, defaulting to plan inflation; explicit `0` (no growth) must be distinguishable from unset
- `startYear` / `endYear` / lifelong; year link modes (`startYearMode` / `endYearMode`) are removed and migration resolves linked years into actual years

`FIXED / IMPORTED / DERIVED` calculation modes are removed from model and UI; derived income (e.g. bonus = salary × multiplier) is flattened into an independent stream at import time. Income-level `importedFrom` / `autoUpdate` flags are removed; plan-level Auto Update syncs every imported stream (identified by `calculatedFrom`) behind the single plan switch.

### Living Expenses
Imported from the previous full year's ledger via a `LedgerCode → ExpenseCategory` mapping (mapping to be added). Per category:
- `currentAnnual` is editable for normal living expenses; debt-payment imported values are system-derived/read-only.
- `retirementMultiplier` (post-retirement level)
- growth, defaulting to plan inflation
- optional `startYear` / `endYear` (general expense: unset = lifelong; debt payment import fills `endYear`)

Post-retirement amount applies the multiplier IMMEDIATELY at the retirement year (GRADUAL transition removed). Inflation compounds annually.

### Life Events
Manual scenario inputs.

```text
Life Event
├── Name
├── Type: Income | Expense
└── Phases[]
    ├── Start Year
    ├── End Year
    ├── Annual Amount
    └── Growth Rate? (schema kept; UI hidden until expanded)
```

### Assumptions
- Retirement Age
- Life Expectancy
- Inflation Rate (live engine input; default growth for income/expense items)
- Investment Return Rate

## Outputs
- Projected Net Worth: list page surfaces Final Net Worth = `summary.finalNetWorth` (projection-end closing balance at life expectancy); `savingsAtRetirement` is renamed `netWorthAtRetirement` (retirement-year opening net worth) across code/VM/glossary; plans not yet recalculated show `—` (no fallback)
- Cash Flow Projection
- Scenario result

## Behavior changes vs current implementation
- Projection starting balance comes from the latest closed period's net worth; `currentSavings` is removed (no fallback; empty state blocks projection).
- `inflationRate` becomes a live engine input; `salaryGrowthRate` and `retirementTransition` are removed.
- `SALARY_PERCENTAGE`, fallback and linked-income fields are removed from the model and UI; `LedgerCode → ExpenseCategory` mapping and the expense import flow are new.
- New imports default growth to plan inflation; migrated plans keep their explicit per-item growth rates.
- ADR supersede (0027 / 0028) happens when the feature lands.

## Growth rate semantics
`growthRate?: number`, resolved by one engine helper (`resolveGrowthRate(item.growthRate, plan.inflationRate)`); income, expense and event phases must not implement their own default logic:
- `undefined` → plan `inflationRate`
- `0` → explicitly no growth
- `> 0` → the specified rate

Growth compounds annually on the stream's active amount: `currentAnnual` anchors at its sample year; `retirementAnnual` anchors at the retirement year. Post-retirement expense level is `currentAnnual` (compounded to the retirement year) × `retirementMultiplier`, then compounds with inflation.

## Imports
- Income and living expenses import from the previous full year's ledger.
- Expense import reuses the income import pattern: section-header "Import from Ledger" button; `LedgerCode → ExpenseCategory` mapping classifies entries; existing category → update (keep original id), new category → create.
- `importSettings.projectMappings` is removed (its only consumers today are the schema and the QA seed script); no migration, no compatibility read.

## Migration (existing plans)
One-time migration; no dual-mode compatibility. The projection starting point is always re-derived as Latest Closed Account Assets − Debt Balance = Starting Net Worth; old `currentSavings` is never carried into a new field.
- `DERIVED` income → flattened to a fixed-amount stream
- `SALARY_PERCENTAGE` expense → flattened to a fixed amount
- `GRADUAL` transition → `IMMEDIATE`
- `currentSavings` → discarded

## Implementation order
1. Engine: inflation wiring, IMMEDIATE-only multiplier, optional growth (tests first)
2. Current Financial State: account snapshot + debt balance read path
3. Income: `currentAnnual` / `retirementAnnual`, remove DERIVED UI
4. Living Expenses: `LedgerCode` mapping + Import from Ledger
5. Events: phase growthRate hidden by default in UI
6. Migration: flatten DERIVED / SALARY_PERCENTAGE, GRADUAL → IMMEDIATE, discard `currentSavings` (always last)
7. Schema / ADR cleanup: remove `projectMappings` and old modes, supersede ADR-0027 / ADR-0028

Each stage lands with existing tests green before the next begins.
