# 設計系統 (Design System)

> 依據：Apple《Designing Fluid Interfaces》(WWDC 2018)、《The Details of UI Typography》(WWDC 2020)、《Principles of Great Design》(WWDC 2026) 的 web 平台轉譯。
>
> **邊界宣告**：本文件管**設計 token 與元件表面**（色彩、材質、動態、字體排印、元件尺寸與狀態契約）。**頁面層級的佈局、間距、資料密度與互動標準**屬 [`visual-standards.md`](visual-standards.md)，兩份文件權威不重疊。

本文件是設計 token 與元件表面契約的唯一真相來源。實作以本文件為準；若與 `ui-layer-architecture.md` 的分層規則衝突，以分層規則為準——呈現層契約不涉入資料流、ViewModel/Hook 職責邊界與 display label API。

---

## 1. 現況診斷

| 問題 | 位置 | 違反的原則 |
| --- | --- | --- |
| 預設 shadcn slate 樣板配色，無自訂設計語言 | `src/index.css` | Craft |
| 灰/藍硬編碼繞過 token 系統 | `Layout.tsx`（`bg-gray-50`、`text-blue-600`、`bg-blue-50`、`border-gray-200` 等） | Craft、一致性 |
| 不透明 chrome：sidebar/topbar/bottom nav 皆為實心色 + 1px 邊框 | `Layout.tsx` | Materials & depth |
| 按下無回饋：僅 `transition-colors`，無 press 狀態，回饋依賴 hover | `button-variants.ts` | Response（回饋應發生在按下瞬間） |
| 無 motion 系統：僅 `tailwindcss-animate`，無 easing/duration token | `tailwind.config.js` | Behavior over animation |
| 無 reduced-motion / reduced-transparency / contrast 處理 | 全域 | Accessibility |
| 卡片、對話框、sheet 的層級（elevation / blur 強度）無一致性規範 | `src/ui/components/ui/*` | Spatial consistency、Craft |

架構面沒有問題：feature-first 目錄、ViewModel/Hook 分層、`src/ui/components` 設計系統歸屬、display label 經 constants API 取得，皆已就位。重設計是在既有骨架上換皮膚與神經系統，不是重建。

## 2. 設計方向

### 2.1 色彩

記帳工具的介面應該安靜、可信、資料優先。方向：**維持現有色板原值（深 navy 主色與 `chart-1..5` 不動）**，重設計集中在材質、互動回饋與排版；唯一新增的色彩契約是金額語意 token。

- `primary` 維持 `hsl(222.2 47.4% 11.2%)` 原值；`chart-1..5` 維持現狀，僅將硬編碼 hex 對齊 token（見任務三）。
- 基底沿用現有 `background`/`card` 層級，不更換色相；層級改由材質（2.3）而非色差承擔。
- 新增金額語意 token `positive`（收入/資產）與 `negative`（支出/負債警示），定義於 `src/index.css` 並註冊進 `tailwind.config.js`；全站金額一律經此 token 呈現，`destructive` 維持紅系並僅用於不可逆動作。
- 新增 `border-strong` token（比 `border` 亮一階），定義於 `src/index.css` 並註冊進 `tailwind.config.js`；`badge`/`alert` 等需要可見邊界的元件改用它，避免深色底上邊界消失。
- 本輪僅維護淺色主題；`.dark` 色板為已知死代碼（無任何切換機制生效），保留不動，主題切換屬未來分支，屆時一次處理色板配對與切換機制。

### 2.2 動態（Motion）

原則：**回饋在按下瞬間、動畫可被中斷、路徑對稱**。本專案的互動以點擊/觸發為主（無拖曳手勢），因此以 CSS transition + `tailwindcss-animate` 為動態基礎，不為觸發式動畫引入 spring 函式庫。

Token（定義於 `tailwind.config.js`，全部走 CSS 變數）：

| Token | 值 | 對應 |
| --- | --- | --- |
| `duration-fast` | `120ms` | press 回饋、小狀態切換 |
| `duration-base` | `240ms` | hover、開合、色彩過渡 |
| `duration-slow` | `400ms` | 位移、materialize（對應 response 0.4s） |
| `ease-out-quint` | `cubic-bezier(0.22, 1, 0.36, 1)` | 進場、展開（類似 critically damped，無 overshoot） |
| `ease-in-quint` | `cubic-bezier(0.75, 0, 0.85, 0.4)`（`ease-out-quint` 的反向控制點） | 退場，使路徑與進場對稱 |

規則：

