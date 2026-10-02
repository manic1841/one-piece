# 頁面視覺標準 (Visual Standards)

> **邊界宣告**：本文件管**頁面層級的佈局與互動標準**——Page Shell、頁寬、間距用途、進階設定、工作流版面、Dashboard 版面、報表版面、行動版佈局、搜尋與指令、資料密度、互動一致性、破壞性動作、通知、響應式、反模式與最終 review checklist。**設計 token 與元件表面**（色彩、材質、動態、字體排印、元件尺寸與狀態契約、spacing 級距）屬 [`design-system.md`](design-system.md)；分層、導航／Header 契約、List / Detail / Workflow 動作位置與 RWD 斷點契約屬 [`ui-layer-architecture.md`](ui-layer-architecture.md)；空／載入／錯誤三態的義務與無障礙契約屬 [`states-and-a11y.md`](states-and-a11y.md)。四份文件權威不重疊。

本文件是頁面層級視覺契約的唯一真相來源。已由其他文件承載的契約（Dashboard 資料錨定、關帳階段模型等）一律以指標引用、不在本文件重述；規則差異時以該事實的歸屬文件為準。

全站畫面的**視覺規範樣板**是 `/gallery` 路由（dev-only，以真實共用元件呈現）：新畫面開發一律先照 gallery 對應 section 的組合方式實作，不用自製替代。樣板規則與維護責任屬 [`component-catalog.md`](component-catalog.md)「規則」節，本節不重複。

---

## 核心設計原則

全站所有頁面遵循以下**優先序**；當兩條原則衝突、或規則未涵蓋當前情況時，序號**小**的優先：

1. **Data > Decoration**
2. **Structure > Cards**
3. **Space creates hierarchy**
4. **Color communicates state**
5. **Motion has a purpose**

Tie-break：若一個做法同時符合與違反多條原則，以序號較小的原則勝出；仍不明確時，選**裝飾較少、新元素較少**的那一個。`development-guide` §4 的六個提問是同一判斷的展開。

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
- **閱讀 / 情境頁**（Retirement、Account Detail、Portfolio Detail）：限制在較窄的閱讀寬度，避免長行。容器上限屬 RWD 斷點契約，見 [`ui-layer-architecture.md`](ui-layer-architecture.md)。

原則：

> **讓內容決定寬度，不要讓空間被 UI 填滿。**

## 間距

級距本身與對應的 Tailwind token 定義在 [`design-system.md`](design-system.md) 的「間距級距」節；本節只定使用場景與禁止事項。

| 級距 | 用途                       |
| ---- | -------------------------- |
| 最小 | icon / text 微間距         |
| 次小 | label → input、icon → text |
| 小   | table / compact row        |
| 中小 | component internal padding |
| 中   | section internal spacing   |
| 大   | section separation         |
| 特大 | major section separation   |
| 最大 | page-level breathing room  |

上表的級距對應 design-system 級距由小到大的八個值；具體數字以該節為準，不在本節複述。

**禁止**：級距外的任意值不得大量出現，除非有特殊 layout 原因。目標是讓整個系統有**可預測的節奏**。

## 狀態 (States)

空、載入、錯誤三態的必備義務——標準結構、文案要求、呈現位置與錯誤呈現方式——屬 [`states-and-a11y.md`](states-and-a11y.md)。本節不重述，也不保留摘要版本。

## 進階設定 (Advanced Settings)

複雜設定預設隱藏，收在 `Advanced` 展開鈕之後（例：Retirement 的 Growth / Start Year / End Year）。

原則：

> **Default path simple. Advanced path powerful.**

不要把 domain complexity 全部丟給使用者。

## 工作流 (Workflow)

Monthly Close 是全站最重要的 workflow UI。其階段模型、資料建立邊界與確認語意見 [monthly-close.md](../monthly-close.md)，不在本節重述：

- 階段資料建立邊界與 8 階段模型：[monthly-close.md](../monthly-close.md)；取捨理由見 [ADR-0052](../adr/0052-monthly-close-stage-data-boundary.md)。
- workflow-first 表面收斂（pipeline 分工、per-stage 自成一體）：[ADR-0056](../adr/0056-workflow-first-surfaces.md)（#209 修訂：各階段獨立 step 元件取代單一 workspace frame）。

