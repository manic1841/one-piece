如果你現在要從「設計共識」正式進入實作，我建議**不要按照畫面一頁一頁做**，而是按照「底層能力 → 核心 Workflow → UI → 延伸功能」來做。

尤其你的系統有 `Ledger / Account / Debt / Report` 的資料依賴，最重要的是先把 **Monthly Close** 這條主線打通。

---

# 建議實作順序

```text
Phase 0  Architecture / Existing Code Audit
             ↓
Phase 1  Design System Foundation
             ↓
Phase 2  Financial Data Foundation
             ↓
Phase 3  Monthly Close Workflow  ← 核心
             ↓
Phase 4  Dashboard
             ↓
Phase 5  Accounts / Ledger / Debt / Reports
             ↓
Phase 6  Portfolio
             ↓
Phase 7  Retirement
             ↓
Phase 8  Navigator + Pixel Pet
             ↓
Phase 9  Integration / Polish / E2E
```

其中 **Phase 3 是整個專案的核心 milestone**。

## 修訂（2026-09-16，與既有程式碼對照後）

Phase 0 audit 已完成（現有快照/債務同步/報表生成/完整性檢查/監看清單皆已存在）。決策：

> **文件歸屬原則**：本資料夾（docs/new-design/）是設計討論期的暫置文件。Redesign 落地後，spec/ui 的內容應拆解併入 docs/ 底下的正式文件（architecture.md、data-structure.md、transaction-flow.md、financial_report.md 等），資料夾本身退役或僅保留實作計畫。docs/adr/ 是專案永久決策紀錄，不引用任何 spec 代號。

**Phase 2+3 合併為一個 vertical slice（M1）**。Phase 2 的資料基礎大多已存在（見 ADR-0018）；真正的新增是財務期間狀態（ADR-0050）、關帳工作流階段模型（ADR-0052）、工作流 use case 與其 UI。合併後 M1 = 期間狀態 + 八階段工作流（`/close` 專屬路由，單一關帳入口）+ 一條高階整合測試。M1 使用 S2 已落地的設計系統（dark tokens、Inter + JetBrains Mono、4px radius、StatusGlyph）；UI 全面重設計另開 session，排在 M1 之後。
- **Phase 1 待決策後才動工**：暗色優先 token、Inter + JetBrains Mono、4px radius、glyph 狀態系統的細節另開 session 討論（詳見 ui.md 修訂）。
- **既有殘留**：約 108 處 amber/indigo/purple/sky 硬編碼（25 檔）與 4 檔 `dark:` slate 補丁，於 Phase 1 一併清掃，之後才是「一檔換主題」。
- **Monthly Close 為前端 use case**（ADR-0002 無後端），不是 `POST /monthly-close/start`。
- **Phase 8（Pixel Pet + 隱藏導覽）維持最後**，移除桌面側邊欄屬於該階段，不提前。
- 其餘順序照原規劃。

---

# Phase 0 — 先不要寫 UI

### 目標

先搞清楚現在專案已經有什麼，避免重複開發。

建立一份：

```text
CURRENT SYSTEM MAP
```

至少確認：

* Frontend framework
* Backend framework
* Database
* 現有 routing
* 現有 domain model
* Ledger 現況
* Account 現況
* Debt 現況
* Report 現況
* Portfolio 現況
* Retirement 是否已存在
* Authentication
* API layer
* 現有 test framework
* 現有 E2E / integration test

### 這個 Phase 的產出

```text
Architecture Map
Domain Map
Existing API Map
Existing Test Map
```

**這一步很重要。**

因為我們前面討論的是產品設計，不應該假設你的 codebase 還是空的。

---

# Phase 1 — Design System Foundation

先把視覺基礎建立好。

### Task 1.1 — Theme

建立：

```text
Dark background
Surface
Border
Primary text
Secondary text
Accent
Positive
Negative
Warning
```

### Task 1.2 — Typography

```text
Inter
JetBrains Mono
```

建立：

```text
Display
H1
H2
H3
Body
Label
Mono / Financial
```

### Task 1.3 — Spacing

建立 8px spacing system：

```text
8
16
24
32
48
64
96
128
```

### Task 1.4 — Core Components

先做最少的一組：

```text
Button
Text
Input
Select
Tabs
Table
Status
Divider
Tooltip
Dialog
Progress
```

### Task 1.5 — Financial Components

再做：

```text
Metric
Financial Number
Trend
Chart
Data Table
Status Indicator
Workflow Step
```

**這裡不要開始做 Dashboard。**

先讓 component library 穩定。

---

# Phase 2 — Financial Data Foundation

這一階段是後端核心。

先把資料關係確認：

```text
                 Ledger
                   │
        ┌──────────┼──────────┐
        ↓          ↓          ↓
     Account     Debt      Portfolio
        │          │
        └──────┬───┘
               ↓
             Report
```