- 按壓回饋：`active:scale-[0.97]` + `duration-fast`，所有可互動元素一律具備。
- 開合類（dialog、sheet、dropdown）：進場 `ease-out-quint`、退場 `ease-in-quint`，時長 `duration-slow` 內。
- 可逆轉換（開 ↔ 關、進 ↔ 退）必須鏡像 easing；單向回饋（hover、focus）用單一 `ease-out`。
- 僅動 `transform`、`opacity`、`backdrop-filter`；避免逐幀動 layout 屬性（width/height/top/left）。

### 2.3 材質與層級

以半透明層 + `backdrop-filter` 建立層級，取代實心色 + 1px 邊框：

| 層級 | 材質 | 適用 |
| --- | --- | --- |
| L0 內容 | `bg-background`，無模糊 | 頁面主體 |
| L1 浮動 chrome | `bg-background/75` + `blur(20px) saturate(180%)`，大表面配較深陰影 | desktop sidebar、mobile top bar、bottom nav |
| L2 對話框 / sheet | 更強模糊 + 最深陰影 + 週邊 scrim | dialog、sheet |
| L3 小型元素 | 實心 `card` / `popover` + 陰影，不使用透明 | dropdown、popover、toast |

規則：

- 1px 邊框僅保留在需要精確分隔的表單/表格；浮動 chrome 與內容交界處改用 scroll-edge 漸層淡出，僅在浮動 UI 實際覆蓋捲動內容時出現。
- 透明層之上不再疊透明層；popover 疊在 sidebar 上時改用 L3 實心材質。
- 深色主題下提高半透明層的不透明度（視覺上的玻璃在暗處需更厚），確保文字對比。

### 2.3.1 半徑與陰影收斂

- `rounded-lg`（`--radius` = 0.25rem）為容器預設半徑；`rounded-xl` 已全站移除。`rounded-md`/`rounded-sm` 用於按鈕與小型 chip，`rounded` 用於 inline badge。
- `rounded-full` 僅保留本質圓形元素：avatar、switch、spinner、狀態點、資料膠囊（progress 軌道）；pill / badge / icon button 類一律方角。
- 陰影預設不使用；僅浮出層保留（dialog、sheet、dropdown、popover、select、toast、command palette、switch knob、L1 浮動 chrome）。Card base 無陰影，hover 不升起陰影。
- Summary / Metric / Section / History / Table / Workflow 表面不強制 Card，改以 Typography / Divider / Whitespace 分層；Card 保留給 distinct module、interactive module、alert、special state。

### 2.4 字體排印

- 正文使用系統字體堆疊（含 `'Noto Sans TC'` 以覆蓋繁中）；`src/index.css` 另引入 `@fontsource-variable/inter`（拉丁正文）與 `@fontsource-variable/jetbrains-mono`（等寬）。
- `font-mono`（JetBrains Mono）為正式的資料樣式：金額、日期、代碼、badge、座標軸與標籤性 UI（FROM/TO/APPLY 等）一律使用；段落正文維持系統字體，不以等寬呈現長文。
- Tracking 隨尺寸變化，定義於 Tailwind `letterSpacing`：display `-0.02em`、heading `-0.01em`、body `0`、caption `0.01em`。
- Leading 與尺寸反比：標題 `leading-tight`、內文 `leading-relaxed`。
- 間距一律用 `rem`/`em`，尊重使用者瀏覽器字體大小設定。
- 頁面標題使用重量（`font-semibold`/`font-bold`）建立層級，不以加大尺寸為唯一手段。

### 2.5 八原則對照

| 原則 | 本專案的落實 |
| --- | --- |
| Purpose | 不裝飾性圖表、不無意義動畫；每個 token 都有對應使用場景 |
| Agency | 不可逆動作（刪除、還原備份）用確認對話；可逆動作（停用、登出）不阻擋主流程 |
| Responsibility | 金額色訊一致（收入/支出/負債），避免誤讀財務狀態 |
| Familiarity | 關閉一律在對話框右上；sheet 進出同側；同類操作同位置 |
| Flexibility | 淺/深主題、RWD 斷點契約、reduced-motion/transparency 全覆蓋 |
| Simplicity | 每頁先呈現最常用的路徑，進階選項一層之後 |
| Craft | token 化、easing 鏡像、press 回饋、scroll-edge 處理 |
| Delight | 七項做對後的結果：介面安靜、回應即時、材質有層次 |

### 2.6 元件模式

