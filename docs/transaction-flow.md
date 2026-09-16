# Transaction Flow & Intent Mapping Design

## Rationale

The legacy `RecordForm` was a convoluted mess tied to a deprecated `plannedIncome` schema and lacked strict enforcement of the double-entry accounting model at the UI layer.

We replaced it with `TransactionForm` and a direct `IntentMapping` flow. This avoids complex conditional logic on the client and strictly defines the debits and credits from a single user intent.

本文件描述目前的 UI 與 Use Case 呼叫流程，不重新定義財務模型。分錄架構、IntentType 分層、Allocation 與 user-select 科目的決策分別以 [ADR-0005](adr/0005-journal-entry-architecture.md)、[ADR-0010](adr/0010-intenttype-three-tier.md)、[ADR-0011](adr/0011-allocation-separate-collection.md)、[ADR-0022](adr/0022-intent-userselect-flag.md) 為準；債務還款另見 [ADR-0014](adr/0014-debt-payment-intenttype.md)。

## Core Flow

1. **Pure UI Form**: `TransactionForm` is a presentation component only. It owns local tab/form state and emits a normalized `TransactionFormOutput` payload via callback props.
2. **UI Controller (`useTransactionForm.ts`)**: The feature hook receives `TransactionFormOutput`, validates the selected intent path, and converts it into the correct application action.
3. **Intent Mapping / Ledger Selection**: Expense and income tabs still derive from `src/domains/ledger/intentMapping.ts` (accounting semantics only; display wording lives in `displayLabels.ts`, see ADR-0046), but the UI now exposes normalized `ledgerCode` and `projectId` fields instead of invoking use cases directly.
4. **Transaction Use Case / Transfer Use Case**: Standard balanced entries go through `createTransactionUseCase` (create) and `updateTransactionUseCase` (edit). Project-to-project movement previously used `transferBetweenProjectsUseCase`; that feature is currently paused (see [ADR-0042](adr/0042-pause-project-transfer-feature.md)): the UI entry and write use case are removed, while historical TRANSFER transactions remain readable and are still counted in balances and settlement.
5. **Allocation Trigger**: The income/expense form emits `triggerAllocation` plus allocation items. On create, the UI controller sends the normalized Transaction and Allocation payload to the dedicated composite command, which atomically creates the Transaction, deterministic Allocation, source `allocationId` link, and operation result. Reallocation-only actions use `replaceAllocationUseCase`, which changes only the Allocation desired state and source link atomically; the existing financial Transaction is not recreated or deleted. On edit, `updateTransactionUseCase` uses the same replacement helper while updating the other editable Transaction fields.
6. **Income Allocation Template Prefill**: When an income `ledgerCode` is selected, the UI controller queries `allocationTemplates` by exact `ledgerCode`; if not found, it falls back to `isDefault == true`; if still not found, allocation stays blank.
7. **Template Persistence**: After an income allocation is successfully created, the same allocation percentages are upserted into `allocationTemplates` for that `ledgerCode` as a convenience template. Historical allocations are not mutated.
8. **Project Selection Rule**: `projectId` is optional for regular entries (expense, income, investment, financing, manual). Only historical `TRANSFER` transactions carry `fromProjectId` and `toProjectId`; the form no longer creates them ([ADR-0042](adr/0042-pause-project-transfer-feature.md)).
9. **Debt Payment Retry Rule**: `DEBT_PAYMENT` is an append-only financial command. The caller creates one idempotency key per user action and reuses it for retries; the Transaction, DebtSnapshot, DebtAccount balance cache, and household operation record commit in one Firestore transaction. A same-key replay returns the original result, while a different payload returns `IDEMPOTENCY_CONFLICT`.
10. **Debt Payment Entry Point**: The form no longer offers a `DEBT_PAYMENT` tab or panel, and repayments are recorded only through the monthly close workflow (`/close` DEBT_REPAYMENT stage via `monthlyCloseWorkflowUseCase`, which also settles fully-repaid debt accounts). The settlement-prompt dialog in the transaction feature is removed with it.

## Intent Type Notes

IntentType 的分類與映射規則不在本文件重述，請以 [ADR-0010](adr/0010-intenttype-three-tier.md)、[ADR-0014](adr/0014-debt-payment-intenttype.md) 與 [ADR-0022](adr/0022-intent-userselect-flag.md) 為準。

目前 UI 的實作限制如下：`LIABILITY_BORROW` 由建立 `DebtAccount` 的流程產生，不從 `TransactionForm` 輸入；`TRANSFER` 目前暫停實作（[ADR-0042](adr/0042-pause-project-transfer-feature.md)）；`DEBT_PAYMENT` 不再從表單輸入，僅能透過月度關帳流程（`/close` 的 DEBT_REPAYMENT 階段）錄入；編輯流程暫不支援 `TRANSFER`，以避免尚未具備專用更新流程時產生部分副作用。

`DEBT_PAYMENT` 的付款規則、atomicity、retry 與 operation record 以
[ADR-0014](adr/0014-debt-payment-intenttype.md)、[ADR-0015](adr/0015-debt-account-balance-derived.md)、[ADR-0017](adr/0017-grace-period-derived-not-stored.md) 與 [ADR-0038](adr/0038-command-atomicity-and-retry-policy.md) 為準。

## Allocation Rules (Income / Expense)

Allocation 的資料邊界與獨立集合決策見 [ADR-0011](adr/0011-allocation-separate-collection.md)，以下只保留表單與交易流程的操作細節。

- Allocation is supported on both `INCOME` and `EXPENSE` submissions.
- When `triggerAllocation` is enabled, users must provide project allocation percentages totaling 100%.
- Allocation record uses `sourceTransactionId`, `yearMonth` (`YYYY-MM`), and `direction` (`INCOME` or `EXPENSE`) derived from the source transaction.
- A newly created Allocation uses its source Transaction ID as its deterministic document ID; the composite create command uses a caller-generated idempotency key separately for retry identity.
- Project detail records must include allocation-derived entries, even when the source transaction has no `projectId`.
- `AllocationTemplate` is UI assistance data only. Editing templates does not modify existing `allocations` records.

## Adding New Intents

If you need a new transaction type (like "Entertainment"), don't clutter the UI with new hardcoded components. The flow is two steps:

1. Go into `DEFAULT_INTENT_MAPPINGS`, add the new `IntentType`, and define its debit and credit ledger codes. It will automatically populate in the form.
2. Add the display wording for the new intent to `INTENT_LABELS` in `src/ui/constants/transaction/displayLabels.ts` (see the UI labeling guideline and ADR-0046). A guard test fails if a domain intent has no display label.
