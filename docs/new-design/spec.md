# FINANCE.OS — Household Financial OS & Monthly Close UX Specification

> **修訂（2026-09-16，與既有程式碼與 ADR 對照後）**。以下修訂解決規格與現有架構的衝突；未修訂處照原文。
>
> 1. **Financial Period 狀態機**：新增極簡的期間狀態紀錄（僅工作流狀態與各階段狀態，鍵為既有 YYYY-MM），不複製快照資料；快照架構與就緒判定（isReady，衍生、存在性檢查）維持 ADR-0018。見 ADR-0050。
> 2. **Account Reconciliation 重定義**：對帳定義為**報表層級的科目一致性檢查** — 檢查整體現金、股票等科目金額在跨報表（現金流量表 vs 資產負債表）之間是否一致，不一致時警示；不定位問題帳戶、不引入帳戶-科目映射（ADR-0007 帳戶/科目分離使逐帳戶對帳在資料架構上辦不到）。見 ADR-0051。
> 3. **Ledger Validation 重命名與映射**：領域層映射到既有 Completeness Check（監看清單驅動）＋分錄平衡驗證（寫入時）；「Ledger」一詞不採用（與 LedgerCode/domain 撞名），UI 維持「交易」。
> 4. **Monthly Close 為前端 use case**（ADR-0002 無後端），非 `POST /monthly-close/start`；模式同 `generateFinancialReportsUseCase`。
> 5. **五階段順序依賴僅為 UI 引導**，系統不強制（ADR-0018 順序由使用者手動流程保證）；NEEDS_REVIEW 暫停行為由期間狀態表達。
> 6. **術語對照**：Ledger ≈ Transaction（UI 標籤「交易」）；Ledger entries ≈ Journal Entry（分錄）；Ledger Validation ≈ Completeness Check（記帳完整性檢查）；Financial Period（財務期間）與 Monthly Close（月度關帳）已收錄為 CONTEXT.md 正式術語；Net Worth 沿用既有 `NET_WORTH`（淨資產）標籤。
> 7. **視覺系統**：以既有 Apple-style token 架構為基礎暗色化（詳見 ui.md 修訂）；中文介面維持。

## Problem Statement

The user needs a household financial management system that reflects the structure and precision of an engineering system rather than a conventional personal finance or budgeting application.

The system manages multiple financial data domains, including ledger transactions, project views, bank accounts, investment portfolios, debt accounts, accounting reports, and long-term retirement planning. These domains are related to one another but should not compete for attention on the main dashboard.

The current product direction requires a clear distinction between:

* Current financial state
* Underlying financial records
* Monthly financial closing workflow
* Accounting results
* Long-term financial projections

The user also needs a structured monthly closing process that connects account reconciliation, ledger validation, debt updates, and financial report generation. The workflow should communicate progress and dependencies clearly while allowing users to resolve data issues before completing the accounting period.

The interface should provide strong engineering and technology characteristics while retaining sufficient financial/accounting credibility. It should remain dark, minimal, spacious, and data-oriented rather than becoming a dense dashboard or conventional fintech interface.

## Solution

Build FINANCE.OS as a dark-first, engineering-oriented Household Financial OS with a spacious dashboard and a structured Monthly Close workflow.

The product should use progressive disclosure:

* Overview shows the current financial state.
* Finance modules provide detailed account, portfolio, debt, and project information.
* Ledger acts as a low-priority system log.
* Reports provide formal accounting statements.
* Retirement provides long-term financial simulation.
* Monthly Close connects the underlying financial data into a controlled period-closing workflow.

The Overview should prioritize:

1. Net Worth / Total Assets
2. Net Worth Trend
3. Assets and Liabilities
4. Financial Pulse
5. Monthly Close Status
6. Ledger Log

The Monthly Close workflow should operate as a financial pipeline:

```text
Account Reconciliation
        ↓
Ledger Validation
        ↓
Debt Update
        ↓
Financial Reports
        ↓
Close Period
```

Each step should expose its current state, validation result, outstanding issues, and appropriate resolution action.

The primary high-level testing seam is the **Monthly Close Workflow Application Boundary**, which observes the workflow from start through completion and verifies externally observable financial state changes.