- `badge`：小圓角 + `border-strong` 可見邊界 + `font-mono text-[11px]`，棄用 rounded-full 藥丸；`destructive` 變體以 `border-negative/40 text-negative` 呈現。
- `alert`：單列模式——`role="alert"` 容器 + 狀態 glyph + `AlertDescription` + 文字動作按鈕（`button-variants` 的 `text` variant）；不再提供 `AlertTitle` 標題槽。
- `button`：新增 `text` variant（透明底、透明邊界、tertiary 動作），與 `outline`/`ghost` 互補。
- `progress`：`bg-muted` 實心軌道 + `bg-accent` 填充，保留 `role="progressbar"`。
- `YearMonthPicker`：按鈕式（`MON YYYY ▾` outline 按鈕）+ Popover 內雙 Select；選擇僅暫存在 picker 內部（draft state），按 APPLY 才 commit，Escape/外點取消。
- 確認對話：以 promise-based `useConfirm()`（`ConfirmDialogProvider` 全站掛載）取代 `window.confirm`；結構為 Title → Context → Consequence → Actions（outline Cancel + destructive 確認）。字串輸入預設 destructive "DELETE"（不可逆刪除）；可逆動作必須傳結構化 options 並使用非 destructive 標籤（如 "DISABLE"）。
- `sortable-list`：共用 `src/ui/components/sortable/` 模式（issue #152）——`GripHandle` activator button（h-8 w-8、`touch-none`、focus ring、`active:scale-[0.97]`）+ 三感應器（Pointer distance 8px、Touch delay 180ms、Keyboard sortableKeyboardCoordinates）；僅 grip 可拖曳，row click 導覽不受干擾；DndContext 放在 Table 外層（aria-live div 不可成為 tbody 子元素）。細節見 ADR-0059。
- `data-table`：全站表格共通原則（2026-09-23 定案）。首個合格實作為 monthly close account step；其他頁面逐一確認後遷移，不批次套用。
    - **通則**：所有 Data Table 遵循同一標準——表頭 muted、數字右對齊、財務數字 monospace、細分隔線；不使用厚重 border、不使用 zebra striping。可查看 Detail 的資料整列可點擊（List → Detail），不用 row 端常駐 View/Edit 按鈕。
    - **結構**：真表格 `table-fixed` + `border-collapse`；欄寬為明確 % 數且總和必須＝100（瀏覽器會等比壓縮超寬表格，破壞跨表對齊）；同頁多表格共用欄寬常數以保持跨表同軸。
    - **Header**：10px / 500 / uppercase / 0.08em / muted、row 約 40px、`pb-[9px]`、`align-bottom`、底線 `border-b border-border`；文字欄表頭左對齊、數字欄表頭右對齊（與資料同軸）。
    - **對齊**：一般文字欄左對齊；數字欄右對齊 + `font-mono` + `tabular-nums`；日期/代碼欄 mono。
    - **數字**：table 層級正常大小（`text-sm`）；不顯示無意義 `.00`；空值顯示「—」。
    - **Input 數字**：34px 高（子表格可 32px）、右對齊 mono、`tabular-nums`、無原生 spinner（`[appearance:textfield]` + webkit spin button `appearance-none`）、空值填「—」。
    - **列高/內距**：資料列 54px（`h-[54px]` 是**最小**列高）、td padding `9px 12px`（pr 用 `pr-3`）。垂直內距必須讓「最高的 cell 內容（34px 輸入框）＋上下內距＋1px 分隔線」≤ 54px，否則列高會被內容撐開——純文字列不受影響（本來就由最小列高撐滿）。`border-b border-border` 細分隔線、無 zebra。
    - **Vertical alignment**：th `align-bottom`、td `align-middle`。
    - **Mobile**：`md:hidden` grouped cards——label 左 / 值右的 row representation；淡 row boundary（`border-t border-border/60`）可接受，不做成厚重 Card；禁止行動版橫向捲動。
    - **Hover**：**僅整列可點擊的列**提供 `hover:bg-muted/50`。hover 底色是「這列可點擊」的 subtle feedback 契約，不是表格的預設裝飾——不可點擊的列（純資料列、編輯中的輸入列、展開中的子列）一律不得有 hover 底色，避免暗示不存在的互動。列內可互動元素（ghost icon action、grip handle）的 hover 由該元素自身承擔，不擴散成整列底色。
    - **Selected**：`bg-muted` 實心（`data-[state=selected]:bg-muted` 或條件 class），配合既有 `border-b-0` 與 `bg-muted/50` 展開列模式。
    - **Card 包裹**：Table 不預設用 Card；Card 只在「需要明確包住一個獨立操作／狀態／資訊模組」時使用（snapshot history 等獨立模組可用，編輯中的 stage 表格不用）。
    - **列內動作**：有 detail 頁的資料整列可點擊走 List → Detail，不用 Actions 欄；無 detail 頁允許 row 端 ghost icon action（icon-only、muted、hover 語意）。
    - **Pointer event priority**：整列導覽與列內拖曳（grip）並存時，優先序為「點擊/輕觸列的普通區域 → 導覽 Detail；在 grip 上點擊/拖曳 → 拖曳排序，且不觸發導覽」。grip 的互動必須 stop propagation 並抑制拖曳結束後的一次 click，但**不得因此關閉整列的導覽能力**；reorder mode 期間整列導覽維持有效。三種禁止的實作缺陷：點 grip 同時開啟 Detail、drag 結束才觸發 row click、reorder mode 直接停用 row click。

