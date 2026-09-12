# Intent display labels live in UI constants, not domain mapping

`DEFAULT_INTENT_MAPPINGS` previously carried a `label` field that doubled as a UI display
source: `displayLabels.ts` derived intent labels from it (with an override map layered on
top) and the transaction form read `mapping.label` directly for category dropdown options.
That made domain accounting mappings and UI wording two coupled sources for the same
display text, so a wording change in one place silently diverged the other — the exact
class of drift the UI labeling guideline exists to prevent. We removed `label` from
`IntentMappingInfo`: domain mappings now carry only accounting semantics (intent type,
debit/credit ledger codes, user-select flags and prefixes), while every display string for
intents lives in `src/ui/constants/transaction/displayLabels.ts` next to the other two
label families (intentType, ledgerCode), which had always been UI-owned.

Alternatives considered: keep derivation with overrides (rejected: two moving parts for
one string, and the dropdown path bypassed overrides entirely); centralize only by
convention (rejected: nothing stopped future code from reading domain labels again). The
two-step flow for adding a new intent (accounting semantics in `DEFAULT_INTENT_MAPPINGS`,
display wording in `displayLabels.ts`) is enforced by a guard test that fails when a
domain intent has no display label.
