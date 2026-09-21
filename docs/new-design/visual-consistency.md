# ONE PIECE — Visual Consistency Standard

> 工程師用的全站視覺一致性標準。本階段先針對**排版、間距、元件、資訊密度、互動、Responsive、Card 使用方式**統一；不處理 Primary Color（`#5CC8C0` 留到最終 Visual Polish）。

**Version:** 1.0
**Status:** Design Contract
**Product:** ONE PIECE

---

# 0. 核心設計原則

全站所有頁面都遵循：

> **Data > Decoration**
> **Structure > Cards**
> **Space creates hierarchy**
> **Color communicates state**
> **Motion has a purpose**

ONE PIECE 的視覺目標：

> **Dark-first Financial Operating System**

不是：

> Generic SaaS Dashboard
> Generic Fintech App
> Card-heavy Budget App

---

# 1. Page Layout

所有 List / Detail / Workspace 頁面使用一致的 Page Shell。

```
┌──────────────────────────────────────────────┐
│ PAGE HEADER                                  │
│ Title / Description / Actions                │
├──────────────────────────────────────────────┤
│                                              │
│ PRIMARY CONTENT                              │
│                                              │
│                                              │
└──────────────────────────────────────────────┘
```

### Page Header

統一：

```
Title
Short description / context

                         Primary Action
```

例如：

```
ACCOUNTS
Manage household financial accounts.

                                      + ACCOUNT
```

### 規則

- Title：頁面唯一 H1
- Description：最多 1 行
- Action 放右側
- 不要在 Header 再塞大量 Metric
- 不要把 Header 做成 Card
- 不使用大型 hero banner

---

# 2. Page Width

Desktop 使用固定最大內容寬度。

建議：

```
max-width: 1440px
```

但不是所有頁面都一定要撐滿。

### Data-heavy page

例如：

- Transactions
- Accounts
- Debt
- Reports

可以使用較寬：

```
1200–1440px
```

### Reading / Scenario page

例如：

- Retirement
- Account Detail
- Portfolio Detail

可以限制閱讀寬度：

```
960–1200px
```

原則：

> **讓內容決定寬度，不要讓空間被 UI 填滿。**

---

# 3. Spacing System

全站使用一致 spacing scale：

```
4
8
12
16
24
32
48
64
```

### 建議用途

| Space | 用途 |
| ----- | ---- |
| 4px   | icon / text 微間距 |
| 8px   | label → input、icon → text |
| 12px  | table / compact row |
| 16px  | component internal padding |
| 24px  | section internal spacing |
| 32px  | section separation |
| 48px  | major section separation |
| 64px  | page-level breathing room |

### 禁止

不要出現大量：

```
13px
18px
22px
27px
37px
```

除非有特殊 layout 原因。

目標是讓整個系統有**可預測的節奏**。

---

# 4. Section

Section 是 ONE PIECE 最重要的 layout unit。

### 預設

**Section 不需要 border。**

```
INCOME

content...
```

下一個：

```
LIVING EXPENSES

content...
```

靠：

- whitespace
- heading
- divider

建立 hierarchy。

---

# 5. Card 使用標準

### 預設：不要 Card

以下不應預設使用 Card：

- Metric Group
- Table
- History
- Section
- Workflow
- Form
- Chart
- Report section

例如不要：

```
┌──────────────┐
│ TOTAL ASSETS │
│ $8,200,000   │
└──────────────┘
```

改成：

```
TOTAL ASSETS

$8,200,000
```

搭配 whitespace / divider。

### 只有以下情況使用 Card / Module

1. 明確獨立功能模組
2. Interactive module
3. Alert
4. Empty state
5. 特殊 workflow state
6. 需要與 surrounding content 明確隔離的內容

Card 是：

> **boundary**

不是：

> **default container**

---

# 6. Border

Border 的用途是：

> 分隔資訊，不是裝飾。

推薦：

```
1px solid
```

### 使用位置

適合：

- Table row
- Input
- Dropdown
- Dialog
- Drawer
- Module boundary
- Workflow separator

