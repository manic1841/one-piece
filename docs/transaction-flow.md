# Transaction Flow & Intent Mapping Design

## Rationale

The legacy `RecordForm` was a convoluted mess tied to a deprecated `plannedIncome` schema and lacked strict enforcement of the double-entry accounting model at the UI layer.

We replaced it with `TransactionForm` and a direct `IntentMapping` flow. This avoids complex conditional logic on the client and strictly defines the debits and credits from a single user intent.

## Core Flow

1. **Pure UI Form**: `TransactionForm` is a presentation component only. It owns local tab/form state and emits a normalized `TransactionFormOutput` payload via callback props.
2. **UI Controller (`useTransactionForm.ts`)**: The feature hook receives `TransactionFormOutput`, validates the selected intent path, and converts it into the correct application action.
3. **Intent Mapping / Ledger Selection**: Expense and income tabs still derive from `src/domains/ledger/intentMapping.ts`, but the UI now exposes normalized `ledgerCode` and `projectId` fields instead of invoking use cases directly.
4. **Transaction Use Case / Project Service**: Standard balanced entries go through `createTransactionUseCase`; project-to-project movement goes through `projectService.transferBetweenProjects`.
5. **Allocation Trigger**: The income form emits `triggerAllocation` plus allocation items. The UI controller now orchestrates a two-step flow: create transaction first, then create allocation and write back `allocationId`.
6. **Project Selection Rule**: `projectId` is optional for regular entries (expense, income, investment, financing, manual/transfer). Only `TRANSFER` requires both `fromProjectId` and `toProjectId`.

## Intent Type Notes

- `REFUND` is no longer treated as a standalone `intentType`; refunds are merged into `INCOME` as a dedicated income intent.
- `INVESTMENT` intents now cover securities and real-estate buy/sell flows.
- `FINANCING` intents now cover borrow/repay/shareholder-funding/dividend/initial-capital flows.
- `LIABILITY_BORROW` is system-generated when creating a new `DebtAccount` (Dr. `asset:cash`, Cr. debt `linkedLedgerCode`) and is not entered from TransactionForm tabs.

## Allocation Rules (Income / Expense)

- Allocation is supported on both `INCOME` and `EXPENSE` submissions.
- When `triggerAllocation` is enabled, users must provide project allocation percentages totaling 100%.
- Allocation record uses `sourceTransactionId`, `yearMonth` (`YYYY-MM`), and `direction` (`INCOME` or `EXPENSE`) derived from the source transaction.
- Project detail records must include allocation-derived entries, even when the source transaction has no `projectId`.

## Adding New Intents

If you need a new transaction type (like "Entertainment"), don't clutter the UI with new hardcoded components. Go into `DEFAULT_INTENT_MAPPINGS`, add the new `IntentType`, define its debit and credit ledger codes, and it will automatically populate in the form. Keep it simple.