## User Stories

1. As a household financial user, I want to see my current net worth prominently, so that I can immediately understand my overall financial position.

2. As a household financial user, I want to see total assets and liabilities, so that I can understand what makes up my net worth.

3. As a household financial user, I want to see how my net worth changes over time, so that I can understand my long-term financial trajectory.

4. As a household financial user, I want to view net worth over selectable time ranges, so that I can analyze both recent and long-term changes.

5. As a household financial user, I want assets, liabilities, and net worth to be presented as related financial data, so that I can understand the relationship between them.

6. As a household financial user, I want to see current net cash flow, so that I can understand whether my household finances are generating or consuming cash.

7. As a household financial user, I want to compare current-month, previous-month, and year-to-date financial performance, so that I can understand changes across meaningful periods.

8. As a household financial user, I want to see investment returns, so that I can understand the contribution of investments to my financial position.

9. As a household financial user, I want to see investment leverage, so that I can understand the relationship between investment assets and associated financing.

10. As a household financial user, I want to see monthly debt payments, so that I can understand the recurring financial commitment created by debt.

11. As a household financial user, I want the dashboard to emphasize financial state rather than transaction details, so that the most important information remains easy to understand.

12. As a household financial user, I want Ledger to remain available without dominating the dashboard, so that I can inspect underlying transactions when necessary without losing sight of my overall financial position.

13. As a household financial user, I want Ledger to behave like a system log, so that individual transactions can be traced without treating them as the primary financial view.

14. As a household financial user, I want to see recent Ledger activity in a compact log, so that I can quickly identify recent financial events.

15. As a household financial user, I want to access detailed Ledger information when necessary, so that I can investigate the source of financial results.

16. As a household financial user, I want to manage financial projects through project views, so that I can organize financial information without duplicating the underlying ledger data.

17. As a household financial user, I want bank accounts to maintain monthly balances, so that account balances can be reconciled against recorded ledger information.

18. As a household financial user, I want each account to compare its recorded balance against its corresponding ledger balance, so that discrepancies can be identified.

19. As a household financial user, I want account reconciliation to clearly indicate whether an account matches, so that I can quickly identify accounts requiring attention.

20. As a household financial user, I want to inspect account reconciliation discrepancies, so that I can identify the underlying transactions or adjustments that require review.

21. As a household financial user, I want to resolve account reconciliation issues before closing a period, so that the resulting financial statements use validated account data.

22. As a household financial user, I want to maintain investment portfolios separately from bank accounts, so that investment performance and allocation can be analyzed independently.

23. As a household financial user, I want to see portfolio value and investment return, so that I can understand investment performance.

24. As a household financial user, I want to see portfolio asset allocation, so that I can understand how investment assets are distributed.

25. As a household financial user, I want to see investment leverage, so that I can understand how debt relates to investment assets.

26. As a household financial user, I want to manage debt accounts separately, so that outstanding balances and recurring payments can be tracked.

27. As a household financial user, I want each debt account to record monthly payment and outstanding balance information, so that debt reduction can be tracked over time.

28. As a household financial user, I want to see total debt balance, so that I can understand my household liabilities.

29. As a household financial user, I want to see total monthly debt payments, so that I can understand recurring financing obligations.

30. As a household financial user, I want to see debt balance over time, so that I can understand the progress of debt repayment.

31. As a household financial user, I want to generate a Balance Sheet, so that I can understand assets, liabilities, and net assets for a financial period.

32. As a household financial user, I want to generate an Income Statement, so that I can understand income, expenses, and net income for a financial period.

33. As a household financial user, I want to generate a Cash Flow Statement, so that I can understand operating, investing, and financing cash movements.

34. As a household financial user, I want financial reports to be derived from validated financial data, so that reports remain consistent with the underlying records.

35. As a household financial user, I want to navigate from report results to their underlying ledger records, so that financial results remain traceable.

36. As a household financial user, I want to select a report period, so that I can inspect historical monthly and year-to-date financial results.

37. As a household financial user, I want to start a Monthly Close for a specific financial period, so that the period can be processed systematically.

38. As a household financial user, I want to see the previous period's closing status, so that I know whether the financial workflow is progressing sequentially.