不需要：

- 每個 Section 外框
- 每個 Metric 外框
- 每個 chart 外框

---

# 7. Radius

ONE PIECE 使用低 radius。

標準：

```
4px
```

可以接受：

```
0–6px
```

### 不建議

```
12px
16px
20px
9999px
```

尤其不要把所有 component 都做成：

> rounded-xl

這會非常像一般 SaaS UI。

### Exception

Pill / Badge 可以使用較高 radius，但只限真正需要 pill semantics 的元件。

---

# 8. Shadow

**預設無 Shadow。**

使用：

```
border
background contrast
spacing
```

建立層次。

Shadow 只允許：

- Dropdown
- Popover
- Dialog
- Bottom Sheet
- Floating Navigator
- Overlay

不要：

```
Card → shadow
Metric → shadow
Table → shadow
Section → shadow
```

---

# 9. Typography

ONE PIECE 必須有非常清楚的：

> UI text vs Financial number

區隔。

## UI Text

使用一般 sans-serif：

```
Inter / system sans
```

用於：

- Page title
- Label
- Description
- Button
- Navigation
- Status

## Financial Number

使用 monospace。

例如：

```
$1,250,000
$8,420,000
+12.4%
```

### 規則

- 數字右對齊
- 等寬字體
- 不使用 decorative font
- 不使用過度粗體
- 小數位依實際需求
- 不顯示沒有意義的 `.00`

---

# 10. Financial Number Hierarchy

不要所有數字都做巨大。

### Level 1 — Hero

例如 Net Worth：

```
$8,420,000
```

可以較大。

### Level 2 — Metric

```
$1,250,000
```

中等。

### Level 3 — Table

```
$1,250,000
```

正常大小。

### Level 4 — Secondary

```
+$42,000
```

較小。

原則：

> **數字重要程度決定大小，不是「數字就要大」。**

---

# 11. Tables

所有 Data Table 遵循同一標準。

```
Account                 Ending Balance       As of
────────────────────────────────────────────────────
Main Bank               $1,250,000           Sep 2026 →
Investment              $2,840,000           Sep 2026 →
```

### 標準

- Header muted
- Row height 約 48px
- Numeric right aligned
- Financial number monospace
- subtle divider
- 不使用厚重 border
- 不使用 zebra striping
- hover 有微弱 feedback
- row 可點擊 → 整列 clickable

---

# 12. List → Detail

所有可查看 Detail 的資料遵循：

```
Row
   ↓
Click
   ↓
Detail
```

不要：

```
[View] [Edit] [Delete]
```

散落在每一列。

### List

```
Account Name       Balance       As of       →
```

### Detail

```
ACCOUNT DETAIL

[ Edit ]
```

Action 優先放 Detail。

> **例外（2026-09-21 定案）**：無 detail 頁的資料（如 Transaction）允許 row 端 ghost icon action（Edit / Delete），條件是低干擾（icon-only、muted 色、hover 才浮現語意）；不適用於有 detail 頁的資料。

### Edit 表達方式（2026-09-21 定案）

Detail 頁的編輯入口依欄位複雜度二選一：

- **單一 metadata 欄位**（名稱）→ `InlineEditableTitle` inline edit，掛在 PageHeader title slot。適用：Project / Portfolio / Retirement plan 名稱。
- **多欄位 configuration** → Edit Form（dialog 或 detail 區塊）。適用：Debt / Account。

Rule：`PageHeader` 不知道「怎麼編輯名稱」——`title` 接受 ReactNode，由頁面自行傳入 `<InlineEditableTitle value={...} onSave={...} />`；儲存走既有 update command，成功後頁面自行 refetch/同步 state。

---

# 13. Action Hierarchy

全站最多維持三層：

### Primary

主要完成動作：

```
[ SAVE ]
[ CONFIRM ]
[ CLOSE PERIOD ]
```

### Secondary

次要動作：

```
[ EDIT ]
[ IMPORT ]
```

### Tertiary

低干擾：

```
View details →
More
```

不要同一個區域出現：

