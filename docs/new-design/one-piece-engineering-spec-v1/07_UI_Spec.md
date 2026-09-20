# 07 — UI Specification

Conformance (2026-09-18): prototype v1 and this spec agree — list pages are **tables**, not cards. The current card-based implementation of Accounts / Portfolio / Debt / Projects / Transactions diverges from both documents and is to be rebuilt per this spec, with presentation matching prototype v1 (tables, page structure, click-through detail pages). Presentation form follows prototype v1; fields and functionality follow this spec. Ticketed as S7.

Conformance (2026-09-20, #120): Retirement detail rebuilt as the single-page Scenario Workspace per the reading path above — Tabs removed, output sections (Overview / Results, Projected Net Worth, Cash Flow Projection) on top, Scenario Assumptions and input sections (Income, Living Expenses, Life Events) below, each a collapsible section consuming the shared accordion primitive on all viewports. Canonical terms (IncomeStream / ExpenseCategory / Life Event) are display labels served from the constants layer.

Conformance (2026-09-20, #122): rebuild landed on `feature/apple-design`. Accounts / Debt / Projects lists are spec tables with clickable rows and click-through detail routes (`/accounts/:id`, `/debt/:id`, `/projects/:id`); Transactions is a Date/Intent/Amount/Project table with a collapsible ACCOUNTING DETAILS accordion per row; Portfolio list is a Name/Securities/Bank/Portfolio Value/Return table. Detail pages follow the reading paths above (Accounts: Basic Info → Ending Balance → 12M Trend → 12M History → Holdings; Debt adds Outstanding Balance/Loan Information/Recent Payments; Portfolio adds Return Calculation accordion). Known divergences from the old card UI, pending owner confirmation on #122: portfolio reorder UI and projects per-row edit/delete were removed from the list surface; accounts surface dialogs (snapshot editor, history) replaced by detail pages; project income/expense aggregates come from project snapshots.

## Global shell
System Header: Brand + Household/User Context + Search/Command + User Avatar + System Status.
Main navigation is Pixel Pet. Implemented 2026-09-18 (#119): no bottom nav bar; the header Search control opens the Quick Access palette, and Ctrl/Cmd+K toggles it globally (see ADR-0055).

## Dashboard
Reading path (converged 2026-09-18, #121):
`NET WORTH → TREND → SNAPSHOT → ASSETS & LIABILITIES → MONTHLY CASH FLOW → RECENT ACTIVITY → MONTHLY CLOSE (WHAT'S NEXT)`

Sections:
1. Hero Net Worth
2. 12M Net Worth Trend
3. Financial Snapshot: 5 metrics — Total Assets, Total Liabilities, Monthly Cash Flow, Portfolio Return, Investment Leverage. Desktop 5 equal columns; mobile 2-column grid with the leverage tile spanning the full row.
4. Assets & Liabilities: balance-sheet composition — assets by physical account category (Cash / Bank / Securities), liabilities by debt category. Not investment-portfolio allocation.
5. Monthly Cash Flow: compact 12M net-cash-flow series.
6. Recent Activity (5–8 items)
7. Monthly Close: the WHAT'S NEXT landing point; status card carries per-stage progress and 下月應付 (what to pay next, not a snapshot metric).

No global period selector in header.

## Transactions
Page Header → Filters → Transaction Table.
Fields: Date, Intent, Amount, Project.
Add form: Date, Intent, Amount, optional Project/Allocation, Note.
Accounting details may be shown in a collapsed detail section.

## Accounts
List: Page Header → Summary → CASH/BANK/SECURITIES sections → tables.
Desktop columns: Account | Ending Balance | As of.
Rows clickable.
Detail: Basic Info → Ending Balance → 12M Trend → 12M History → Holdings for Securities.
No transaction list and no Close status on Account page.

## Portfolio
List columns: Name | Securities | Bank | Portfolio Value | Return.
Detail: Header → Portfolio Value → Value Breakdown → Return → 12M Portfolio Value → Monthly Performance → expandable Return Calculation.
Return Calculation: Previous Portfolio Value, Current Portfolio Value, Investment Cash Flow, Non-investment Cash Flow, Calculated Return, Return Rate.
No Holdings section; drill into Securities Account.

## Debt
List: Page Header → Summary → Debt Table.
Columns: Loan Name | Type | Outstanding Balance | Monthly Payment | As of.
Detail: Outstanding Balance → Loan Information → 12M Trend → 12M History / Monthly Data.
Create: Loan Name, Type, Loan Amount, Interest Rate, Start/End, Grace Period, optional Project.

## Projects
List columns: Name | Status | Income | Expense | Net Cash Flow.
Detail: Header → Summary → 12M Cash Flow → Expense Breakdown → Project Debt → Monthly Snapshot.
Create: Project Name → Active.
No Budget and no dates.

## Monthly Close
Page Header → Period Context → Workflow Pipeline → Current Step → Exceptions → Review & Close.
Desktop pipeline is horizontal; mobile vertical.
Current Step is the main working area.

## Reports
Overview: Period selector + Balance Sheet + Income Statement + Cash Flow. Rows clickable.
NEEDS REVIEW is shown as status/alert and routes to Monthly Close.
Reports are read-only.

Balance Sheet:
Assets: Cash, Bank accounts, Securities accounts.
Liabilities: Debt categories.
Net Worth = Total Assets - Total Liabilities.
Portfolio does not appear as a separate Balance Sheet asset.

Income Statement:
Income, Expenses, Net Income. No Project information.

Cash Flow:
Operating Activities, Investing Activities, Financing Activities, Net Change in Cash. Categories derive from Ledger Codes. No Project information.

## Retirement
Page Header → Retirement Overview → Projected Net Worth → Cash Flow Projection → Scenario Assumptions → Income → Living Expenses → Life Events.
Mobile is single column with collapsible sections.

## Settings
Household/user/system settings and Ledger Code customization.
