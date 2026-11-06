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

> 原則 4 的**具名例外**：以顏色編碼「分類」而非「狀態」的並列拆解圖（donut）使用 `chart-*` 類別色板；這道例外只適用於分類拆解，不得用於金額或狀態呈現，見 [ADR-0081](../adr/0081-chart-tone-vs-categorical-palette.md)。

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

### 入口畫面 (Entry / Gate Surface)

登入、拒絕存取、Onboarding 與啟動失敗（`AppFallback`）**不套用 Page Shell**：它們在主介面之外，只完成單一任務，因此共用置中窄欄、鋪滿視窗高度的版面殼 `GateSurface`（見 [`component-catalog.md`](component-catalog.md)）。

- 無導覽、無 Page Header；一個畫面只回答一件事。
- 頁面唯一 H1 即該畫面標題。
- 失敗訊息用 inline alert（`AppFallback` 例外——啟動失敗走其內建文案區，非表單錯誤）。
- 內容與間距由呼叫端決定；`GateSurface` 只提供版面（`children` ＋ `className`）。

## 頁面寬度

桌面版以固定最大內容寬度置中，全站所有頁面共用同一個容器，頁面**不另外設定寬度**（不寫頁面層級的 `max-w-*`）。容器上限與斷點切換屬 RWD 斷點契約，見 [`ui-layer-architecture.md`](ui-layer-architecture.md)（[ADR-0044](../adr/0044-rwd-breakpoint-contract.md)），本節不重述數字。

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

複雜設定預設隱藏，收在 `Advanced` 展開鈕之後（例：交易表單的進階欄位；退休規則的參數只隨所選 Method 出現，不預先鋪滿）。

原則：

> **Default path simple. Advanced path powerful.**

不要把 domain complexity 全部丟給使用者。

### 欄位順序與上下層揭露 (Field Order & Disclosure)

選取 Phase 的編輯器若同時修改它所屬的 Event，桌機以並列的 Event / Phase 區域呈現，避免把必要欄位藏在收合層級，也讓窄欄位不被整個頁寬拉長；行動版依 Event → Phase 的閱讀順序垂直堆疊。兩者都屬於同一個選取細節，不重複顯示摘要列。

其他「剛選中的東西」與「它的上層」編輯面板仍遵循以下順序：

1. **選中的東西先出現**——它是這個面板存在的理由。
2. **上層物件收在上方的揭露列**，摘要行右側以單行小字顯示識別值，點開才出現欄位。
3. **上層欄位有錯誤時強制展開**，訊息不得藏在收起的區域裡。
4. 上層的值若已由摘要行呈現，面板標題與描述不再重述一次。

揭露列只用在「同一筆編輯的上下層」，與上面的 `Advanced`（同一層的選填欄位）是兩件事。

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
- **Terminus 是頁面視覺終點**：字級跳級、列高加大、最重的上緣線，並以 `primary`（品牌色）強調最終總結——這是財務報表唯一的彩色強調；其餘角色維持中性語言，不用彩色。
- **不變式**：同一角色在三張表一致；明細不再因落在不同深度而在表間有不同大小與顏色。

### 關帳報表表格階層 (Financial Reports Statements)

Financial Reports 三張表是一個**沒有欄名標題列的單表**，由資料本身的階層建立結構：

- **報表切換沿用全站 tabs 分頁**（樣式見 [`design-system.md`](design-system.md) 的 `tabs`）：桌機才顯示分頁；行動版不顯示分頁，三張表依序堆疊並各帶標題。
- **每張表帶摘要指標列**：表上方為該表的三個關鍵合計（損益表：收入／支出／本期淨利；資產負債表：資產／負債／權益；現金流量表：期初餘額／期末餘額／現金淨變動），以 `MetricGroup` 排版（非卡片），實際餘額仍只以表下註腳呈現。結果型指標（本期淨利、現金淨變動）依正負上色，其餘維持中性；月度關帳在當期值上另加漂移變化行（muted）。行動版標題與指標列一起堆疊在表格上方（見 [`component-catalog.md`](component-catalog.md) 的 `StatementPanel`）。
- **列樣式依「財務報表語意階層」**（上節）。
- **階層以縮排表達**（級距見 [`design-system.md`](design-system.md) 的「間距級距」），可摺疊、**預設展開**、chevron 置於標籤**左側**；摺疊狀態跨分頁切換**不保留**（切回重置為展開）。
- **金額欄一律靠表格最右**，與標籤欄兩欄配置（欄寬為程式碼常數）。
- **現金流的實際餘額為表下的 muted 註腳**（對帳性質的次要觀察值），不與現金淨變動等重。
- **行動版沿用同一張兩欄表**（標籤換行、無水平捲動），並沿用同一套語意階層，不另做 grouped card；資產負債表的五項權益來源固定呈現（含 0），確保 breakdown 不因歸零而被隱藏。