### Task 2.1 — Financial Period

建立明確的：

```text
Financial Period
```

例如：

```text
2026-09
status = OPEN
```

狀態至少需要能表達：

```text
OPEN
IN_PROGRESS
NEEDS_REVIEW
CLOSED
```

---

### Task 2.2 — Account Reconciliation

建立：

```text
Bank Balance
Ledger Balance
Difference
Reconciliation Status
```

核心邏輯：

```text
Bank Balance
      -
Ledger Balance
      =
Difference
```

---

### Task 2.3 — Ledger Validation

確認：

* Ledger entry 是否有效
* 是否屬於該 period
* 是否有需要 review 的 entry

---

### Task 2.4 — Debt Update

確認每個 Debt Account：

```text
Outstanding Balance
Monthly Payment
```

可以在 Monthly Close 中被更新。

---

### Task 2.5 — Report Generation

建立：

```text
Balance Sheet
Income Statement
Cash Flow Statement
```

**先不要追求漂亮。**

先確保：

> 給定一組 Financial Data → 能產生正確 Report。

---

# Phase 3 — Monthly Close

這是第一個真正的 **Vertical Slice**。

不要先做 5 個頁面。

直接做：

> **Start Monthly Close → Closed**

M1 階段模型見 ADR-0052（八階段，逐階段確認建立該階段資料）；`/close` 為單一關帳入口，原 Phase 3.2 的 Account Reconciliation 獨立階段已移除（報表本身呈現現金一致性，ADR-0020/0051）。

## Task 3.1 — Start Close

```text
Start Monthly Close (frontend use case)
```

概念上：

```text
OPEN (no record)
 ↓
IN_PROGRESS
```

---

## Task 3.3 — Completeness Check

```text
Completeness Check
       ↓
zero-activity anomalies?
```

如果：

```text
YES → NEEDS_REVIEW（解除＝完成該階段確認）
NO  → IN_PROGRESS
```

---

## Task 3.4 — Data-Creation Stages

銀行帳戶餘額、證券買賣、Portfolio 金流、專案結算、債務還款：每個階段確認時冪等建立該階段的資料（快照或交易）；還款共用 `createDebtPaymentUseCase` 的原子邊界。

---

## Task 3.5 — Report Generation

```text
Generate
 ├── Balance Sheet
 ├── Income Statement
 └── Cash Flow
```

---

## Task 3.6 — Close Period

```text
Reports persisted (isPersisted)
      ↓
CLOSED
```

---

# Phase 3 完成的 Definition of Done

你應該可以跑完這個 scenario：

```text
September 2026

START CLOSE
     ↓
Accounts ✓
     ↓
Ledger ✓
     ↓
Debt ✓
     ↓
Reports ✓
     ↓
CLOSED ✓
```

而且這個流程應該有 **一個高階 integration test**。

這就是我們之前定義的：

> **Monthly Close Workflow Application Boundary**

---

# Phase 4 — Dashboard

Monthly Close 主線穩定後，才做 Dashboard。第一版為 **report-anchored**（ADR-0053）：整頁錨定最新已關帳期間的 report 月份，單一時間點，不顯示 live 資料。

```text
NET WORTH            AUG 2026 REPORT

$4,821,320
        ───────────╮   (12 個月 netAssets sparkline, 缺月斷開)
                   ╰──────

Financial Pulse      (跟隨 hero 月份)

Net Cash Flow         ← 現金流量表 netCashChange
Investment Return     ← 該月 portfolio snapshots 月報酬率
Investment Leverage   ← 該月 snapshots 推導
Monthly Debt Payment  ← 該月 DEBT_PAYMENT 實際還款總和


Monthly Close

AUG 2026
✓ CLOSED              ← M1 financialPeriodAccessUseCases + StatusGlyph


Recent Transactions   ← 最新 ~8 筆 live 事件流 (不跟隨錨定月)
```

實作切分（tracer-bullet issues）：#104 錨點 + NET WORTH hero + 頁面重寫；#105 Financial Pulse 四指標；#106 Monthly Close 狀態區塊；#107 Recent Transactions + polish。

### Dashboard 第一版不要做

* 大量 cards
* 太多 charts（只保留 hero 的 12 個月 sparkline）
* 太多 breakdown
* 複雜 filters
* 動畫
* 下月還款預測、其他新增資訊（post-v1 scope 討論）

先確認：

> **這個畫面是不是一眼就能理解目前財務狀態。**

---

# Phase 5 — Finance Modules

這時候才逐一做：

## 5.1 Accounts

```text
Account list
Account detail
Monthly balance
Reconciliation
```

## 5.2 Ledger

```text
Ledger list
Ledger detail
Filters
Project View
```

## 5.3 Debt