39. As a household financial user, I want to see the current period's data readiness before starting the close, so that I know whether required information is available.

40. As a household financial user, I want Monthly Close to execute through defined financial stages, so that I always understand where the closing process currently stands.

41. As a household financial user, I want to see Account Reconciliation as the first closing stage, so that account balances are validated before downstream financial processing.

42. As a household financial user, I want the system to compare bank account balances with ledger-derived balances, so that reconciliation can be performed systematically.

43. As a household financial user, I want the system to identify reconciliation discrepancies, so that I can focus on exceptions rather than manually checking every account.

44. As a household financial user, I want the Monthly Close process to pause when required reconciliation issues remain unresolved, so that incomplete financial data does not silently proceed to final reporting.

45. As a household financial user, I want to review unresolved reconciliation issues directly from the closing workflow, so that I can resolve problems without losing workflow context.

46. As a household financial user, I want the Ledger Validation stage to validate the period's ledger entries, so that downstream reports are based on valid ledger data.

47. As a household financial user, I want Ledger Validation to show the number of valid and review-required entries, so that I can understand the state of the underlying data.

48. As a household financial user, I want the closing workflow to identify dependencies between financial stages, so that I understand why a later stage is waiting.

49. As a household financial user, I want the Debt Update stage to update monthly debt payments and balances, so that debt information is included in the period's financial state.

50. As a household financial user, I want the Reports stage to generate the three primary financial statements, so that the period's accounting results are available after validation.

51. As a household financial user, I want the workflow to show each report's generation status, so that I know which statements are complete.

52. As a household financial user, I want the final Close Period stage to mark the financial period as closed, so that the system clearly distinguishes completed periods from periods still being processed.

53. As a household financial user, I want the Monthly Close workflow to show overall progress, so that I can understand how much of the process remains.

54. As a household financial user, I want workflow progress to represent actual completed stages, so that progress communicates system state rather than decorative gamification.

55. As a household financial user, I want to see a clear completion state after all closing stages succeed, so that I know the period has been finalized.

56. As a household financial user, I want the Dashboard to reflect the new closing status after a successful Monthly Close, so that the Overview remains synchronized with the financial workflow.

57. As a household financial user, I want the system to preserve a clear relationship between Account, Ledger, Debt, and Reports, so that financial information remains traceable through the entire closing process.

58. As a household financial user, I want Retirement Planning to project financial assets and cash flow through age 100, so that I can evaluate long-term financial sustainability.

59. As a household financial user, I want to define retirement age and other projection parameters, so that the simulation reflects my planning assumptions.

60. As a household financial user, I want to define annual expenses, inflation, and investment return assumptions, so that the projection reflects the financial conditions I choose to model.

61. As a household financial user, I want to compare income and expenses during retirement, so that I can understand how cash flow affects projected assets.

62. As a household financial user, I want to run different retirement scenarios, so that I can examine how changes in assumptions affect the projection.

63. As a household financial user, I want the retirement simulation to clearly indicate whether projected assets remain funded through age 100, so that the long-term result is easy to interpret.

64. As a household financial user, I want simulation execution to communicate its progress and completion state, so that I understand when the financial projection has been recalculated.

65. As a household financial user, I want the interface to remain visually quiet, so that financial data remains the primary focus.

66. As a household financial user, I want the interface to use generous spacing, so that important financial numbers have sufficient visual breathing room.

67. As a household financial user, I want the interface to use a dark engineering-oriented visual language, so that the product feels like a financial operating system rather than a conventional consumer finance application.

68. As a household financial user, I want color to communicate financial or system state, so that positive, negative, warning, and system statuses are immediately distinguishable.

69. As a household financial user, I want the interface to use restrained animation, so that motion communicates meaningful state changes without distracting from financial information.

70. As a household financial user, I want navigation to remain hidden during normal use, so that the dashboard maintains a clean and spacious layout.

71. As a household financial user, I want the navigation system to appear when I interact with the Pixel Pet, so that navigation remains available without occupying permanent screen space.

72. As a household financial user, I want the Pixel Pet to use an original pixel-art mascot style, so that the serious financial system has a small amount of personality.

73. As a household financial user, I want the Pixel Pet to remain visually subordinate to financial information, so that personality does not interfere with usability.

