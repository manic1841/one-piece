# 09 — Report Specification

## Report principles
- Reading-first
- Read-only source result
- Report status can be NEEDS REVIEW
- Source issues are fixed in Account / Transaction / Debt / Monthly Close, then reports are regenerated
- No old report/close versions are retained

## Balance Sheet
Point-in-time state.

Assets:
- Cash
- Bank accounts individually
- Securities accounts individually

Liabilities:
- Mortgage
- Personal Loan
- Other supported liability classifications

Net Worth = Total Assets - Total Liabilities.
Portfolio is not separately added to prevent duplication.

## Income Statement
Period-based:
- Income
- Expenses
- Net Income

Do not show Project information.
Ledger Codes are internal; UI uses human-readable labels.

## Cash Flow
Three sections:
- Operating Activities
- Investing Activities
- Financing Activities

Each category is determined from Ledger Codes / accounting classification.
Final line: Net Change in Cash.
Do not use a Transfer section.

## Cash reconciliation
At report generation:
```text
Actual Account Balance
        vs
Ledger Cash
        ↓
Difference
```
Record:
- Actual Balance
- Ledger Balance
- Difference
- Decision: PENDING | ACCEPT | REVIEW

The system must not auto-create an Adjustment transaction.

## Project Snapshot
Read-optimization result, not a formal financial statement.
Includes:
- Income by Ledger Code
- Expense by Ledger Code
- Net Cash Flow
- Project-linked Debt Summary: debt id, outstanding balance, payment, interest

Project information is not added to the three formal financial statements.
