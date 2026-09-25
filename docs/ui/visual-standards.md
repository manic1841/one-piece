# 頁面視覺標準 (Visual Standards)

> **邊界宣告**：本文件管**頁面層級的佈局與互動標準**——Page Shell、頁寬、間距用途、空／載入／錯誤狀態、進階設定、工作流版面、Dashboard 版面、報表版面、行動版佈局、搜尋與指令、資料密度、互動一致性、破壞性動作、通知、響應式、反模式與最終 review checklist。**設計 token 與元件表面**（色彩、材質、動態、字體排印、元件尺寸與狀態契約、spacing 級距）屬 [`design-system.md`](design-system.md)；分層、導航／Header 契約、List / Detail / Workflow 動作位置與 RWD 斷點契約屬 [`ui-layer-architecture.md`](ui-layer-architecture.md)。三份文件權威不重疊。

本文件是頁面層級視覺契約的唯一真相來源。已由其他文件承載的契約（Dashboard 資料錨定、關帳階段模型等）一律以指標引用、不在本文件重述；規則差異时以該事實的歸屬文件為準。

---

## 核心設計原則

全站所有頁面遵循：

> **Data > Decoration**
> **Structure > Cards**
> **Space creates hierarchy**
> **Color communicates state**
> **Motion has a purpose**

ONE PIECE 的視覺目標是：

> **Dark-first Financial Operating System**

而不是：

> Generic SaaS Dashboard
> Generic Fintech App
> Card-heavy Budget App

## 頁面佈局 (Page Shell)

所有 List / Detail / Workspace 頁面使用一致的 Page Shell：Page Header 在上，Primary Content 在下。

```text
┌──────────────────────────────────────────────┐
│ PAGE HEADER                                  │
│ Title / Description / Actions                │
├──────────────────────────────────────────────┤
│                                              │
│ PRIMARY CONTENT                              │
│                                              │
└──────────────────────────────────────────────┘
```

Page Header 規則：

- Title：頁面唯一 H1。
- Description：最多 1 行。
- Action 放右側。
- 不要在 Header 再塞大量 Metric。
- 不要把 Header 做成 Card。
- 不使用大型 hero banner。

## 頁面寬度

桌面版以固定最大內容寬度置中。容器上限與斷點切換屬 RWD 斷點契約，見 [`ui-layer-architecture.md`](ui-layer-architecture.md)（[ADR-0044](../adr/0044-rwd-breakpoint-contract.md)），本節不重述數字。

頁面依用途分兩類：

- **資料密集頁**（Transactions、Accounts、Debt、Reports）：可使用完整內容寬度。
- **閱讀 / 情境頁**（Retirement、Account Detail、Portfolio Detail）：限制在較窄的閱讀寬度（約 960–1200px），避免長行。

原則：

> **讓內容決定寬度，不要讓空間被 UI 填滿。**

## 間距

級距本身（`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`）定義在 [`design-system.md`](design-system.md) 的「間距級距」節；本節只定使用場景與禁止事項。

| 級距 | 用途                       |
| ---- | -------------------------- |
| 4px  | icon / text 微間距         |
| 8px  | label → input、icon → text |
| 12px | table / compact row        |
| 16px | component internal padding |
| 24px | section internal spacing   |
| 32px | section separation         |
| 48px | major section separation   |
| 64px | page-level breathing room  |

**禁止**：級距外的任意值（`13px`、`18px`、`22px`、`27px`、`37px`…）不得大量出現，除非有特殊 layout 原因。目標是讓整個系統有**可預測的節奏**。

## 空狀態 (Empty State)

空狀態不插圖、不做大型 Card。標準結構：

```text
○ NO DATA

No accounts have been added yet.

[ + ADD ACCOUNT ]
```

原則：

- icon / status + 一句說明 + 一個主要 action。
- 說明要回答三件事：缺什麼、為何重要、使用者下一步能做什麼。
- 不要大插畫、decorative illustration、大型 Card、大量文字。

## 載入狀態 (Loading)

- 一般 loading：單行文字（`Loading...`）。
- Skeleton 用於 Table / List / Detail。
- 長時間工作使用 Terminal-style 進度——這是 ONE PIECE 的 engineering identity：