```
[Primary]
[Primary]
[Primary]
[Primary]
```

一個 context 通常只需要 **一個 primary action**。

---

# 14. Button

標準高度：

```
32px
36px
40px
```

一般頁面 action：

```
36px
```

主要 CTA：

```
40px
```

Radius：

```
4px
```

### 不要

- 大型 pill button
- 大型 shadow button
- gradient
- excessive icon button

---

# 15. Icon

Icon 是輔助資訊，不是主要資訊。

標準：

```
16px
20px
24px
```

### 規則

- 相同 semantic 使用相同 icon
- icon 不取代必要文字
- destructive action 不靠顏色 alone
- table arrow 統一使用 `→`

---

# 16. Status

Status 不使用大型彩色 Badge。

標準：

```
✓ VERIFIED
● ACTIVE
○ WAITING
! REVIEW
× ERROR
```

### 視覺

```
icon + text
```

而不是：

```
┌───────────┐
│ VERIFIED  │
└───────────┘
```

Color 只負責 semantic meaning。

---

# 17. State Color

目前先**不處理 Primary Accent 改色**。

但 semantic color 規則先固定：

```
Positive → 正向財務結果 / 完成
Warning  → 注意 / Review
Negative → Loss / Error / Problem
Neutral  → 一般資訊
```

不要用顏色表示：

- Account Type
- Month
- Project
- Category

例如：

> 不要用藍色代表 Bank、綠色代表 Cash。

Color 應該表示：

> **State**

不是：

> **Data Type**

---

# 18. Empty State

Empty State 不要做成大型插畫。

標準：

```
○ NO DATA

No accounts have been added yet.

[ + ADD ACCOUNT ]
```

### 原則

- icon / status
- 一句說明
- 一個主要 action

不要：

- 大插畫
- decorative illustration
- 大型 Card
- 大量文字

---

# 19. Loading

一般 loading：

```
Loading...
```

Skeleton 用於：

- Table
- List
- Detail

長時間工作使用 Terminal-style：

```
$ generate-reports --period SEP-2026

[████████████░░░░░░░░] 62%

→ Generating September financial statements...
```

這是 ONE PIECE 的 engineering identity。

---

# 20. Forms

Form 不要變成大型 Card grid。

標準：

```
FIELD LABEL

[ input ]

helper text
```

### 金額

```
Current Annual
                         $1,200,000
```

數字右對齊 + monospace。

### Select

不要使用過度 rounded UI。

---

# 21. Advanced Settings

複雜設定預設隱藏。

例如 Retirement：

```
Growth
Using plan inflation: 2.0%

[ Advanced ]
```

展開：

```
Growth Rate
[       ] %

Start Year
[       ]

End Year
[       ]
```

原則：

> **Default path simple. Advanced path powerful.**

不要把 domain complexity 全部丟給使用者。

---

# 22. Accordion

Accordion 適合：

- Retirement Advanced settings
- Return Calculation
- Detail / Accounting information
- Secondary information

不適合：

- Primary content
- Main table
- Dashboard main metrics

### Header

```
RETURN CALCULATION                         +
```

展開：

```
Previous Value
Current Value
Investment Cash Flow
Non-investment Cash Flow
Calculated Return
Return Rate
```

---

# 23. Drawer / Detail Panel

Drawer 適合：

- Exception detail
- Accounting detail
- Quick review
- Secondary information

不要把完整核心 workflow 塞進 Drawer。

例如 Monthly Close：

```
Current Step
    ↓
Exception
    ↓
[ Review ]
        → Drawer
```

這是合理的。

---

# 24. Workflow

Monthly Close 是全站最重要的 workflow UI。

標準：

```
01 ACCOUNT BALANCE
✓

02 LEDGER
●

03 DEBT
○

04 INVESTMENT & FINANCING
○

05 REPORTS
○

06 REVIEW & CLOSE
○
```

### 原則

Pipeline 告訴使用者：

> **Where am I?**

Current Step 告訴使用者：

> **What do I do?**

Exception 告訴使用者：

> **What needs attention?**

---

# 25. Dashboard