### 報表檢視 (Report View)

報表檢視是回看已產生報表的介面，分為清單與 detail，兩者一律讀**已產生報表**、不做漂移比對（與關帳畫面的預覽契約刻意不同，見 [ADR-0077](../adr/0077-report-view-shows-persisted-close-shows-preview.md)）。

- **清單**：header（標題 ＋ 說明）→ **財務摘要**（總資產、淨資產、總負債、儲蓄率四個 KPI，詳見下節 Analysis View）→ **報表歷史**。KPI 取分析錨點（最新有資產負債表的期間，含未關帳）；尚無報表時四格皆為「—」。
- **報表歷史**：每列一個期間（期間、淨利、期末權益、期末現金），最新在前、全列不分頁；月／年切換是同一份資料的兩種粒度（年度為月報表聚合，見 [`CONTEXT.md`](../../CONTEXT.md) 的 Report Year）。狀態標記**僅在非已關帳時**顯示，已關帳為預設不標。四欄表格自 `lg` 起顯示；`lg` 以下（含平板）改用 grouped row，避免期間與狀態在窄欄被拆字。
- **detail**：header（期間 ＋ 上／下導覽）→ 底線式 tabs（三張報表）；每張表沿用上節「財務報表語意階層」與關帳報表的表格／分頁契約（同一份共用呈現）。導覽為純日曆移動，任何期間皆可開啟，該期無報表顯示空狀態；非已關帳期間於 header 提供次級動作前往月度關帳。
- **三態**一律沿用共用元件：載入＝Skeleton、錯誤＝ inline 提醒 ＋ 重試、空＝空狀態（detail 空狀態帶期間）；不使用 spinner 或純文字紅字。

### 歷史財務分析 (Analysis View)

`/reports/analysis` 是報表的分析子頁，**reading-first、不起卡片**，區塊以帶狀分節（[ADR-0090](../adr/0090-report-analysis-single-route-and-anchor.md)、[financial_analysis.md](../financial_analysis.md)）。

