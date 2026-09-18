# ONE PIECE Design System

> Engineering-first household financial operating system.

**Version:** 0.1
**Status:** Design Contract
**Product:** ONE PIECE

---

# 1. Design Philosophy

ONE PIECE is a household financial operating system.

The interface should feel closer to an **engineering / financial terminal** than a conventional personal-finance or fintech application.

### Design priorities

1. Data over decoration
2. Structure over cards
3. Space creates hierarchy
4. Color communicates state
5. Motion has a purpose
6. Let the numbers breathe

### Visual balance

* Engineering: **80%**
* Financial: **60%**
* Dark-first
* Minimal
* Spacious
* Precise
* Technical
* Calm

Avoid generic fintech styling, excessive rounded cards, gradients,
decorative illustrations, and unnecessary visual noise.

---

# 2. Design Decision Levels

Design decisions are classified into three levels.

### DESIGN DECISION

A confirmed product or UI decision.

AI agents and developers **MUST NOT change it without explicit approval**.

### DESIGN GUIDELINE

A design principle.

It may be adapted when necessary, but the resulting implementation
must remain consistent with the overall design language.

### IMPLEMENTATION DETAIL

An engineering implementation choice.

It may change without affecting the user-facing design.

---

# 3. Design Tokens

## 3.1 Color

Dark-first palette.

```text
Background       #0A0A0B
Surface          #111214
Surface Elevated #17191C
Border           #292C31

Text Primary     #F5F7FA
Text Secondary   #9CA3AF

Accent           #3B82F6

Positive         #22C55E
Negative         #EF4444
Warning          #F59E0B
```

### Color rules

`Accent` is used for:

* Primary interaction
* Navigation focus
* Selected state
* Important interactive elements

Semantic colors are used only when they communicate state.

```text
Positive → positive financial movement / completed
Negative → negative financial movement / error
Warning  → requires attention / review
```

Do not use semantic colors as decoration.

---

# 4. Typography

## UI Typeface

**Inter**

Use for:

* Navigation
* Labels
* Headings
* Descriptions
* Buttons
* Form controls

## Data Typeface

**JetBrains Mono**

Use for:

* Financial values
* Percentages
* Balances
* Transaction amounts
* Dates when technical formatting is useful
* IDs
* Technical information

Financial numbers should feel precise and stable.

---

# 5. Spacing

Use an **8px spacing system**.

```text
XS       8px
SM      16px
MD      24px
LG      32px
XL      48px
SECTION 64px
MAJOR   96px
```

Major sections may use:

* 64px
* 96px
* 128px

Whitespace is a primary hierarchy mechanism.

Do not compress layouts simply to display more information.

---

# 6. Geometry

Preferred:

```text
Border: 1px
Small radius: 4px
Medium radius: 8px
```

Avoid large rounded SaaS-style containers.

Cards should only be used when they represent a meaningful
functional boundary.

Prefer:

* whitespace
* typography
* dividers
* aligned columns
* grids

over nested cards.

---

# 7. Global Layout

All pages use:

```text
max-w-7xl mx-auto
```

Do not introduce page-specific maximum widths unless there is
a strong functional reason.

The Dashboard does not receive a special width exception.

The visual hierarchy should come from the internal grid and whitespace.

---

# 8. Application Navigation

## 8.1 Desktop Header

The header is a **system status bar**, not a traditional
SaaS navigation header.

It contains:

* ONE PIECE brand
* System status
* Household switcher
* Search
* Settings
* User avatar / logout

Desktop navigation:

```text
Overview
Accounts
Portfolio
Debt
Reports
Retirement
Transactions
Projects
```

### Monthly Close

Monthly Close is a first-class workflow, but is not required to appear
as a desktop header navigation item.

The primary Dashboard entry is the Monthly Close panel.

The `/close` route remains available.

### Global period selector

There is **no global period picker**.

Reason:

* Dashboard is anchored to the latest closed financial state.
* Reports have their own period selection.
* Other modules may have their own relevant date context.

---

# 9. User-facing Terminology

The underlying accounting concept is called:

```text
Ledger
```

But the user-facing navigation label is:

```text
Transactions
```

Do not expose `Ledger` as a primary navigation item.

`Ledger` remains an implementation / accounting-domain concept.

---

# 10. Dashboard

The Dashboard represents the user's **current financial state**.

It should answer:

1. Where am I?
2. What happened?
3. What's next?

## Information hierarchy