Dashboard 不應成為「所有東西的集合」。

固定 reading path：

```
NET WORTH
↓
12M TREND
↓
FINANCIAL SNAPSHOT
↓
FINANCIAL DETAILS
↓
MONTHLY CLOSE
↓
RECENT ACTIVITY
```

> **修訂（2026-09-21，與實作對照後定案）**：Close 排在 Recent 之前 — Monthly Close 是 workflow 入口（時間敏感），Recent Activity 是低優先系統日誌；與實作一致（#106/#107 / c194cb3）。

不要增加：

- 太多 KPI
- 裝飾性 widgets
- 每個 domain 一張 card
- 不必要的 shortcut

---

# 26. Retirement

Retirement 是：

> **Scenario Workspace**

不是傳統 Dashboard。

固定順序：

```
OVERVIEW
↓
CURRENT FINANCIAL STATE
↓
PROJECTED NET WORTH
↓
CASH FLOW PROJECTION
↓
SCENARIO ASSUMPTIONS
↓
INCOME
↓
LIVING EXPENSES
↓
LIFE EVENTS
```

核心原則：

> **Output first → Input later**

---

# 27. Reports

Reports 是：

> Reading-first

不是 editing UI。

例如 Balance Sheet：

```
ASSETS

Cash
Bank
Securities
────────────────
TOTAL ASSETS

LIABILITIES

Mortgage
Personal Loan
────────────────
TOTAL LIABILITIES

NET WORTH
```

不要：

- Edit button
- Inline editing
- Form fields
- unnecessary Card wrapping

如果需要修改：

```
Report
 ↓
Monthly Close
 ↓
Source Data
```

---

# 28. Mobile

Mobile 不是 Desktop 縮小。

### Desktop

可以：

```
Label | Value | Status | Action
```

### Mobile

轉成：

```
ACCOUNT

Main Bank
$1,250,000
As of Sep 2026
→
```

### 原則

- Single column
- 不使用 horizontal scroll 作為主要解法
- Table → compact rows / grouped list
- Secondary information 可 Accordion
- Primary action 保持容易觸及

---

# 29. Mobile Navigation

ONE PIECE **不使用傳統 Bottom Navigation 作為主 Navigator**。

主 Navigator：

```
Pixel Pet
```

點擊：

```
┌─────────────────────────┐
│ NAVIGATOR               │
│                         │
│ Transaction   Close     │
│ Account       Portfolio │
│ Debt          Project   │
│ Report        Retirement│
└─────────────────────────┘
```

Mobile 使用 Bottom Sheet。

> **修訂（2026-09-21 定案）**：既有 bottom nav + More sheet 退場，Pixel Pet + bottom sheet 為 mobile 唯一導覽入口（Phase 8 收尾範圍）。退場條件：Pet + sheet 覆蓋既有 bottom nav 全部目的地與 More sheet 功能後才移除，不留斷點。

---

# 30. Pixel Pet

Pixel Pet 是：

> Main Navigator

不是裝飾。

### Desktop

固定右下角。

### Click

開 Navigator。

### Current Page

使用 page accent / state 表示目前位置。

### 原則

Pixel Pet 可以有個性，但：

> **不能搶走 financial data 的視覺 hierarchy。**

---

# 31. Header

Global Header 只負責：

```
ONE PIECE
Household
Search / Command
System Status
User
```

不要放：

- Main Navigation
- 大量 shortcuts
- Period selector
- domain actions

Settings：

```
Avatar
 ↓
Settings
Log out
```

---

# 32. Search / Command

三種功能不要混在一起：

```
Command Palette
    ↓
Find / Do / Navigate

Contextual Search
    ↓
Find within current module

Pixel Pet
    ↓
Navigate
```

不要做 Global Search 把整個系統所有資料混在一起。

---

# 33. Charts

Chart 原則：

- faint grid
- minimal axis
- no decorative gradients
- no excessive legends
- no fake zero
- semantic color
- accent trend

### Chart 優先

Portfolio：

> Portfolio Value

而不是：

> Return Rate

