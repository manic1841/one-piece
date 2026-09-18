# 02 — Domain Model

## Account
Master data:
- Name
- Type: CASH | BANK | SECURITIES
- Currency
- Active state

Monthly state:
- Ending Balance
- Foreign Amount when applicable
- Exchange Rate when applicable
- TWD Value calculated by system

Securities monthly state:
- Symbol
- Name
- Cost
- Value
- Leverage

Account does not contain Transaction records.

## Transaction / Ledger
One Transaction represents one user-level financial event and its accounting representation.

Transaction types:
- INCOME
- EXPENSE
- INVESTMENT
- FINANCING

Daily Transactions page creates Income/Expense. Monthly Close creates Investment/Financing. All use the same Transaction model.

## Allocation
Optional for Income/Expense. Allocation distributes one transaction across multiple Projects by ratio. Total ratio must equal 100%.

Investment/Financing uses optional direct Project link and does not use Allocation.

## Debt
Master loan terms:
- Loan Name
- Type: Mortgage | Personal Loan
- Loan Amount
- Annual Interest Rate
- Start Date
- End Date
- Grace Period (months)
- Project optional

Monthly record:
- Payment
- Principal
- Interest
- Outstanding Balance

Repayment method is currently fixed to equal principal + interest / 本息平均攤還. During Monthly Close, the system calculates values and the user reviews/edits/confirm them. Grace period defaults to interest-only and can be reviewed/edited.

## Portfolio
- Name
- One Securities Account
- One Bank Account

Both source accounts must exist and be unused when creating a Portfolio. Links are fixed after creation; changing source accounts requires creating a new Portfolio.

Portfolio Value = Securities Market Value + linked Bank Account Ending Balance.
Portfolio is analysis; it does not duplicate Holdings.

## Project
- Name
- isActive

Project has no Budget and no Start/End Date. Time is represented by Transaction dates and Monthly Close periods.

Project financial data comes from:
- Income/Expense Transaction Allocation
- Optional direct Debt link
- Optional direct Project link on Investment/Financing Transaction

Portfolio and Project have no relationship.

## Monthly Close
Workflow state plus step state. It does not replace the source domains.

## Reports
Derived result layer. Reports do not edit source data.

## Retirement
Scenario/simulation layer. It reads existing financial state and historical activity and adds scenario assumptions and life events.
