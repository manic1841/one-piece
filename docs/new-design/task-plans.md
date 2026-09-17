如果你現在要從「設計共識」正式進入實作，我建議**不要按照畫面一頁一頁做**，而是按照「底層能力 → 核心 Workflow → UI → 延伸功能」來做。

尤其你的系統有 `Ledger / Account / Debt / Report` 的資料依賴，最重要的是先把 **Monthly Close** 這條主線打通。

---

# 建議實作順序

```text
Phase 0  Architecture / Existing Code Audit        ✅
             ↓
Phase 1  Design System Foundation                  ✅
             ↓
Phase 2  Financial Data Foundation                 ✅（併入 M1）
             ↓
Phase 3  Monthly Close Workflow  ← 核心            ✅（M1）
             ↓
Phase 4  Dashboard                                 ✅ v1
             ↓
Phase 5  Accounts / Ledger / Debt / Reports
             ↓
Phase 6  Portfolio
             ↓
Phase 7  Retirement
             ↓
Phase 8  Navigator + Pixel Pet                     ◐ 基礎已落地（#109/#110）
             ↓
Phase 9  Integration / Polish / E2E
```

其中 **Phase 3 是整個專案的核心 milestone**。

## 修訂（2026-09-16，與既有程式碼對照後）

Phase 0 audit 已完成（現有快照/債務同步/報表生成/完整性檢查/監看清單皆已存在）。決策：

> **文件歸屬原則**：本資料夾（docs/new-design/）是設計討論期的暫置文件。Redesign 落地後，spec/ui 的內容應拆解併入 docs/ 底下的正式文件（architecture.md、data-structure.md、transaction-flow.md、financial_report.md 等），資料夾本身退役或僅保留實作計畫。docs/adr/ 是專案永久決策紀錄，不引用任何 spec 代號。

> **修訂（2026-09-17，Grilling 三輪後；取代同日稍早「Phase 8 維持最後」的決策）**
>
> - **Phase 8 的核心提前**：Navigator + Pixel Pet 的互動基礎（Desktop Header、隱藏式 Navigator、Pet trigger）提前到 layout session（Session A）實作；Phase 8 剩餘範圍 = 正式 pixel-art mascot 視覺 + Mobile Navigator 統一整理 + 隱藏導覽收尾。移除桌面 permanent sidebar 提前，正好消解 spec 的 non-goal。
> - **Header ≠ Navigator**：Header 是 System Status Bar（品牌 + 靜態 SYSTEM ONLINE + 今日日期 + Household Switcher / Search / Settings / Avatar）；Navigator 平時隱藏，由右下角 Pixel Pet trigger 開啟（Desktop: hover 反應 + click 開 overlay，滑鼠移開不關閉；Mobile: tap 開 bottom sheet，與既有 bottom nav 共存）。
> - **品牌定案**：產品名稱統一 ONE PIECE（header、layout、index.html title）；FINANCE.OS 僅作為設計討論代號，不作為產品名。
> - **版本**：package.json 升 1.1.0，Footer 顯示 ONE PIECE v1.1.0。
> - **進度**：Phase 0-4 已完成（audit、design system、M1 Monthly Close vertical slice、Dashboard v1）；layout session（Session A，#109 sticky header）已於 2026-09-17 落地 — Desktop Header（System Status Bar）取代 permanent sidebar 與舊 mobile top bar，內容統一 `max-w-7xl mx-auto`；#110 Pixel Pet placeholder + Navigator（desktop floating panel + mobile bottom sheet）已於 2026-09-17 落地；#111 Site Footer（ONE PIECE v1.1.0 + tagline，版本經 Vite define 讀取 package.json）已於 2026-09-17 落地；#112 Dashboard stat row（總資產/總負債錨定最近關帳報表 + 下月應付獨立 read-only use case，grace-aware）已於 2026-09-17 落地；Phase 5 finance modules 排在其後。

**Phase 2+3 合併為一個 vertical slice（M1）**。Phase 2 的資料基礎大多已存在（見 ADR-0018）；真正的新增是財務期間狀態（ADR-0050）、關帳工作流階段模型（ADR-0052）、工作流 use case 與其 UI。合併後 M1 = 期間狀態 + 八階段工作流（`/close` 專屬路由，單一關帳入口）+ 一條高階整合測試。M1 使用 S2 已落地的設計系統（dark tokens、Inter + JetBrains Mono、4px radius、StatusGlyph）；UI 全面重設計另開 session，排在 M1 之後。
- **Monthly Close 為前端 use case**（ADR-0002 無後端），不是 `POST /monthly-close/start`。
- 其餘順序照原規劃。

## 已完成紀錄（Phase 0-4）

- **Phase 0 — Architecture Audit**：盤點既有 frontend/backend/database/routing/domain/test 基礎；產出 architecture map。快照、債務同步、報表生成、完整性檢查、監看清單皆已存在。
- **Phase 1 — Design System Foundation**：dark-first token（`src/index.css`）、Inter + JetBrains Mono、4px radius、StatusGlyph 狀態系統、eslint token gate；詳見 ui.md Phase 1 完成紀錄。
- **Phase 2 — Financial Data Foundation**：資料基礎大多已存在（ADR-0018）；新增財務期間狀態（ADR-0050）併入 M1。
- **Phase 3 — Monthly Close（M1）**：八階段工作流 `/close` 單一入口（ADR-0052）；期間狀態 + 工作流 use case + UI + 一條高階整合測試（ADR-0018/0020/0051）。
- **Phase 4 — Dashboard v1**：report-anchored（ADR-0053）— 錨點 + NET WORTH hero + Financial Pulse 四指標 + Monthly Close 狀態 + Recent Transactions（issues #104-#107）。

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

> **修訂（2026-09-17）**：互動基礎提前到 layout session（Session A）— Desktop Header（移除 permanent sidebar）、Pixel Pet trigger（右下角圓形 placeholder，hover 輕微反應 + click 開 Navigator）、Navigator Overlay（2×4 grid，8 項：Transaction / Close / Account / Portfolio / Debt / Project / Report / Retirement；Dashboard 為 Home 不進 panel，點 ONE PIECE 品牌回首頁）、Pet reaction API（idle / happy / nod / alert）、Footer。本 Phase 剩餘範圍 = 正式 pixel-art mascot 視覺（換視覺不換 interaction contract）、Mobile Navigator 統一整理（與 bottom nav 的長期收編）。

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

---