```text
Debt accounts
Monthly payment
Outstanding balance
Paydown trend
```

## 5.4 Reports

```text
Balance Sheet
Income Statement
Cash Flow
Period selector
View Source → Ledger
```

這四個其實可以共用大量 component。

---

# Phase 6 — Portfolio

Portfolio 相對獨立，因此放在 Monthly Close 主線之後。

第一版：

```text
Portfolio Value
Return
Asset Allocation
Investment Leverage
```

之後才考慮更細的：

```text
Individual Holdings
Performance
Transactions
```

---

# Phase 7 — Retirement

這是另一個獨立的 domain。

我會拆成：

### 7.1 Projection Engine

先不要做 UI。

輸入：

```text
Current Age
Retirement Age
Life Expectancy
Current Assets
Annual Income
Annual Expense
Inflation
Investment Return
Debt
```

輸出：

```text
Year
Age
Income
Expense
Investment Return
Net Cash Flow
Asset Balance
```

---

### 7.2 Scenario

```text
Baseline
Early Retirement
High Expense
```

---

### 7.3 UI

最後才做：

```text
Projection Chart
Cash Flow
Parameters
Scenario Selector
Simulation Status
```

---

# Phase 8 — Navigator + Pixel Pet

**這個反而最後做。**

因為它不是核心 financial capability。

先確保：

```text
Dashboard
Accounts
Ledger
Portfolio
Debt
Reports
Retirement
Monthly Close
```

全部可以正常使用。

最後才：

```text
Pixel Pet
      ↓
Hover
      ↓
Navigator
      ↓
Navigation
```

這樣不會讓一個 UI gimmick 阻塞核心產品開發。

---

# Phase 9 — Polish

最後才做：

### Visual

* spacing
* typography
* chart refinement
* responsive
* empty state
* loading
* error state

### Interaction

* transition
* hover
* keyboard navigation
* shortcut

### Financial UX

* invalid data
* reconciliation mismatch
* incomplete period
* failed report
* closed period modification

### Testing

最後跑完整：

```text
Unit
   ↓
Integration
   ↓
Monthly Close E2E
   ↓
Visual QA
```

---

# 我會把 Issue / Task 結構做成這樣

不要建立 70 個零碎 ticket。

先建立 **9 個 Epic / Milestone**：

```text
01  Architecture Audit
02  Design System
03  Financial Data Foundation
04  Monthly Close
05  Dashboard
06  Finance Modules
07  Portfolio
08  Retirement
09  Navigation & Pixel Pet
10  Polish & QA
```

然後每個 Epic 裡再拆 3–8 個 implementation tasks。

---

# 最重要：用「Vertical Slice」控制進度

我不建議：

```text
Backend 全部做完
      ↓
Frontend 全部做完
      ↓
Testing
```

而是：

```text
Financial Period
      ↓
Account Reconciliation
      ↓
Ledger Validation
      ↓
Debt
      ↓
Report
      ↓
Close
      ↓
UI
      ↓
E2E
```

先把**一條完整路徑跑通**。

---

# 第一個 Milestone 我會定成

## `M1 — Monthly Close Vertical Slice`

### Backend

* Financial Period
* Account reconciliation
* Ledger validation
* Debt update
* Report generation
* Close state machine

### Frontend

* Monthly Close page
* Workflow status
* Step progress
* Review state
* Resolve action
* Completion state

### Test

```text
START
 ↓
VALIDATE
 ↓
REVIEW
 ↓
RESOLVE
 ↓
GENERATE
 ↓
CLOSE
```

如果這個 Milestone 完成，你其實就已經證明了整個 FINANCE.OS 的核心架構是成立的。

---

## 實際開發順序，我會濃縮成這張表

| 順序    | Milestone                          | 目的                      |
| ----- | ---------------------------------- | ----------------------- |
| 0     | Architecture Audit                 | 確認現有 codebase           |
| 1     | Design System                      | 建立視覺基礎                  |
| 2     | Financial Data Foundation          | 建立資料與 domain 基礎         |
| **3** | **Monthly Close**                  | **打通核心 workflow**       |
| 4     | Dashboard                          | 呈現 Financial State      |
| 5     | Accounts / Ledger / Debt / Reports | 完整資料操作                  |
| 6     | Portfolio                          | 投資模組                    |
| 7     | Retirement                         | 長期 Financial Simulation |
| 8     | Navigator / Pixel Pet              | UX personality          |
| 9     | Polish / QA                        | 最終品質                    |

### 第一個真正值得你今天開始動手的 Task

不是「做 Dashboard」。

而是：

> **Define Financial Period + Monthly Close state machine + application-level workflow interface**

因為一旦這個核心成立，後面的 Account、Ledger、Debt、Report、Dashboard 都有一條清楚的資料與狀態流可以接上。
