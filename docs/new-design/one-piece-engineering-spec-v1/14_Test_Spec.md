# 14 — Test Specification

## Primary integration seam
**Monthly Close Workflow Application Boundary**

Test external workflow behavior rather than internal implementation details.

## Transaction tests
1. Create Food → expense:food / asset:cash mapping.
2. Create Salary → asset:cash / income:salary mapping.
3. Allocation with one Project defaults/validates to 100%.
4. Allocation with multiple Projects must total 100%.
5. Investment/Financing cannot be created from normal Transactions UI.
6. Investment/Financing created in Monthly Close uses the same Transaction model.
7. Investment/Financing can optionally link one Project.
8. Transfer and Adjustment intents are unavailable.
9. User-defined third-level Ledger Codes are selectable only under allowed prefixes.

## Account tests
1. TWD Account accepts ending balance.
2. Foreign currency Account stores foreign amount + exchange rate and calculates TWD Value.
3. Securities Account imports previous holdings and allows modification.
4. Account Detail shows only the intended 12M history.
5. Account page does not show transaction list or Close status.

## Debt tests
1. Monthly calculation follows loan terms.
2. Grace period defaults to interest-only.
3. User edits calculated monthly values.
4. Confirmation creates/updates the monthly record.
5. Debt Project link is optional.

## Monthly Close tests
1. OPEN → IN PROGRESS → READY TO CLOSE → CLOSED.
2. NEEDS REVIEW is a flag and can coexist with lifecycle states.
3. User can navigate backward.
4. Editing a prior step invalidates dependent downstream results.
5. Reports regenerate after affected source changes.
6. Final Close requires explicit confirmation.
7. Closed-period source mutation returns the period to IN PROGRESS + NEEDS REVIEW.

## Reconciliation tests
1. Account Balance and Ledger Cash are compared during report generation.
2. Difference is persisted.
3. User can ACCEPT or REVIEW.
4. System never auto-creates Adjustment.

## Reports tests
- Balance Sheet includes Cash, Bank, Securities and Liabilities.
- Portfolio is not duplicated in Balance Sheet.
- Income Statement contains Income, Expenses, Net Income and no Project section.
- Cash Flow contains Operating, Investing, Financing, Net Change in Cash.

## UI acceptance
- Desktop and mobile responsive behavior matches UI spec.
- Pixel Pet is the primary navigator.
- All list rows leading to Detail are clickable.
- Semantic colors are used for state, not arbitrary category decoration.
- Long report generation uses terminal-style progress.