74. As a household financial user, I want the Navigator to appear as an overlay rather than shifting the dashboard layout, so that opening navigation does not disrupt the current view.

75. As a household financial user, I want navigation transitions to be fast and subtle, so that the interaction feels like part of the system rather than a decorative animation.

## Implementation Decisions

* The product will be structured as a Household Financial OS rather than a conventional budgeting application.

* The primary information architecture will contain:

  * Overview
  * Monthly Close
  * Projects
  * Accounts
  * Portfolio
  * Debt
  * Reports
  * Retirement
  * Ledger as underlying financial log/data

* Overview will prioritize financial state over transaction-level information.

* Net Worth will be the primary visual focus of Overview.

* Net Worth Trend will combine Total Assets, Total Liabilities, and Net Worth into a related financial trend visualization, with Net Worth receiving the strongest visual emphasis.

* Financial Pulse will expose Net Cash Flow, Investment Return, Investment Leverage, and Monthly Debt Payment without relying on a dense collection of dashboard cards.

* Overview will use progressive disclosure. Detailed information will be available through deeper views rather than being permanently visible on the first screen.

* Ledger will be treated as a system log. It will remain accessible and traceable but will have lower visual priority than financial state and financial summaries.

* Accounts will support monthly balance recording and reconciliation against ledger-derived balances.

* Portfolio will focus on portfolio value, investment return, asset allocation, and leverage rather than resembling a trading application.

* Debt will focus on outstanding balance, monthly payment, and repayment trajectory.

* Reports will provide:

  * Balance Sheet
  * Income Statement
  * Cash Flow Statement

* Reports will maintain traceability back to underlying ledger information.

* Retirement will operate as a financial projection/simulation experience covering the user's current state through age 100.

* Retirement parameters will include current age, retirement age, life expectancy, annual expense, inflation, and investment return assumptions.

* Retirement will support scenario-based projections and display asset and cash-flow trajectories.

* Monthly Close will be a first-class workflow rather than a subordinate Reports action.

* Monthly Close will contain five conceptual stages:

  1. Account Reconciliation
  2. Ledger Validation
  3. Debt Update
  4. Financial Reports
  5. Close Period

* Each stage will expose an externally observable state.

* A stage can expose a review state when data requires user intervention.

* The workflow will support a Resolve/Review interaction for outstanding data issues.

* Downstream stages will respect unresolved upstream dependencies.

* A completed Monthly Close will expose a closed state for the financial period.

* Dashboard Close Status will reflect the state of the current financial period.

* The workflow's progress indicator will represent actual workflow state rather than gamification.

* The primary application-level testing seam will be the Monthly Close Workflow Application Boundary.

* The application boundary will expose enough observable state to verify:

  * Workflow start
  * Current stage
  * Stage completion
  * Review-required state
  * Resolution
  * Progress
  * Report completion
  * Period closure
  * Dashboard closing status

* No additional cross-module testing seam is required for this feature unless implementation constraints demonstrate that the single application boundary cannot expose the required external behavior.

* The visual system will use a dark-first design with near-black backgrounds, restrained surfaces, low-contrast borders, and limited accent colors.

* Typography will use a humanist/interface font for UI text and a monospace font for financial and technical data.

* Inter will be used for interface text and JetBrains Mono will be used for numerical and technical data where appropriate.

* The visual system will use an 8px spacing grid.

* Large spacing values such as 64px, 96px, and 128px will be used to preserve the spacious character of major dashboard sections.

* Borders will be subtle and primarily used to establish structural boundaries.

* Components will use restrained corner radii, generally around 4px with 8px as the upper visual limit.

* Charts will prioritize readability and financial relationships over decorative visualization.

* Color will communicate state and meaning rather than serve as general decoration.

* Motion will be short and purposeful, primarily communicating navigation, state changes, and data updates.

* Navigation will normally remain collapsed.

* The Pixel Pet will provide the interaction point for revealing the Navigator.

* The Navigator will use an overlay interaction and will not push or reflow the main dashboard.

* The Pixel Pet will use an original pixel-art mascot design with a small, restrained animation vocabulary.

* The mascot will use idle animation, hover interaction, navigation interaction, and selected system-event reactions.