## 3. 分階段實作計畫

> 執行契約：任務依下列分組切分；單一任務無法完成時再切分為多次任務，最後整體驗收。檢查點設在任務二完成後（材質化 + 截圖確認品味），通過後才繼續任務三。

### 任務一：token、互動回饋與金額語意（Phase 0 + Phase 1 + 金額 token）

1. `tailwind.config.js`：擴充 `transitionDuration`、`transitionTimingFunction`、`letterSpacing`，註冊 `positive`/`negative` 語意色。
2. `src/index.css`：新增 `--positive`/`--negative` token、全域系統字體堆疊（2.4）、`-webkit-tap-highlight-color: transparent`、三種 accessibility media query 基礎規則（reduced-motion 關閉 transform 動畫保留 opacity、reduced-transparency 提高 L1 材質不透明度並移除模糊、contrast 增加邊框對比）。
3. `button-variants.ts`：加入 `active:scale-[0.97]`、transition 擴及 transform、`duration-fast`；各 variant 的 hover 狀態改用 token 色。
4. 巡查 `input`/`select`/`checkbox`/`switch`/`tabs` 的 focus-visible 環與按壓回饋補齊。
5. 金額語意遷移：`dashboardDisplay.vm.ts`、`retirementDisplay.vm.ts` 改回傳 `text-positive`/`text-negative` 語意 class，對應測試的字面斷言同步更新。
6. 驗證：`pnpm exec tsc -b`、`pnpm lint`、`pnpm test`。

### 任務二：Chrome 材質化（Phase 2）

1. `Layout.tsx`：移除硬編碼灰/藍，mobile top bar、bottom nav、desktop sidebar 改為 L1 半透明材質（2.3），內容從其下捲動。
2. 交界處以 scroll-edge 漸層取代 1px 邊框；`prefers-reduced-transparency` 時退回實心。
3. 導覽選取狀態以 `duration-fast` transition 呈現；若升級為跨項目滑動指示器（需 layout animation），屆時再評估引入 `motion` 並記錄理由。
4. 硬編碼清掃以任務二實際碰到的檔案為限（chrome 與金額語意色）；完整 52 檔的機械式清掃屬任務三。

### 任務三：元件級 Craft 與完整清掃（Phase 3）

1. `card.tsx`：elevation 階梯（預設 L3 實心 + 陰影；可選 elevated variant），半徑一致。
2. `dialog.tsx` / `sheet.tsx`：materialize——進場 scale 0.96→1 + opacity + blur 半徑同步，退場鏡像；dialog 以中心為原點、sheet 以邊緣為原點；reduced-motion 退為 opacity cross-fade。時長對齊 token。
3. 圖表遷移：三個 recharts 元件（`AssetTrendCard`、`CashFlowChart`、`ExpenseBreakdownCard`）的硬編碼 hex 對齊 `chart-1..5` token。
4. Toaster（sonner）樣式對齊 L3 材質；表單錯誤訊息統一樣式與位置（inline，位於欄位下方）。
5. 機械式 token 清掃：將 `src/` 內其餘 `(bg|text|border)-(gray|blue|slate|zinc|neutral)-\d` 硬編碼（310 處、52 檔，最重 ReportPreview.tsx 27、CashFlowStatement.tsx 21）對齊語意 token。

