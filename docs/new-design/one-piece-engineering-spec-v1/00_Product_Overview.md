# 00 — Product Overview

## Product
**ONE PIECE** is a household financial operating system focused on financial state, monthly closing, accounting traceability, analysis, reporting, and retirement scenarios.

## Design direction
- Engineering 80%
- Financial 60%
- Dark-first
- Data > Decoration
- Structure > Cards
- Space creates hierarchy
- Color communicates state
- Motion has a purpose
- Numbers should breathe

Visual direction: dark-first financial operating system / engineering terminal. Use thin borders, low-radius modules, monospace financial numbers, sparse semantic colors, and generous whitespace.

## Core model
`Record → Reconcile → Validate → Generate → Close`

Dashboard answers:
- Where am I?
- What happened?
- What's next?

Automation should handle normal cases; human attention is reserved for exceptions.

## Major domains
- Dashboard
- Transactions / Ledger
- Accounts
- Portfolio
- Debt
- Projects
- Monthly Close
- Reports
- Retirement
- Settings

## Source of truth vs derived data
### Source of truth
- Account master data
- Account monthly balances
- Securities monthly holdings
- Transaction / Ledger accounting representation
- Ledger codes and intent mappings
- Debt master data
- Debt monthly records
- Portfolio configuration
- Project master data

### Derived / read-optimized
- Project Snapshot
- Reports
- Dashboard metrics
- Retirement projection

## Critical accounting principles
1. Transaction and Ledger are not two independent user-maintained datasets.
2. Users select human-readable Intent Types; the system determines Debit/Credit Ledger Codes.
3. Ledger Code supports system-defined second-level codes and user-defined third-level codes.
4. Transfer and Adjustment intents are removed.

> **S2 conformance note (2026-09-18)**: "removed" means not offered in the daily UI entry. Per ADR-0042, transfer is paused but remains a legal historical event type: settlement reads transfers and reports keep the adjustment field.

5. Investment and Financing are Transaction Intent Types created from Monthly Close, not separate Transaction entities.
6. Investment/Financing transactions can optionally link one Project; Income/Expense can optionally use Project Allocation.
7. Account Balance is not directly linked to Transactions/Ledger.
8. During report generation, Account Balance and Ledger Cash are compared. The difference is recorded and the user decides whether to accept or review it. The system does not auto-create an adjustment transaction.