* Mascot animation will remain low-frequency so that the persistent element does not become distracting during normal financial work.

* The visual hierarchy will follow the principle:

  * Current Financial State
  * Financial Trend
  * Financial Components
  * Financial Workflow
  * Underlying Financial Log

## Testing Decisions

* The primary feature-level test seam is the **Monthly Close Workflow Application Boundary**.

* Tests will focus on externally observable behavior rather than internal implementation details.

* Tests should verify the user's ability to start a closing period and observe the resulting workflow state.

* Tests should verify that a fully valid period progresses through all five stages and reaches the closed state.

* Tests should verify that account reconciliation discrepancies produce an observable review-required state.

* Tests should verify that resolving the discrepancy allows the workflow to continue.

* Tests should verify that unresolved required data prevents the workflow from incorrectly reaching the closed state.

* Tests should verify that Ledger Validation exposes validation results through externally observable workflow state.

* Tests should verify that Debt Update changes the closing workflow state when debt information is successfully processed.

* Tests should verify that all three financial reports become available after successful report generation.

* Tests should verify that a successfully closed period exposes the expected closed status.

* Tests should verify that Overview reflects the closing status after a successful close.

* Tests should verify that workflow progress corresponds to completed stages.

* Tests should verify that dependency states are visible to the user when a downstream stage is waiting.

* Tests should verify that report data remains traceable to the underlying financial data through the user-visible navigation path.

* Tests should avoid asserting:

  * Specific component implementation
  * Internal class structure
  * Internal state management mechanisms
  * Specific database implementation
  * Internal function names
  * DOM structure that is not part of the user-facing contract

* Tests should prefer existing application-level workflow or integration test infrastructure where available.

* If existing test infrastructure provides an application-level boundary capable of exercising the Monthly Close workflow, it should be reused rather than introducing a new test seam.

* If the current architecture does not expose sufficient behavior through one application-level boundary, the implementation should first consider extending that boundary before introducing additional seams.

* Unit tests may continue to exist for individual financial calculations and domain rules, but they are not the primary feature seam for this specification.

## Out of Scope

* Redesigning the underlying financial domain model without a direct requirement from the Monthly Close workflow.

* Replacing the existing ledger/accounting data model.

* Building a banking API integration or automatic bank synchronization system.

* Building a brokerage API integration.

* Building an automated tax filing system.

* Providing financial advice or investment recommendations.

* Implementing investment optimization algorithms.

* Implementing probabilistic retirement forecasting beyond the explicitly defined projection/scenario model.

* Creating a trading interface.

* Turning Ledger into the primary dashboard experience.

* Creating a gamified personal finance experience.

* Adding excessive dashboard widgets solely to increase information density.

* Introducing permanent sidebar navigation.

* Implementing a visually dominant mascot.

* Reproducing copyrighted game character artwork. The Pixel Pet should be an original pixel-art mascot that captures the intended playful visual role.

* Introducing additional high-level testing seams unless required by an implementation constraint.

* Defining specific backend technologies, database schemas, file paths, component names, or internal APIs where the existing project architecture has not yet established them.

## Further Notes

The central product principle is:

> **FINANCE.OS should feel like an engineering system for understanding and operating a household's finances.**

The product should distinguish five different user questions:

```text
OVERVIEW
What is my financial state now?

MONTHLY CLOSE
Is this financial period complete and validated?

REPORTS
What were the accounting results?

LEDGER
What underlying events produced those results?

RETIREMENT
What does the current financial system project into the future?
```

The design system should consistently reinforce these distinctions.

The intended visual character is approximately:

```text
Engineering      80%
Financial        60%
Dark / Minimal   Primary
Technology       Supporting
Personality      Low, concentrated in Pixel Pet
```

The most important visual principle is:

> **Let the numbers breathe.**

The interface should prefer whitespace, hierarchy, alignment, and restrained structure over additional cards, decoration, or information density.

The Monthly Close workflow is a particularly important product differentiator because it connects the user's underlying financial records with formal accounting outputs through an explicit, observable process:

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
```

This workflow should remain understandable at every stage and should make unresolved dependencies actionable rather than merely displaying a generic progress indicator.