本節只定頁面層級的呈現標準：

- 階段顯示順序與標籤以 `monthlyCloseLabels.ts` 的 `CLOSE_STAGE_LABELS` 為準。
- Pipeline 回答「**Where am I?**」（進度），Current Step 回答「**What do I do?**」（當前動作），Exception 回答「**What needs attention?**」（需注意項目）。

### 帳戶餘額階段排版 (Account Balance)

帳戶餘額階段依 Account Type 分區（現金／銀行／外幣／證券），所有必要輸入直接呈現在 Page 內（單一 Current Step 工作區），不使用 Dialog：

- **缺漏輸入不做 inline 必填提示**，由狀態 glyph 單獨承擔；計算欄在缺漏輸入時顯示 0，不阻擋確認。操作錯誤仍以 inline 錯誤訊息就近呈現。
- **外幣 row 五欄佈局**：Account（名稱＋幣別）佔獨立欄，前期餘額／外幣金額／匯率／TWD 價值等數字欄的標籤與數字同軸右對齊（桌機佈局）。
- **現金／銀行共用表頭的真表格**：一條 thead（帳戶／前期餘額／期末餘額），列內不重複欄位標籤；行動版維持卡片列（label 左、值右）。
- **證券表**：數字欄表頭與輸入框右緣同軸。

欄寬、列高、內距與字級層級等表面規格見 [`design-system.md`](design-system.md) 的 `data-table` 與其「字體排印」節；具體欄寬常數與同軸對齊由程式碼承擔。

該階段專屬的呈現決定（取得匯率按鈕的位置）屬 [`monthly-close.md`](../monthly-close.md)。

## Dashboard 版面

Dashboard 不應成為「所有東西的集合」。資料錨定契約（單一已關帳月份、具名例外）見 [ADR-0053](../adr/0053-dashboard-report-anchored.md)；本節只定版面 reading path：

```text
NET WORTH
↓
12M TREND
↓
FINANCIAL SNAPSHOT
↓
ASSETS ∥ MONTHLY CASH FLOW
↓
MONTHLY CLOSE ∥ RECENT ACTIVITY
```

ASSETS 與 MONTHLY CASH FLOW 並排於同一列：左為資產組成（圓環）、右為月現金流（流入／流出長條），兩欄等寬（行動版上下堆疊）。資產只顯示組成，負債不重複列出（負債已由 Financial Snapshot 的「總負債」與月關帳流程承載）。

MONTHLY CLOSE 與 RECENT ACTIVITY 並排於同一列：左為 Monthly Close、右為 Recent Activity，兩欄等寬（行動版上下堆疊，Close 在上）。Close 在左，因為它是時間敏感的 workflow 入口、Recent Activity 是低優先的系統日誌。Monthly Close 卡以階段狀態清單呈現進度，並以進度條總結完成比例。

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

### 財務報表語意階層 (Financial Statement Semantic Hierarchy)

財務報表的列由**語意角色**決定樣式，不是由縮排深度決定。同一個角色在三張表（損益表／資產負債表／現金流量表）必須長得一樣——語意階層是報表層級的設計契約，不是單張表的排版選擇。

```text
Section → Group → Detail → Deep detail → Subtotal → Terminus
```

| 角色            | 語意                                                                               |
| --------------- | ---------------------------------------------------------------------------------- |
| **Section**     | 報表的一級區塊（收入／支出；資產／負債／權益；營業／投資／融資活動），代替欄名表頭 |
| **Group**       | 第一層資料（薪資、餐飲；現金與銀行、貸款；流入、流出）                             |
| **Detail**      | 第二層資料（`subItems`，例如「薪資 › Charles」、賬戶名）                           |
| **Deep detail** | 第三層以下                                                                         |
| **Subtotal**    | 每個 Section 的合計（收入合計／支出合計／各活動合計／資產合計…）                   |
| **Terminus**    | 整表的收束點：損益表＝本期淨利；資產負債表＝負債 + 權益；現金流量表＝現金淨變動    |

