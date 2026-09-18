# ONE PIECE — Engineering Specification v1

This package consolidates the current product, domain, accounting, UI, interaction, Monthly Close, report, retirement, data, and testing requirements discussed for ONE PIECE.

## Source hierarchy
1. Business/domain decisions in the product specification documents.
2. UI rules in `07_UI_Spec.md` and `08_Component_Design.md`.
3. Static prototypes in `prototype/` as visual/interaction references.
4. `12_Firestore_Schema.md` is an implementation proposal and must be validated against the actual backend stack before coding. `13_API_Spec.md` was removed after S1 review (2026-09-18): a REST API surface contradicts ADR-0001/0002 (Firebase is the only backend; all business logic stays in frontend use cases; no API server). Use-case boundaries are expressed in code, not as REST endpoints.

## Documents
- `00_Product_Overview.md` — product concept and principles
- `01_Information_Architecture.md` — navigation and page map
- `02_Domain_Model.md` — entities and relationships
- `03_Ledger_Accounting.md` — ledger hierarchy and intent mappings
- `04_Transaction_Spec.md` — transaction UI/domain rules
- `05_Monthly_Close.md` — complete close workflow
- `06_State_And_Interaction.md` — state machine and interaction rules
- `07_UI_Spec.md` — page-by-page UI specification
- `08_Component_Design.md` — design system and component specifications
- `09_Report_Spec.md` — Balance Sheet, Income Statement, Cash Flow and reconciliation
- `10_Retirement_Spec.md` — retirement scenario model
- `11_Project_Portfolio_Debt_Spec.md` — supporting domain-specific behavior
- `12_Firestore_Schema.md` — proposed persistence model
- `14_Test_Spec.md` — acceptance and workflow tests

## Prototype
- `prototype/one-piece-static-prototype-v1.html`
- `prototype/one-piece-component-gallery-v2.html`

## Important implementation principle
Do not infer business rules from the prototype alone. The prototype demonstrates visual hierarchy and interaction intent; the Markdown specifications define behavior.
