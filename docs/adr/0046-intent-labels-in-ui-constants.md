# Intent display labels live in UI constants, not domain mapping

**Status:** Accepted
**規範來源：** [ui-labeling-guideline.md](../ui/ui-labeling-guideline.md)

<!-- 本檔原文為英文，保留英語撰寫。-->

`DEFAULT_INTENT_MAPPINGS` previously carried a `label` field that doubled as a UI display
source: `displayLabels.ts` derived intent labels from it (with an override map layered on
top) and the transaction form read `mapping.label` directly for category dropdown options.
That made domain accounting mappings and UI wording two coupled sources for the same
display text, so a wording change in one place silently diverged the other — the exact
class of drift the UI labeling guideline exists to prevent. We removed `label` from
`IntentMappingInfo`, so domain mappings carry only accounting semantics while every
display string for intents lives next to the other two label families, which had always
been UI-owned.

Adding a new intent is therefore a two-step flow (accounting semantics, then display
wording at the UI label source), enforced by a guard test that fails when a domain intent
has no display label.

## Considered Options

- **Keep derivation with overrides** — two moving parts for one string, and the dropdown
  path bypassed overrides entirely. Rejected.
- **Centralize only by convention** — nothing stopped future code from reading domain
  labels again. Rejected.
