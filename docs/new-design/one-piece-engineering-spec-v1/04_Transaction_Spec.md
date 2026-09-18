# 04 — Transaction Specification

## Daily Transaction page
Purpose: record normal Income/Expense activity.

Core fields:
- Date
- Intent Type
- Amount
- Allocation (optional)
- Note

No Account field.
No direct Ledger Code field.

> **S2 conformance note (2026-09-18)**: "No Transfer / No Adjustment" applies to the daily entry UI only. Per ADR-0042, transfer is paused but remains a legal historical event type; settlement and reports still read transfers and adjustment fields.

No Transfer.
No Adjustment.
Investment and Financing are not created from the normal Transactions page.

## Intent options
Income:
- Salary
- Bonus
- Investment Income
- Refund
- Other Income

Expense:
- Food
- Transportation
- Vehicle
- Shopping
- Entertainment
- Living
- Family
- Healthcare
- Education
- Social
- Housing
- Rent
- Mortgage Interest
- Insurance
- Tax
- Other Expense

## Allocation
Default: no allocation.
When enabled:
- select one or more Projects
- assign ratios
- total must equal 100%

Single Project can default to 100%.

## Investment / Financing in Monthly Close
Same Transaction entity, different creation entry point.

Investment examples:
- SECURITY_BUY
- SECURITY_SELL
- REAL_ESTATE_BUY
- REAL_ESTATE_SELL

Financing examples:
- LOAN_BORROW
- LOAN_REPAYMENT
- SHAREHOLDER_FINANCING
- DIVIDEND_PAYOUT

Investment/Financing can optionally link one Project. Allocation is not used.

## Edit behavior
Transaction list rows open detail/edit. The UI should not expose persistent row-level Edit/Delete buttons.