```text
$ generate-reports --period SEP-2026

[████████████░░░░░░░░] 62%

→ Generating September financial statements...
```

## 錯誤狀態 (Error State)

- 錯誤必須 **Specific**、**Actionable**、**Close to the affected data**（靠近受影響的資料呈現，而非集中到頁首）。
- `Negative` 色僅用於真正的錯誤或負向狀態。
- 需要使用者解決的問題不得只用通用 toast 蓋掉——改用 inline alert 或 exception 呈現。

## 進階設定 (Advanced Settings)

複雜設定預設隱藏，收在 `Advanced` 展開鈕之後（例：Retirement 的 Growth / Start Year / End Year）。

原則：

> **Default path simple. Advanced path powerful.**

不要把 domain complexity 全部丟給使用者。

## 工作流 (Workflow)

Monthly Close 是全站最重要的 workflow UI。其階段模型、資料建立邊界與確認語意見 [monthly-close.md](../monthly-close.md)，不在本節重述：

- 階段資料建立邊界與 9 階段模型：[monthly-close.md](../monthly-close.md)；取捨理由見 [ADR-0052](../adr/0052-monthly-close-stage-data-boundary.md)。
- workflow-first 表面收斂（pipeline / workspace 分工）：[ADR-0056](../adr/0056-workflow-first-surfaces.md)。

本節只定頁面層級的呈現標準：

- 階段顯示順序與標籤以 `monthlyCloseLabels.ts` 的 `CLOSE_STAGE_LABELS` 為準。
- Pipeline 回答「**Where am I?**」（進度），Current Step 回答「**What do I do?**」（當前動作），Exception 回答「**What needs attention?**」（需注意項目）。

### 帳戶餘額階段排版 (Account Balance)

帳戶餘額階段依 Account Type 分區（現金／銀行／外幣／證券），所有必要輸入直接呈現在 Page 內（單一 Current Step 工作區），不使用 Dialog：

- **缺漏輸入不做 inline 必填提示**，由 WAITING 狀態 glyph（○ WAITING / ✓ VERIFIED）單獨承擔；計算欄（TWD 價值）在缺漏輸入時顯示 $0，不阻擋確認。
- **外幣 row 五欄佈局**：Account（名稱＋幣別）佔獨立欄，前期餘額／外幣金額／匯率／TWD 價值數字欄標籤與數字同軸右對齊（md 以上生效）；欄寬契約見 `FOREIGN_COLUMN_WIDTHS`（14/22/22/8/34，總和＝100）。
- **現金／銀行共用表頭的真表格**：`TwdTableHead`（帳戶／前期餘額／期末餘額）一條 thead，列內不重複欄位標籤；列高 54px（見 `data-table` 的 9px 垂直內距、右側 pr-12px）；md 以下維持卡片列（label 左、值右）。期末餘額輸入框：桌面版 `max-w-[220px]`、手機版 150×34 直角、無原生 spinner。
- **證券表 `table-fixed`**：欄寬由 thead 定義（actions 欄另計），數字欄 header 與輸入框右緣同軸；row 高度 ~48px 標準級距。
- **文字層級**：區塊標題（現金／銀行等）13px/600 亮色＋右側附註小字；欄位標籤 10px/500/.08em；帳戶名稱旁幣別 11px mono；前期餘額數字用預設文字色。
- **取得匯率按鈕在 Account 欄**（單一實體）；inline 錯誤訊息保留，屬操作錯誤回饋而非必填提示。

## Dashboard 版面

Dashboard 不應成為「所有東西的集合」。資料錨定契約（單一已關帳月份、具名例外）見 [ADR-0053](../adr/0053-dashboard-report-anchored.md)；本節只定版面 reading path：

```text
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

Close 排在 Recent 之前：Monthly Close 是時間敏感的 workflow 入口，Recent Activity 是低優先的系統日誌。

不要增加：

- 太多 KPI。
- 裝飾性 widgets。
- 每個 domain 一張 card。
- 不必要的 shortcut。

## 報表版面 (Reports)

Reports 是：

> **Reading-first**

不是 editing UI。以 typography / divider / whitespace 建立層級，不做 Edit button、inline editing、form fields 或非必要的 Card 包裹。

需要修改時走：

```text
Report
 ↓