各角色的字級、字重、邊界與列樣式定義在 [`design-system.md`](design-system.md) 的 `data-table`。

規則：

- **Section 是區塊而非 Card**：只用微背景帶與一條下緣細線區隔，不加圓角、不加外框、不加重陰影。小字大寫與全站表頭語言一致，但提亮成 `foreground`，讓它高於底下資料列而非弱於資料列。
- **Subtotal 靠線與字重建立層級**，不使用背景色（只有 Section 與 Terminus 帶微背景）。
- **Terminus 是頁面視覺終點**：字級跳級、列高加大、最重的上緣線。財務報表維持中性語言，不用品牌色色條或彩色強調。
- **不變式**：同一角色在三張表一致；明細不再因落在不同深度而在表間有不同大小與顏色。

### 關帳報表表格階層 (Financial Reports Statements)

Financial Reports 三張表是一個**沒有欄名標題列的單表**，由資料本身的階層建立結構：

- **報表切換沿用全站 tabs 分頁**（樣式見 [`design-system.md`](design-system.md) 的 `tabs`）：桌機才顯示分頁；行動版不顯示分頁，三張表依序堆疊並各帶標題。
- **列樣式依「財務報表語意階層」**（上節）。
- **階層以縮排表達**（級距見 [`design-system.md`](design-system.md) 的「間距級距」），可摺疊、**預設展開**、chevron 置於標籤**左側**；摺疊狀態跨分頁切換**不保留**（切回重置為展開）。
- **金額欄一律靠表格最右**，與標籤欄兩欄配置（欄寬為程式碼常數）。
- **現金流的實際餘額為表下的 muted 註腳**（對帳性質的次要觀察值），不與現金淨變動等重。
- **行動版沿用同一張兩欄表**（標籤換行、無水平捲動），並沿用同一套語意階層，不另做 grouped card；資產負債表的五項權益來源固定呈現（含 0），確保 breakdown 不因歸零而被隱藏。

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

## 交易頁期間瀏覽 (Transactions Period Browsing)

交易頁 toolbar 的期間選擇（`TransactionPeriodPicker`，feature-local）與情境篩選列的語意不同，不得混為一談：

- **期間是 server-side 資料範圍**：選擇即重新向後端載入該期間的交易（預設本月）；type filter 與搜尋是 client-side 的已載入資料過濾。兩者各自獨立，期間切換不清空搜尋或 filter。
- **預設集只有三個**：本月、最近 3 個月、自訂日期（單選互斥）。「自訂日期」展開 FROM/TO 輸入，以 套用 提交；範圍倒置顯示就近 inline 錯誤，不送出請求。
- **選擇即套用**：preset 選定立即重新載入，不暫存 draft；只有自訂日期走 draft + 套用。
- **期間瀏覽的落點在 toolbar 右側**，與情境篩選列並列；情境篩選列的樣式契約見 [`design-system.md`](design-system.md) §7 `tabs`。

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

- 不要用 Toast 傳遞重要 workflow instruction——重要問題的呈現方式屬 [`states-and-a11y.md`](states-and-a11y.md) 的錯誤狀態。

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
- ❌ **把 domain terminology 直接暴露給使用者**（`DERIVED`、`LEDGER CODE`、`IMPORT MODE`、`CALCULATION MODE`、`CALCULATED`…），除非這是 Accounting / Developer view。

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
[ ] 畫面組合與 gallery 對應 section 一致（自製替代即 drift）
```

### 最後的判斷標準

- 問「這個元件到底要不要做成 Card？」→ **如果拿掉外框後，資訊層級仍然清楚，就不要做 Card。**
- 問「這個資訊要不要用顏色？」→ **如果它不是 State，就不要用顏色。**
- 問「這個資訊要不要放在第一層？」→ **如果使用者不需要每天做決策，就放到 Detail / Advanced / Accordion。**

這三條基本上就能約束整個 ONE PIECE 的 Visual Consistency。
