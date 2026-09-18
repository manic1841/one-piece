# 10 — Retirement Specification

## Purpose
Scenario-driven long-term retirement simulation using real household financial state plus editable assumptions.

## Inputs
### Current Financial State
Automatically read from ONE PIECE:
- Assets / Account state
- Debt state

Do not duplicate current assets/debt as independent retirement master data.

### Income
Use the previous full year's actual income as the baseline. User may adjust retirement assumptions.

### Living Expenses
Use the previous full year's spending by higher-level retirement expense category. Apply inflation and a retirement multiplier/assumption as configured.

### Life Events
Manual scenario inputs.

```text
Life Event
├── Name
├── Type: Income | Expense
└── Phases[]
    ├── Start Year
    ├── End Year
    └── Annual Amount
```

Event phases are required for multi-year varying costs, such as children-related expenses. Optional future extension: fixed annual amount vs annual growth.

### Assumptions
- Retirement Age
- Life Expectancy
- Inflation Rate
- Investment Return Rate

## Outputs
- Projected Net Worth
- Cash Flow Projection
- Scenario result

Retirement is a simulation layer, not a source of accounting truth.