- **Header**：標題「歷史財務分析」、麵包屑「報表」回首頁；不另放返回按鈕。導覽標籤與 Pixel Pet 不變。
- **摘要句**：header 下第一行是完整語句的結論（淨資產、較上期變化、儲蓄率、負債比），先給答案再看圖；句中淨資產數字單獨放大為 20px 並用 tabular-nums，其餘維持 16px `foreground`，不做 hero。缺任何一項時該句只保留有值的片段。
- **資料截止列**：摘要句下方的小字列「資料截至 `YYYY-MM`」，有未關帳時同一句帶「含 N 期未關帳」，其後以 `StatusGlyph` 帶「未關帳月份」標籤列出月份；超過 6 期收斂為「<最早月份> 起等 N 期」並連到報表歷史。
- **區塊索引**：`sticky` 於 header 下方、`border-y` 與 `backdrop-blur` 分離（共七個）；錨點連結只放區塊名稱、不重複錨點值（值由各區塊標題承擔），行動版水平捲動並把 active 連結移進可視範圍。當前節以底線與 `aria-current` 標示（`IntersectionObserver` 取視窗上三分之一），捲動時索引本身不隨頁面重排。點擊連結平滑捲動至區塊並把焦點移到該區塊，`prefers-reduced-motion` 下不強制平滑。
- **範圍與粒度控制**：範圍 `1Y／3Y／5Y／All`、粒度 `月／年`，皆以 `aria-pressed` 表達選取、replace 更新網址；產生相同結果的選項移除，只剩一個時該條控制隱藏。切換粒度會清除選取期間。
- **選取期間摘要**：點選圖上任一期間即導覽到該期報表；`?period=` 是不導覽的深連結，解析後選取該期並顯示摘要列——該期淨資產、總資產、總負債、儲蓄率、負債比與「查看 `期間` 完整報表」按鈕。未關帳期間標「暫估」。選取期間是整頁共用狀態：所有圖表標記同一點；各區塊標題值固定取錨點期，缺該期的區塊顯示「—」。
- **財務摘要 KPI（landing）**：總資產、淨資產、總負債、儲蓄率。僅「標籤＋數字」是連結區，外框留白不喫點擊、命中高度至少 44px；箭頭桌機 hover 出現、觸控常駐；`aria-label` 具名目的地。四格共用的期間與未關帳狀態只在區塊標題顯示一次，不逐格複製；標題列右側另有 `Button variant="text"`「查看完整分析 →」。
- **淨資產趨勢**：全寬，淨資產為實線＋`primary` 單色面積（accent 保留給主要趨勢）；總資產與總負債為預設關閉的虛線脈絡，走右軸（與左軸的淨資產量級分開）。桌機 320、行動版 200。
- **資產類別構成**：現金／投資／不動產三條固定序列的 100% 堆疊面積，顏色走類別色板（`chart-1`／`chart-4`／`chart-3`，經 `ComposedChart` 的 `colorToken`，非語意 tone）。`chart-3` 與 `warning` 同值：重疊處由參考線的 background casing 與虛線形式區隔，不換色以免與 donut 的類別映射脫鉤。y 軸固定 0–100、刻度 0／25／50／75／100 並標 `%`；圖例切換只改可見性，分母固定總資產、不重新歸一化。tooltip 用 list 模式：只列可見序列，每類別一列、金額與佔比同層，並帶該類別色塊。桌機 240、行動版 160。
- **投資績效**：上層報酬金額柱（正 `positive`／負 `negative`，桌機 160），下層 96px 報酬率折線（`investment`、零基準），共用月份、x 軸與同一份 tooltip、不使用右軸；折線承擔 x 標籤。兩層 tooltip 都採 hero 模式：報酬金額是唯一主要值，報酬率與期初市值為輔助列，隱藏的序列不列；期初市值是報酬率的尺度，報酬率隱藏時仍保留。報酬金額被隱藏時 hero 位置顯示「—」，不把輔助值升格。區塊下方固定一行 muted「家庭層、市值加權，報酬已排除期間現金流」。
- **負債與槓桿**：全寬、三層同節：負債餘額柱（`negative`，桌機 160）→ 96px 負債比折線（`neutral`）→ 96px 加權平均槓桿折線（`investment`），各層以分隔線與單位標籤區隔、不使用右軸。三層共用同一份 hero tooltip：負債餘額是主要值，負債比與加權平均槓桿為輔助列（槓桿列只在該層存在時出現），隱藏的序列不列；負債比另附較前期變化，以「個百分點」而非「%」表示。負債餘額被隱藏時 hero 位置顯示「—」。槓桿值在 tooltip 顯示至小數第四位再去尾零，不用固定兩位截斷。槓桿層只在目前範圍任一點大於 1 時渲染；否則底部一行 muted「此範圍內持倉無槓桿」。x 標籤由最下層可見折線承擔；窄幅比率軸靠 `yDecimals` 固定小數位，避免刻度重複。
- **收支與儲蓄率**：上半為收入／支出並列柱（`positive`／`negative`，桌機 160），下半為 96px 儲蓄率折線（`asset`），共用月份與 x 軸、**不使用右軸**；柱圖不出 x 標籤，由下方折線承擔（折線被切換隱藏時，x 標籤回到柱圖）。兩張圖以分隔線與「儲蓄率 %」單位標籤區隔，避免兩套尺度讀成一張圖。收入是 tooltip 的 hero，儲蓄率與較前期的儲蓄**金額**變化（不列比率變化）都是輔助列，公式註記固定在區塊下方。
- **淨現金流**：零基準柱，正值 `positive`、負值 `negative`，桌機 160；區塊下方有現金基礎的 muted 提醒。
- **現金覆蓋**：全頁最後一節、全寬。單一折線（`positive`、零基準、`null` 斷線），桌機 240、行動版 160；tooltip 依序固定列覆蓋月數（一位小數）、現金、近三月平均支出，缺 window 的點以「—」呈現但仍可選取。區塊標題小字為 `YYYY-MM · X 個月`，底部固定 muted 公式註記「現金與銀行資產（含定存）÷ 近三月平均支出」。非 `null` 點數不足 2 期時顯示不足說明。
- 資產類別構成與投資績效、收支與淨現金流在 `lg` 成對並排（欄距 40px）、`md` 以下堆疊；淨資產、負債槓桿與現金覆蓋永遠全寬。
- 區塊標題右側以小字顯示該區塊的**錨點期**與值（`期間 · 值`，年粒度為 `YYYY`），未關帳期間加「（未關帳）」，不加變化率；選取期間的摘要留在摘要列，不改寫標題。淨資產 tooltip 以淨資產為 hero、另列較前期的金額變化率；收支列儲蓄金額變化、負債比列百分點變化，皆為輔助列。tooltip 內容分 hero（單一主要指標）與 list（多個平行項目）兩種語義模式；欄位順序只決定顯示次序，不決定層級。
- 圖表高度只有三組固定值（`tall` 320／200、`standard` 240／160、`compact` 160／160），不依點數多寡再切換。
- **點選即下鑽**：桌機 hover 有預覽，單擊（或 Enter／空白鍵）導覽到該期報表；深連結 `?period=` 解析後只選取、不導覽。tooltip 標題在未關帳期間加「（未關帳）」，與選取摘要的「暫估」一致。
- **未關帳**：每段連續未關帳月份的第一筆畫 `warning` 參考線並標「未關帳」，同一區段只標一次；標籤只畫在第一張圖，其餘圖共用同一個座標，不重複標。參考線與標籤以 background casing 墊底，確保壓在分類色帶上仍可辨識。`Alert` 只給載入錯誤。
- **三態**與報表檢視相同（Skeleton／warning alert ＋重試／空狀態）；載入時每個區塊各自一塊等高 Skeleton，不回應頁級骨架上整頁等待。資料不足 2 期顯示說明而非空圖。