```text
1. Net Worth
2. 12-month Net Worth Trend
3. Financial Pulse
4. Assets / Liabilities
5. Next Month Debt Payment
6. Monthly Close
```

---

## 10.1 Net Worth Hero

Net Worth is the primary financial number.

The Hero may show:

```text
Net Worth
+8.42% YTD
+$374,210
```

YTD values must be computable from persisted financial reports.

Net Worth is anchored to the latest closed financial state.

---

## 10.2 12-Month Net Worth Trend

Preferred chart:

```text
Line / Area
```

Rules:

* Thin line
* Subtle grid
* Minimal labels
* No 3D
* No decorative gradients

The chart should communicate trend, not decoration.

---

## 10.3 Financial Pulse

Financial Pulse contains exactly four primary metrics:

```text
Total Assets
Total Liabilities
Monthly Cash Flow
Portfolio Return
```

Avoid duplicating the same financial information elsewhere
without additional context.

### Mobile

Use a 2 × 2 layout.

---

## 10.4 Assets / Liabilities

Show:

```text
Total Assets
Total Liabilities
```

Prefer typography and dividers over large cards.

---

## 10.5 Next Month Debt

Display:

```text
下月應付
```

This represents the deterministic amount due next month.

The value is derived from user-defined debt accounts.

This is the Dashboard's primary forward-looking financial value.

Do not present it as a manually entered Dashboard number.

---

## 10.6 Monthly Close Panel

Dashboard provides an entry point into the Monthly Close workflow.

The panel should show:

* Current period
* Current workflow stage
* Completion state
* Exceptions
* `VIEW CLOSE`

Example:

```text
MONTHLY CLOSE

02 / 05

LEDGER

18 accounts matched
2 accounts need review

VIEW CLOSE
```

---

# 11. Monthly Close

Monthly Close is a **first-class workflow**, not simply a report.

Workflow:

```text
01 ACCOUNT BALANCE
        ↓
02 LEDGER
        ↓
03 DEBT
        ↓
04 REPORTS
        ↓
05 REVIEW & CLOSE
```

High-level process:

```text
Collect
   ↓
Reconcile
   ↓
Validate
   ↓
Generate
   ↓
Close
```

---

## 11.1 Workflow States

```text
✓ COMPLETED
● CURRENT
○ WAITING
! NEEDS REVIEW
× ERROR
```

Do not use a generic percentage progress bar as the primary
workflow representation.

---

## 11.2 Workflow Progress vs Step Progress

These are separate concepts.

Example:

```text
02 / 05

LEDGER

18 / 20 accounts matched
2 accounts need review
```

`02 / 05` represents workflow progress.

`18 / 20` represents current-step progress.

Do not combine these into a single percentage.

---

## 11.3 Step 01 — Account Balance

User enters the ending balance for each account.

System provides:

```text
Previous balance
```

The entered ending balance becomes the monthly actual balance.

---

## 11.4 Step 02 — Ledger

Compare:

```text
Account balance
        vs
Ledger-derived balance
```

Exceptions should be surfaced clearly.

Normal cases should require minimal user interaction.

---

## 11.5 Step 03 — Debt

User enters or confirms:

* Payment
* Ending balance

Where applicable, the system derives:

```text
Principal
Interest
```

---

## 11.6 Step 04 — Reports

Generate and review:

* Balance Sheet
* Income Statement
* Cash Flow

Reports should be generated from validated financial data.

---

## 11.7 Step 05 — Review & Close

The final close is an explicit user action.

Do not automatically close the period without confirmation.

---

# 12. Financial Data Model — UI Principles

ONE PIECE should hide unnecessary accounting complexity from daily users.

The principle is:

> Record once. Derive everything possible.

---

## Transactions

Typical transaction fields:

```text
Date
Type
Amount
Account
Category
Note
```

Optional:

```text
Project
Tags
```

Default:

```text
Date = Today
Currency = TWD
```

Transaction types:

```text
INCOME
EXPENSE
TRANSFER
ADJUSTMENT
```

Transfers are not income or expense.

---

# 13. Investment Transactions

Do not ask users to manually duplicate the accounting effect
of a single investment transaction.

Example:

```text
Buy ETF
100 shares
@ $100
```

The system should derive:

```text
Brokerage Cash  -$10,000
Holding         +100 shares
```

The UI should focus on the user's actual action.

Underlying accounting complexity belongs to the data layer.

---

