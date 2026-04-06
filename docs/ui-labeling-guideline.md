# UI Labeling Guideline

## Purpose

Define a single source of truth for frontend display labels, especially for:

- `intentType` labels
- `intent` labels
- `ledgerCode` labels

This avoids divergent wording such as "薪水/薪資" or "生活/生活費" across transaction list, form preview, and reports.

## Source of Truth

Frontend must resolve transaction-related labels through:

- `src/ui/constants/transaction/displayLabels.ts`

Use the following APIs:

- `getIntentTypeLabel(intentType)`
- `getIntentLabel(intent)`
- `getUnifiedLedgerCodeLabel(code)`
- `getTransactionCategoryLabel({ intentType, intent, ledgerCode, getLedgerLabel })`

Project detail and report UIs must also follow this rule:

- Project detail view-models should resolve transaction category text via `displayLabels.ts` APIs.
- Report rendering should keep passing a label resolver into `reportService` and use unified ledger labels returned by that resolver.

## Canonical Wording

### Intent Type

- `INCOME` -> `收入`
- `EXPENSE` -> `支出`
- `INVESTMENT` -> `投資`
- `FINANCING` -> `融資`
- `TRANSFER` -> `轉帳`
- `DEBT_PAYMENT` -> `還款`
- `LIABILITY_BORROW` -> `借款入帳`
- `MANUAL` -> `手動分錄`

### High-risk Terms (must stay consistent)

- `SALARY` -> `薪資` (not `薪水`)
- `INVESTMENT_INCOME` -> `投資收益` (not `投資收入`)
- `expense:living` -> `生活費` (not `生活`)
- `expense:housing` -> `住房` (not `家居`)
- `expense:social` -> `社交` (not `人際` / `人情往來`)
- `income:refund` -> `退款回補` (not `退款`)

## Implementation Rule

- New UI features must not introduce new hardcoded transaction labels in components.
- Resolve labels via `displayLabels.ts`.
- If new intent or ledger code is added, update `displayLabels.ts` first, then update UI.

## Notes

- `src/ui/constants/transaction/label.ts` is a legacy grouped label map retained for compatibility.
- `src/domains/report/labels.ts` is legacy for report-domain compatibility and must not be imported by UI feature code.
- New code should prefer `displayLabels.ts` APIs.

## Enforcement

- ESLint has a restricted import rule to block direct imports of `@/domains/report/labels`.
- If a new UI display text is needed, extend `displayLabels.ts` first instead of adding a new label map.