Account：

> Balance Trend

Debt：

> Outstanding Balance Trend

Retirement：

> Projected Net Worth

---

# 34. Data Density

ONE PIECE 不是追求「資訊越多越好」。

採：

```
Primary
───────
Secondary
────────
Detail
```

重要資訊第一眼看到。

次要資訊：

- Accordion
- Detail
- Drill-down

不要全部塞在同一畫面。

---

# 35. Interaction Consistency

相同操作在全站應該有相同結果。

例如：

```
Table Row Click
→ Detail
```

```
[ Edit ]
→ Detail / Edit mode
```

```
[ → ]
→ Drill-down
```

```
[ Confirm ]
→ State change
```

不要 Accounts 一種、Debt 一種、Project 又另一種。

---

# 36. Destructive Actions

Delete / Disable / Close 等操作：

```
Action
 ↓
Confirmation
 ↓
State change
```

不要只靠紅色。

Confirmation 必須說清楚：

```
What will happen
What will not happen
[ Cancel ] [ Confirm ]
```

---

# 37. Toast / Notification

Toast 只回報：

- Save success
- Import success
- Error
- Background operation result

不要用 Toast 傳遞重要 workflow instruction。

重要問題應該：

```
Inline Alert
```

或：

```
Exception
```

---

# 38. Responsive 原則

Desktop / Mobile 必須保持相同：

> **Information hierarchy**

而不是相同 layout。

例如：

```
Desktop
Table

        ↓

Mobile
Grouped Rows
```

但 reading order 不變。

---

# 39. Visual Anti-Patterns

工程師 Review 時看到以下情況，優先視為 drift：

### ❌ Card everywhere

```
Card
Card
Card
Card
```

### ❌ Excessive rounded corners

```
rounded-xl
rounded-2xl
pill everything
```

### ❌ Shadow everywhere

### ❌ 彩色代表資料類型

### ❌ 大型 icon / illustration

### ❌ Dashboard widget overload

### ❌ 每列都有 Edit / Delete

### ❌ 所有數字都超大

### ❌ 所有東西都置中

### ❌ Mobile horizontal scrolling table

### ❌ 把 domain terminology 直接暴露給使用者

例如：

```
DERIVED
LEDGER CODE
IMPORT MODE
CALCULATION MODE
```

除非這是 Accounting / Developer view。

---

# 40. 最終 Visual Review Checklist

工程師每完成一個頁面，可以直接用這份 checklist：

```
ONE PIECE VISUAL CHECK

[ ] Page Header 結構一致
[ ] Page width 合理
[ ] Spacing 使用統一 scale
[ ] Section 不濫用 Card
[ ] Border 只用於必要 boundary
[ ] Radius 維持低圓角
[ ] Shadow 只用於 floating elements
[ ] Financial numbers 使用 monospace
[ ] Numeric columns right aligned
[ ] Status 使用 icon + text
[ ] Color 只表達 semantic state
[ ] Primary / Secondary / Tertiary hierarchy 清楚
[ ] List → Detail interaction 一致
[ ] 不存在 row-level action clutter
[ ] Empty state 簡潔
[ ] Loading pattern 一致
[ ] Advanced settings 預設收起
[ ] Chart 無裝飾性元素
[ ] Mobile 為 single-column / responsive layout
[ ] Mobile reading order 與 Desktop 一致
[ ] 沒有 domain implementation details 暴露給使用者
[ ] 沒有不必要的 Card / Pill / Shadow
[ ] Page hierarchy 一眼可讀
```

---

## 最後的判斷標準

如果工程師問「這個元件到底要不要做成 Card？」可以用一個非常簡單的判斷：

> **如果拿掉外框後，資訊層級仍然清楚，就不要做 Card。**

如果問「這個資訊要不要用顏色？」

> **如果它不是 State，就不要用顏色。**

如果問「這個資訊要不要放在第一層？」

> **如果使用者不需要每天做決策，就放到 Detail / Advanced / Accordion。**

這三條基本上就能約束整個 ONE PIECE 的 Visual Consistency。
