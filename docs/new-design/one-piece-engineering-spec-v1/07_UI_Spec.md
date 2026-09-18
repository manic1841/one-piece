# 07 — UI Specification

## Global shell
System Header: Brand + Household/User Context + Search/Command + User Avatar + System Status.
Main navigation is Pixel Pet. Implemented 2026-09-18 (#119): no bottom nav bar; the header Search control opens the Quick Access palette, and Ctrl/Cmd+K toggles it globally (see ADR-0055).

## Dashboard
Reading path:
`NET WORTH → TREND → SNAPSHOT → DETAIL → RECENT ACTIVITY → WHAT'S NEXT`

Sections:
1. Hero Net Worth
2. 12M Net Worth Trend
3. Financial Snapshot: Total Assets, Total Liabilities, Monthly Cash Flow, Portfolio Return
4. Asset Allocation / Assets & Liabilities
5. Monthly Cash Flow
6. Recent Activity (5–8 items)
7. Monthly Close

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