# 14. Accounts

Account pages represent real financial accounts.

Examples:

```text
Bank
Brokerage
Cash
Credit Card
Other Financial Account
```

Monthly Close uses account ending balances as reconciliation anchors.

---

# 15. Portfolio

Portfolio represents:

* Holdings
* Buys
* Sells
* Cash flows
* Returns
* Leverage

Do not force users to manually duplicate transactions
between Portfolio and Transactions.

Portfolio should derive information from underlying financial events
where possible.

---

# 16. Debt

Debt accounts represent:

* Outstanding balance
* Monthly payment
* Payment schedule
* Principal
* Interest

The Dashboard's `下月應付` value is derived from these accounts.

---

# 17. Projects

Projects are a view over underlying transaction / ledger data.

A Project should not create duplicate financial records.

Example:

```text
Project
   ↓
Filtered / grouped transactions
   ↓
Project cash flow
```

---

# 18. Reports

Reports represent validated accounting results.

Primary reports:

```text
Balance Sheet
Income Statement
Cash Flow
```

Reports are period-based.

The Dashboard should reference persisted report results
rather than independently recalculating financial state.

---

# 19. Retirement

Retirement is a long-term financial simulation.

It may project:

* Future expenses
* Cash flow
* Investment returns
* Asset balance

Projection horizon:

```text
Current age → Age 100
```

Retirement should visually communicate long-term trajectory
rather than behave like a normal transaction page.

---

# 20. Navigator

Navigator is a **system navigation layer**.

It is not Dashboard content.

It is not an AI assistant.

It does not provide financial advice.

---

## 20.1 Trigger

Pixel Pet is the Navigator trigger.

Desktop:

```text
Fixed bottom-right
```

Mobile:

```text
Fixed bottom-right
~48–56px
~16px from edges
```

---

## 20.2 Desktop Navigator

Clicking the Pet opens a floating panel.

Layout:

```text
2 × 4
```

Items:

```text
Transaction    Close
Account        Portfolio
Debt           Project
Report         Retirement
```

Dashboard is intentionally excluded.

Clicking the ONE PIECE brand returns to Dashboard.

---

## 20.3 Navigator Behavior

The panel:

* Floats above the page
* Does not push content
* Does not reflow the layout
* Opens near the Pet
* Can be closed by clicking outside
* Can be closed by clicking the Pet again

Moving the mouse away from the Pet must not immediately close
the Navigator.

---

# 21. Mobile Navigation

Existing mobile navigation remains unchanged.

The following coexist:

```text
Existing Bottom Navigation
+
Existing More Sheet
+
Pixel Pet Navigator
```

Do not redesign the mobile navigation system as part of the
current foundation work.

The Pet is an additional Navigator entrance.

---

# 22. Pixel Pet

Initial implementation:

```text
Simple circular placeholder
```

Example:

```text
Solid primary-color circle
+
simple paw / center mark
```

The formal pixel-art mascot is a later visual phase.

The interaction architecture must not depend on the final mascot artwork.

---

## Reaction API

The system defines four reaction states:

```text
idle
happy
nod
alert
```

### Event mapping

```text
Monthly Close complete → happy
Reconciliation complete → nod
Review required         → alert
General operation       → idle
```

Session A defines the interface.

Actual event integration may be added later.

---

# 23. Components

## Buttons

Primary actions should use the accent color.

Secondary actions should rely on:

* Border
* Text
* Subtle surface contrast

Avoid excessive filled buttons.

Actions should have clear hierarchy.

---

## Inputs

Inputs should use:

* Dark surface
* Low-contrast border
* Clear focus state
* Compact radius

Do not use oversized rounded input fields.

---

## Tables

Tables are a primary data presentation pattern.

Use:

* Strong column alignment
* Right alignment for numeric values
* JetBrains Mono for financial numbers
* Subtle row dividers
* Minimal decoration

Avoid excessive row cards.

---

## Status

Use the standard state vocabulary:

```text
✓ VERIFIED
● ACTIVE
○ WAITING
! REVIEW
× ERROR
```

Status should always communicate a meaningful system state.

---

## Charts

Preferred:

```text
Line
Area
Bar
Timeline
```

Avoid:

```text
3D
Decorative gradients
Heavy chart frames
Excessive colors
```

Use existing chart tokens where available.

Do not introduce arbitrary new chart colors.

---

# 24. Interaction

Motion should communicate:

