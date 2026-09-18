# 01 — Information Architecture

## Primary navigation
The main navigator is owned by **Pixel Pet**, not the header.

Navigator items:
- Transaction
- Close
- Account
- Portfolio
- Debt
- Project
- Report
- Retirement

Dashboard is the home context and is not a navigator item.

## System Header
Header contains:
- ONE PIECE brand
- Household/User context
- Search / Command access
- User avatar/menu
- System status

Header does not contain the primary navigator.

## Pages
```text
ONE PIECE
├── Dashboard
├── Transactions
│   ├── List
│   ├── Add
│   └── Detail/Edit
├── Monthly Close
│   ├── 01 Account Balance
│   ├── 02 Ledger
│   ├── 03 Debt
│   ├── 04 Investment & Financing
│   ├── 05 Reports
│   └── 06 Review & Close
├── Accounts
│   ├── List
│   ├── Create
│   └── Detail
├── Portfolio
│   ├── List
│   ├── Create
│   └── Detail
├── Debt
│   ├── List
│   ├── Create
│   └── Detail
├── Projects
│   ├── List
│   ├── Create
│   └── Detail
├── Reports
│   ├── Overview
│   ├── Balance Sheet
│   ├── Income Statement
│   └── Cash Flow
├── Retirement
│   ├── Overview
│   ├── Income
│   ├── Living Expenses
│   ├── Life Events
│   └── Assumptions
└── Settings
```

## Navigation behavior
- List rows are clickable and lead to Detail.
- Pixel Pet opens the main navigator.
- Ctrl/Cmd+K opens Quick Access / Command Palette.
- Contextual search/filter is used inside data modules; there is no global full-text search requirement.
- Mobile uses a Bottom Sheet for Pixel Pet navigation.