Monthly Close
 ↓
Source Data
```

## 行動版佈局 (Mobile)

Mobile 不是 Desktop 縮小，而是相同資訊階層的不同排版。

- Single column。
- 不以水平捲動作為主要解法。
- Table → compact rows / grouped list。
- Secondary information 可收進 Accordion。
- Primary action 保持容易觸及。
- Reading order 與 Desktop 一致（見「響應式原則」）。

行動版導覽由 Pixel Pet 獨家擁有，契約見 [`ui-layer-architecture.md`](ui-layer-architecture.md)。

## 搜尋與指令 (Search / Command)

三種功能不要混在一起：

```text
Command Palette   → Find / Do / Navigate（全域）
Contextual Search → Find within current module
Pixel Pet         → Navigate
```

不要做 Global Search 把整個系統所有資料混在一起。

## 資料密度 (Data Density)

ONE PIECE 不追求「資訊越多越好」。採三層：

```text
Primary
───────
Secondary
────────
Detail
```

- 重要資訊第一眼看到。
- 次要資訊收進 Accordion / Detail / Drill-down。
- 不要全部塞在同一畫面。

## 互動一致性 (Interaction Consistency)

相同操作在全站應該有相同結果：

```text
Table Row Click → Detail
[ Edit ]        → Detail / Edit mode
[ → ]           → Drill-down
[ Confirm ]     → State change
```

不要 Accounts 一種、Debt 一種、Project 又另一種。

動作的職責歸屬與落點（List / Detail / Workflow header、Danger Zone）不是本節決定——見 [`ui-layer-architecture.md`](ui-layer-architecture.md) 的「動作位置與 List / Detail 責任切分」。

## 破壞性動作 (Destructive Actions)

Delete / Disable / Close 等不可逆或高影響的操作：

```text
Action
 ↓
Confirmation
 ↓
State change
```

- 不要只靠紅色表達危險。
- Confirmation 必須說清楚 **What will happen** / **What will not happen**，並提供 `[ Cancel ] [ Confirm ]`。

## 通知 (Toast / Notification)

Toast 只回報：

- Save success。
- Import success。
- Error。
- Background operation result。

不要用 Toast 傳遞重要 workflow instruction——重要問題用 inline alert 或 exception 呈現。

## 響應式原則 (Responsive)

Desktop / Mobile 必須保持相同的 **Information hierarchy**，而不是相同 layout：

```text
Desktop
Table
        ↓
Mobile
Grouped Rows
```

Reading order 不變。斷點與導覽切換契約見 [`ui-layer-architecture.md`](ui-layer-architecture.md) 與 [ADR-0044](../adr/0044-rwd-breakpoint-contract.md)。

## 視覺反模式 (Anti-Patterns)

工程師 Review 時看到以下情況，優先視為 drift：

- ❌ **Card everywhere**——每個區塊都套 Card。
- ❌ **Excessive rounded corners**——`rounded-xl` / `rounded-2xl` / pill everything。
- ❌ **Shadow everywhere**。
- ❌ **彩色代表資料類型**。
- ❌ **大型 icon / illustration**。
- ❌ **Dashboard widget overload**。
- ❌ **每列都有 Edit / Delete**。
- ❌ **所有數字都超大**。
- ❌ **所有東西都置中**。
- ❌ **Mobile horizontal scrolling table**。
- ❌ **把 domain terminology 直接暴露給使用者**（`DERIVED`、`LEDGER CODE`、`IMPORT MODE`、`CALCULATION MODE`…），除非這是 Accounting / Developer view。

## 最終視覺 Review Checklist

每完成一個頁面，直接以此 checklist 掃描：

```text
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

### 最後的判斷標準

- 問「這個元件到底要不要做成 Card？」→ **如果拿掉外框後，資訊層級仍然清楚，就不要做 Card。**
- 問「這個資訊要不要用顏色？」→ **如果它不是 State，就不要用顏色。**
- 問「這個資訊要不要放在第一層？」→ **如果使用者不需要每天做決策，就放到 Detail / Advanced / Accordion。**

這三條基本上就能約束整個 ONE PIECE 的 Visual Consistency。