### Detail 頁的次要閱讀層 (Detail Secondary Layers)

Detail 頁把低頻決策的資訊收在可摺疊面板與列展開之後，讓主結論（summary）先被讀到：

- **區塊級折疊**：次要 section 可整段收進可摺疊面板，面板標題即 section 標題，**預設展開**；展開狀態**不持久**（切換檢視即重置）。
- **列展開**：同一份資料的「彙總列 → 該列明細」用**列展開**承擔。彙總列是唯一的互動列（chevron 置於標籤**左側**、`aria-expanded`），展開顯示該列明細；展開中的列不加 hover 底色，明細列一律不得有 hover 呈現。**chevron 與整列是同一個意圖**：兩者行為一致（選取＋切換展開），不得讓相鄰的兩個目標給出不同結果；chevron 命中區至少 32px。
- **權威值優先**：每月彙總以已結算的快照為權威，缺快照時退回該月明細合計；SUMMARY 固定為最近 12 個月合計，實體餘額取最新快照並獨立於 summary 呈現（專案詳情以 hero 數字承擔），兩者都不隨展開狀態跳動。
- **可推導的聚合不另開表**：能由明細推導的聚合（如支出分類）不另開表格，改由展開明細承擔。
- 行動版以可展開的 grouped row 呈現同一組資料，不另做第二套結構。

## 行動版佈局 (Mobile)

Mobile 不是 Desktop 縮小，而是相同資訊階層的不同排版。

- Single column。
- 不以水平捲動作為主要解法。
- Table → compact rows / grouped list。
- Secondary information 可收進 Accordion。
- Primary action 保持容易觸及。
- 底部固定列（sticky dock）以 `--bottom-overlay`（由 shell 量測系統級固定浮層髮布，無浮層時為 `0`）加上 `env(safe-area-inset-bottom)` 讓位，永不與固定浮層或 home indicator 重疊；高度不得寫死。
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
- **兩者共用同一條 toolbar 細線**：情境篩選列只畫選中態底線，不畫自己的容器框線；細線由 toolbar 提供，選中態底線咬住該細線。

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
- ❌ **Excessive rounded corners**——`rounded-xl` / pill everything。
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
[ ] Color 只表達 semantic state（分類拆解圖的 `chart-*` 類別色板為具名例外，見 ADR-0081）
[ ] Primary / Secondary / Tertiary hierarchy 清楚
[ ] List → Detail interaction 一致
[ ] 不存在 row-level action clutter
[ ] Empty state 簡潔
[ ] Loading pattern 一致
[ ] Advanced settings 預設收起
[ ] Chart 無裝飾性元素（面積僅允許單色資料歸屬漸層，見 ADR-0078）
[ ] Mobile 為 single-column / responsive layout
[ ] Mobile reading order 與 Desktop 一致
[ ] 沒有 domain implementation details 暴露給使用者
[ ] 沒有不必要的 Card / Pill / Shadow
[ ] Page hierarchy 一眼可讀
[ ] 畫面組合與 gallery 對應 section 一致（自製替代即 drift）
```

### 最後的判斷標準

- 問「這個元件到底要不要做成 Card？」→ **如果拿掉外框後，資訊層級仍然清楚，就不要做 Card。**
- 問「這個資訊要不要用顏色？」→ **如果它不是 State，就不要用顏色。**（唯一例外：以顏色編碼分類的拆解圖，見 ADR-0081）
- 問「這個資訊要不要放在第一層？」→ **如果使用者不需要每天做決策，就放到 Detail / Advanced / Accordion。**

這三條基本上就能約束整個 ONE PIECE 的 Visual Consistency。