> 完成記錄（任務三）：第 1-4 項完成；ReportPreview.tsx 為手動清掃。機械清掃涵蓋約 60 檔、500+ 處替換，對照表以語意對映（slate/gray → muted 系、emerald/green → positive、rose → negative、red 錯誤 → destructive、blue → primary、bg-white → bg-card）。計畫內保留項：ReportsPage 裝飾漸層 `from-emerald-50 to-teal-50`、dashboardDisplay on-track `text-blue-500`、覆蓋層半透明 `bg-white/10-15`、所有 `dark:` 前綴 class、amber/indigo/purple 等範圍外色相。驗證：`tsc -b`、`eslint`、95 檔 437 測試全綠；桌面 1440（側欄 256px）與行動 390（底部導覽、無水平溢出）截圖走查 dashboard/reports/transactions 通過。QA 登入注意：模擬器以無專案模式運行，SDK 密碼登入可用；若帳號缺 password 提供者，以模擬器 owner API `accounts:update` 補上。

### 任務四：頁面級資訊架構（Phase 4）

1. 統一頁面標頭模式：標題（回答「我在哪」）+ 一句描述 + 主動作靠右。
2. Dashboard：以淨資產/趨勢為首屏焦點，統計卡分組，去雜訊。
3. Transactions：表格密度與可掃描性優先（欄位對齊、金額右對齊、tabular-nums）。
4. 其餘頁面（accounts、portfolios、projects、debt、retirement、reports、settings）套用同一標頭與間距節奏。

> 完成記錄（任務四）：新增共用 `src/ui/components/PageHeader.tsx`（title + description + badge/meta + actions 靠右，可選返回鈕），8 個列表/功能頁遷移完成：Reports、PortfolioList、Transactions、AccountList、DebtList、Projects、Settings、RetirementPlanList。金額加入 `tabular-nums`：DebtListPage SummaryCards、TransactionItem、PortfolioHistoryTable totalValue。Dashboard 清除註解掉的 UnsettledStatsCardUI 死碼與未用 import（格線結構不變）。刻意保留項：含返回鈕/圖示/下拉/編輯狀態的詳情頁標頭（ProjectDetailView、PortfolioDetail、RetirementPlanHeader、MonthlySettlement、ProjectSettings、ReportHeader）維持原樣，待未來單獨評估（PortfolioDetail 其後已遷移至共用 PageHeader，見 ADR-0058）。驗證：`tsc -b`、`eslint`（12 個觸及檔）、95 檔 437 測試全綠；桌面 1440 DOM 走查 8 頁 + Dashboard 通過（統一標頭、無水平溢出、無覆蓋層遮擋）。截圖工具限制：整合瀏覽器截圖與 CDP 視窗覆蓋互相衝突（視窗鎖 ~224px 或空白輸出），以程式化 DOM 驗證替代視覺截圖。

### 任務五：驗收（Phase 5）

1. `pnpm exec tsc -b`、`pnpm lint`、`pnpm test` 全綠。
2. 截圖走查所有頁面 × 桌面/行動 × 淺色主題：非空白、無文字溢出、無重疊。
3. Emulate `prefers-reduced-motion` 與 `prefers-reduced-transparency` 走查降級路徑。
4. 慢速逐幀檢查 dialog/sheet 開合：進出曲線鏡像、無跳動。

> 完成記錄（任務五）：第 1 項全綠（`tsc -b`、`eslint` 0 錯誤、95 檔 437 測試）。第 2 項：整合瀏覽器實體視窗僅 ~151px 且 `setViewportSize`/`Browser.setWindowBounds` 無法改變，截圖（含 CDP `captureScreenshot`）固定 189x409 物理像素；依用戶指示以程式化 DOM 驗證替代視覺截圖（任務四已逐頁驗證桌面版面 + 無溢出）。第 3 項發現並修復 `prefers-reduced-transparency` 降級失效：`.material-chrome` 規則在 `@layer base` 被 utilities 層的 `bg-background/75` + `backdrop-blur-xl` 蓋過，補 `!important`（與 reduced-motion 同模式），驗證 reduce 時變實底 + blur 全關。第 4 項發現並修復 dialog/sheet 動畫時長與曲線：tailwindcss-animate 的 `duration-*` 讀 `theme("animationDuration")` 而 config 只定義 `transitionDuration`（`duration-slow` 對 animation 回落 150ms），且 `animationTimingFunction` 未定義（鏡像曲線生成不出來）— 補齊 theme 的 `animationDuration`/`animationTimingFunction`，dialog/sheet 的裸 `duration-slow` 改為 `data-[state=open/closed]:duration-slow` 變體寫法（屬性選擇器贏過 `.animate-in` 內建 150ms），overlay 與 content 統一 duration-slow + ease-out-quint（開）/ease-in-quint（關）鏡像。實測 computed style：開啟 content/overlay 皆 0.4s、content 曲線 cubic-bezier(0.22, 1, 0.36, 1)；關閉曲線規則已在 served CSS 確認生成。修改後 437 測試全綠。
