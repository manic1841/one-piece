# Transaction Flow & Intent Mapping Design

## Rationale
The legacy `RecordForm` was a convoluted mess tied to a deprecated `plannedIncome` schema and lacked strict enforcement of the double-entry accounting model at the UI layer.

We replaced it with `TransactionForm` and a direct `IntentMapping` flow. This avoids complex conditional logic on the client and strictly defines the debits and credits from a single user intent.

## Core Flow
1. **User Intent**: The user selects an `IntentType` (e.g. `FOOD`, `SALARY`, `TRANSFER`) rather than raw ledger codes. Raw ledger codes shouldn't be exposed to the end-user casually in the UI.
2. **Intent Mapping (`src/domains/ledger/intentMapping.ts`)**: The UI hook `useTransactionForm.ts` queries the mapping using the intent. The mapping dictates exactly what the Debit (`dr`) and Credit (`cr`) ledger codes should be.
3. **Transaction Use Case**: The front-end calls `createTransactionUseCase` with a balanced double-entry payload.
4. **Allocations (`CreateAllocationUseCase`)**: If the user wants to split the transaction across multiple projects, the front-end hits `createAllocationUseCase`. This use case validates the percentage (summing to 100%), creates the allocation document, and updates the existing Transaction document with the `allocationId`.

## Adding New Intents
If you need a new transaction type (like "Entertainment"), don't clutter the UI with new hardcoded components. Go into `DEFAULT_INTENT_MAPPINGS`, add the new `IntentType`, define its debit and credit ledger codes, and it will automatically populate in the form. Keep it simple.