* State change
* Navigation
* Feedback
* Workflow transition

Default duration:

```text
150–250ms
```

Avoid decorative animation.

---

# 25. Loading

Loading states should preserve layout structure.

Prefer:

```text
Subtle placeholder
Progressive content loading
```

Avoid large generic loading screens when only a section is loading.

---

# 26. Empty States

Empty states should explain:

1. What is missing
2. Why it matters
3. What the user can do next

Avoid decorative empty-state illustrations unless they provide
real product value.

---

# 27. Error States

Errors should be:

* Specific
* Actionable
* Close to the affected data

Use `Negative` only when communicating an actual error or negative state.

Do not hide errors behind generic toast messages when the user
needs to resolve the underlying issue.

---

# 28. Exception-first UX

ONE PIECE follows:

> Automation for normal cases, human attention for exceptions.

Example:

```text
20 accounts

18 MATCHED
2 NEED REVIEW
```

The interface should make the two exceptions immediately visible
without making the user manually inspect all twenty accounts.

---

# 29. Responsive Design

Mobile is **not** a scaled-down Desktop.

Mobile uses a single-column information hierarchy.

Dashboard priority:

```text
Net Worth
↓
12M Trend
↓
Financial Pulse
↓
Assets / Liabilities
↓
Next Month Debt
↓
Monthly Close
```

Assets and Liabilities should remain lightweight.

Prefer:

```text
Typography
+
Dividers
```

over large cards.

---

# 30. Desktop vs Mobile

## Desktop

Optimize for:

* Information density
* Alignment
* Comparison
* Multi-column data
* Workflow visibility

## Mobile

Optimize for:

* Priority
* Readability
* Touch interaction
* Single-column flow
* Reduced cognitive load

Do not simply shrink desktop components.

---

# 31. Dashboard Data Rules

### Snapshot data

Dashboard Net Worth and core financial metrics should represent
the latest closed financial state.

### Forward-looking data

`下月應付` is derived from debt definitions and the next month's
payment schedule.

### Derived data

Whenever a value can be deterministically derived from existing
financial records, prefer deriving it instead of asking the user
to enter the same information twice.

---

# 32. Design System Rules for AI Agents

When modifying or creating UI, AI agents MUST:

1. Follow this document before introducing new visual patterns.
2. Reuse existing design tokens.
3. Reuse existing components where possible.
4. Avoid introducing new colors without justification.
5. Avoid introducing new typography.
6. Avoid large rounded cards.
7. Avoid decorative gradients.
8. Preserve the established information hierarchy.
9. Preserve existing navigation decisions.
10. Preserve financial data semantics.
11. Avoid duplicating financial data-entry flows.
12. Prefer derived values over duplicated user input.
13. Treat Monthly Close as a workflow.
14. Treat Navigator as a separate navigation layer.
15. Keep Pixel Pet behavior independent from its final artwork.

---

# 33. Design Change Protocol

Before introducing a new pattern, ask:

```text
1. Does an existing component already solve this?
2. Does this follow the ONE PIECE visual language?
3. Does this improve information hierarchy?
4. Does this reduce cognitive load?
5. Does this introduce unnecessary decoration?
6. Does this duplicate an existing financial concept?
```

If the answer is unclear, prefer the existing pattern.

---

# 34. Do / Don't

## DO

* Use whitespace
* Emphasize important numbers
* Use semantic colors
* Use subtle borders
* Use aligned data
* Use typography for hierarchy
* Use JetBrains Mono for financial data
* Surface exceptions clearly
* Keep normal workflows quiet
* Preserve consistent navigation

## DON'T

* Don't turn every section into a card
* Don't use excessive rounded corners
* Don't use decorative gradients
* Don't overload the Dashboard
* Don't expose unnecessary accounting complexity
* Don't duplicate financial records
* Don't duplicate financial input
* Don't make Pixel Pet an AI chatbot
* Don't use color purely for decoration
* Don't add navigation without considering the existing system
* Don't introduce arbitrary design patterns

---

# 35. Core Product Principle

ONE PIECE should make household finance feel like a system that
can be understood, reconciled and trusted.

The core operating loop is:

```text
RECORD
   ↓
RECONCILE
   ↓
VALIDATE
   ↓
GENERATE
   ↓
CLOSE
   ↓
UNDERSTAND
   ↓
PLAN
```

The interface should make the system state visible while keeping
routine work quiet.

> **Data today, a freer tomorrow.**
