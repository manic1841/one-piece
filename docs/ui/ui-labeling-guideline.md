# UI Labeling Guideline

## Purpose

Define a single source of truth for frontend display labels, especially for:

- `intentType` labels
- `intent` labels
- `ledgerCode` labels

This avoids divergent wording such as "薪水/薪資" or "生活/生活費" across transaction list, form preview, and reports.

## Terminology

**Display Label（顯示標籤）** 是由 `constants` 層單一來源提供、對應資料值（如 IntentType、LedgerCode、帳戶類別）
的顯示文字。UI 只能經由標籤 API 取得，不得在元件內硬編碼資料標籤。避免詞：Ui Label、寫死文字。

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
- `expense:housing` -> `家居` (not `住房`)
- `expense:social` -> `社交` (not `人際` / `人情往來`)
- `income:refund` -> `退款回補` (not `退款`)

## Scope (2026-09 decision)

Managed display labels cover:

- Transaction labels: `intentType`, `intent`, `ledgerCode` (via `displayLabels.ts`)
- Account category labels (via `src/ui/constants/account/label.ts` `AccountCategoryLabels`)
- Report view titles: 損益表 / 資產負債表 / 現金流量表 (via `src/ui/constants/report/reportViewLabels.ts`)
- Debt status labels: 已結清 / 寬限期 (via `src/ui/constants/debtStatusLabels.ts`)

Free-form UI chrome (button text, error messages, subtitles, descriptive copy) is out of scope.

## Implementation Rule

- New UI features must not introduce new hardcoded transaction labels in components.
- Resolve labels via `displayLabels.ts`.
- If new intent or ledger code is added, update `displayLabels.ts` first, then update UI.
- Account category options render `AccountCategoryLabels`; do not write 銀行/券商/現金 literals in account UI.
- Report tabs, link cards, and page headers render `REPORT_VIEW_TITLES`; do not duplicate report title strings.

## Label Source Layers

- `src/ui/constants/transaction/displayLabels.ts` is the only API surface UI code may import.
- `INTENT_LABELS` in `displayLabels.ts` is a full static table for all domain intents (see ADR-0046); `src/domains/ledger/intentMapping.ts` carries no display labels, only accounting semantics.
- `src/ui/constants/report/ledgerCodeLabels.ts` is an internal layer under `displayLabels.ts`; UI feature code must not import it directly.
- `src/ui/constants/transaction/label.ts` does not exist (removed); references to it are historical.

## Ledger Code Enumeration

- The single seam for "all ledger codes of a household" is `listAllLedgerCodesUseCase` (`src/application/ledger/use_cases/listAllLedgerCodesUseCase.ts`): system defaults from the `LEDGER_CODES` constant merged with household custom codes (`households/{id}/ledgerCodes`, ADR-0009).
- UI code must not enumerate `LEDGER_CODES` directly to build an option list (picker, filter, select) for a set that should include custom codes; call the use case (via `useLedgerCodes` where a React hook fits) and pass `getUnifiedLedgerCodeLabel` as `labelResolver`.
- Referencing code constants for _label resolution or semantics_ is a different thing and is not banned: e.g. a ViewModel matching a transaction's code against `LEDGER_CODES`/`LEDGER_PREFIX` to pick a display label or classify a row. This is allowed in the **ViewModel** and **constants** tiers, and forbidden in **Surface**, which may not import `@/domains` at all.
- No `*_LABEL` map may be imported from `@/domains` by any UI tier; display text comes from `constants` (see ADR-0062 and 上方 Terminology).

## Notes

- `src/domains/report/labels.ts` is legacy for report-domain compatibility and must not be imported by UI feature code.
- New code should prefer `displayLabels.ts` APIs.

## Enforcement

- ESLint has a restricted import rule to block direct imports of `@/domains/report/labels`.
- ESLint additionally blocks `@/ui/constants/report/ledgerCodeLabels` imports from `src/ui/features/**`; only `displayLabels.ts` may use that internal layer.
- If a new UI display text is needed, extend `displayLabels.ts` first instead of adding a new label map.
- `src/ui/constants/transaction/displayLabels.test.ts` pins the canonical wording above; a wording change must update this test in the same task.
