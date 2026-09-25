# 設計系統 (Design System)

> 依據：Apple《Designing Fluid Interfaces》(WWDC 2018)、《The Details of UI Typography》(WWDC 2020)、《Principles of Great Design》(WWDC 2026) 的 web 平台轉譯。
>
> **邊界宣告**：本文件管**設計 token 與元件表面**（色彩、材質、動態、字體排印、元件尺寸與狀態契約、spacing 級距）。**頁面層級的佈局、間距用途、資料密度與互動標準**屬 [`visual-standards.md`](visual-standards.md)，兩份文件權威不重疊。

本文件是設計 token 與元件表面契約的唯一真相來源。實作以本文件為準；若與 `ui-layer-architecture.md` 的分層規則衝突，以分層規則為準——呈現層契約不涉入資料流、ViewModel/Hook 職責邊界與 display label API。

---

## 1. 色彩

記帳工具的介面應該安靜、可信、資料優先。色板為 **dark-first**：`src/index.css` 的 `:root` 直接承載暗色值，不另設 `.dark` class 區塊。**現行 token 值一律以 `src/index.css` 為唯一來源**；主題切換（若未來需要）屆時再引入切換機制與配對色板。

- `primary` 為亮色（暗色底上承擔主要互動色）；`chart-1..5` 為資料視覺色，硬編碼 hex 一律對齊 token。
- 層級由材質（§3）而非色差承擔。
- 金額語意 token `positive`（收入/資產）與 `negative`（支出/負債警示）定義於 `src/index.css` 並註冊進 `tailwind.config.js`；全站金額一律經此 token 呈現，`destructive` 維持紅系並僅用於不可逆動作。
- `border-strong` token（比 `border` 亮一階）定義於 `src/index.css` 並註冊進 `tailwind.config.js`；`badge`/`alert` 等需要可見邊界的元件改用它，避免暗色底上邊界消失。

### 1.1 來源色碼 provenance

Phase 1 收斂時定下的四個來源色碼如下（現行 token 已有三個漂移）：

| 來源色碼            | 對應 token                   | 現行值（`src/index.css`） | 狀態   |
| ------------------- | ---------------------------- | ------------------------- | ------ |
| Primary `#E6E8EB`   | `--foreground` / `--primary` | `213 15% 91%`             | 對齊   |
| Secondary `#7C858F` | `--muted-foreground`         | `213 12% 58%`             | 已漂移 |
| Surface `#0A0E14`   | `--background`               | `216 33% 5%`              | 已漂移 |
| Elevated `#0D1117`  | `--elevated`                 | `216 25% 9%`              | 已漂移 |

> **4 個來源色中 3 個已與現行 token 值漂移，現行值以 `src/index.css` 為準。** 此表僅保留來源依據，不代表現行契約。

## 2. 動態（Motion）

原則：**回饋在按下瞬間、動畫可被中斷、路徑對稱**。本專案的互動以點擊/觸發為主（無拖曳手勢），因此以 CSS transition + `tailwindcss-animate` 為動態基礎，不為觸發式動畫引入 spring 函式庫。

Token（定義於 `tailwind.config.js`，全部走 CSS 變數）：

| Token            | 值                                                                  | 對應                                               |
| ---------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| `duration-fast`  | `120ms`                                                             | press 回饋、小狀態切換                             |
| `duration-base`  | `240ms`                                                             | hover、開合、色彩過渡                              |
| `duration-slow`  | `400ms`                                                             | 位移、materialize（對應 response 0.4s）            |
| `ease-out-quint` | `cubic-bezier(0.22, 1, 0.36, 1)`                                    | 進場、展開（類似 critically damped，無 overshoot） |
| `ease-in-quint`  | `cubic-bezier(0.75, 0, 0.85, 0.4)`（`ease-out-quint` 的反向控制點） | 退場，使路徑與進場對稱                             |

規則：

- 按壓回饋：`active:scale-[0.97]` + `duration-fast`，所有可互動元素一律具備。
- 開合類（dialog、sheet、dropdown）：進場 `ease-out-quint`、退場 `ease-in-quint`，時長 `duration-slow` 內。
- 可逆轉換（開 ↔ 關、進 ↔ 退）必須鏡像 easing；單向回饋（hover、focus）用單一 `ease-out`。
- 僅動 `transform`、`opacity`、`backdrop-filter`；避免逐幀動 layout 屬性（width/height/top/left）。

## 3. 材質與層級

以半透明層 + `backdrop-filter` 建立層級，取代實心色 + 1px 邊框：

| 層級              | 材質                                                               | 適用                        |
| ----------------- | ------------------------------------------------------------------ | --------------------------- |
| L0 內容           | `bg-background`，無模糊                                            | 頁面主體                    |
| L1 浮動 chrome    | `bg-background/75` + `blur(20px) saturate(180%)`，大表面配較深陰影 | sticky 系統狀態列（header） |
| L2 對話框 / sheet | 更強模糊 + 最深陰影 + 週邊 scrim                                   | dialog、sheet               |
| L3 小型元素       | 實心 `card` / `popover` + 陰影，不使用透明                         | dropdown、popover、toast    |

規則：

- 1px 邊框僅保留在需要精確分隔的表單/表格；浮動 chrome 與內容交界處改用 scroll-edge 漸層淡出，僅在浮動 UI 實際覆蓋捲動內容時出現。
- 透明層之上不再疊透明層；popover 疊在浮動 chrome 上時改用 L3 實心材質。
- 暗色底上提高半透明層的不透明度（視覺上的玻璃在暗處需更厚），確保文字對比。

### 3.1 半徑與陰影收斂

- `rounded-lg`（`--radius` = 0.25rem）為容器預設半徑；`rounded-xl` 已全站移除。`rounded-md`/`rounded-sm` 用於按鈕與小型 chip，`rounded` 用於 inline badge。
- `rounded-full` 僅保留本質圓形元素：avatar、switch、spinner、狀態點、資料膠囊（progress 軌道）；pill / badge / icon button 類一律方角。
- 陰影預設不使用；僅浮出層保留（dialog、sheet、dropdown、popover、select、toast、command palette、switch knob、L1 浮動 chrome）。Card base 無陰影，hover 不升起陰影。
- Summary / Metric / Section / History / Table / Workflow 表面不強制 Card，改以 Typography / Divider / Whitespace 分層；Card 保留給 distinct module、interactive module、alert、special state。

## 4. 字體排印

- 正文使用系統字體堆疊（含 `'Noto Sans TC'` 以覆蓋繁中）；`src/index.css` 另引入 `@fontsource-variable/inter`（拉丁正文）與 `@fontsource-variable/jetbrains-mono`（等寬）。
- `font-mono`（JetBrains Mono）為正式的資料樣式：金額、日期、代碼、badge、座標軸與標籤性 UI（FROM/TO/APPLY 等）一律使用；段落正文維持系統字體，不以等寬呈現長文。
- Tracking 隨尺寸變化，定義於 Tailwind `letterSpacing`：display `-0.02em`、heading `-0.01em`、body `0`、caption `0.01em`。
- Leading 與尺寸反比：標題 `leading-tight`、內文 `leading-relaxed`。
- 間距一律用 `rem`/`em`，尊重使用者瀏覽器字體大小設定。
- 頁面標題使用重量（`font-semibold`/`font-bold`）建立層級，不以加大尺寸為唯一手段。

## 5. 間距級距

全站使用單一 spacing scale，對應 Tailwind 預設 spacing（一律以 `rem` 表達，對應 4px 網格）：

```text
0.25 · 0.5 · 0.75 · 1 · 1.5 · 2 · 3 · 4   (rem)
  4  ·  8  ·  12  · 16 · 24 · 32 · 48 · 64   (px)
```

> 各級距的**使用場景與禁止事項**屬頁面層級決策，見 [`visual-standards.md`](visual-standards.md) 的「間距」節；本節只定義級距本身。

## 6. 八原則對照

| 原則           | 本專案的落實                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| Purpose        | 不裝飾性圖表、不無意義動畫；每個 token 都有對應使用場景                                                     |
| Agency         | 不可逆動作（刪除、還原備份）用確認對話；可逆動作（停用、登出）不阻擋主流程                                  |
| Responsibility | 金額色訊一致（收入/支出/負債），避免誤讀財務狀態                                                            |
| Familiarity    | 關閉一律在對話框右上；sheet 進出同側；同類操作同位置                                                        |
| Flexibility    | dark-first 色板、RWD 斷點契約（見 `ui-layer-architecture.md`）、reduced-motion/transparency/contrast 全覆蓋 |
| Simplicity     | 每頁先呈現最常用的路徑，進階選項一層之後                                                                    |
| Craft          | token 化、easing 鏡像、press 回饋、scroll-edge 處理                                                         |
| Delight        | 七項做對後的結果：介面安靜、回應即時、材質有層次                                                            |

## 7. 元件模式

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
- `form`：全站表單共通原則（2026-09-24 定案）。首個合格實作為 account 表單（`AccountForm` 與 `AccountSnapshotEditor`）；其餘表單逐一遷移，不批次套用。表單狀態與驗證時機的規則（RHF、`useForm` 呼叫點、submit gate）見 `ui-layer-architecture.md` §4，此段只規範元件表面。
  - **欄位群組**：`FormItem` 是唯一決定 label / control / error 垂直佈局的地方（`space-y-2`）。欄位不得自行決定 label 或 error 的位置與間距。
  - **元件解耦**：輸入欄位（`TextInput`、`NumberInput`、`CurrencyInput`、`DateInput`…）是 RHF-free 的受控元件，唯一 value contract 為 string。RHF 的接線集中於 `FormControl`，欄位本身不得 import RHF。理由見 ADR-0065。
  - **注入契約**：`FormControl` 以 `cloneElement` 注入 `value / onChange / onBlur / name / ref / error（boolean）/ aria-invalid / aria-describedby / id`。`error` 供視覺、`aria-*` 供無障礙，兩者缺一不可；欄位元件必須轉發 `ref` 至原生元素。
  - **Select 無值列**：Radix Select 禁止空字串作為 item value（空字串語意是「清除選擇、顯示 placeholder」）。optional select 的「無值」列以 `noneLabel` 表示（sentinel item value 內部承擔，欄位 value contract 仍為 string，選擇「無值」列時 emit `''`）；option 不得自帶 `value: ''`。
  - **Required**：必填欄位在 `FormLabel` 尾端加 `*`（`text-destructive`），不寫「必填」文字。
  - **Error**：一律顯示在 control 下方，只顯示第一筆錯誤（`FormMessage`）；欄位錯誤時 `FormLabel` 轉 `text-destructive`。
  - **Disabled**：使用 native `disabled`，統一 `opacity-50` 且不可 focus（由 input primitives 的 `disabled:` 樣式承擔，不另行手寫）。
  - **幾何**：表單輸入框與 data-table 數字輸入共用高度（34px）與數字處理（右對齊 mono `tabular-nums`、移除原生 spinner）；但 surface 各自保留——form 用 `rounded-md` + `border-input` + `bg-background`（即 `ui/input` 的樣式），table 維持 `rounded-none` + `bg-muted`。共用的只有幾何與數字處理，不是整體外觀。
  - **Mobile**：輸入框聚焦時字級須 ≥ 16px（`text-base`，桌面 `md:text-sm`），避免 iOS Safari 聚焦自動縮放。
  - **單一貨幣符號來源**：`CurrencyInput` 不內建貨幣符號，`prefix` 由呼叫端提供。金額顯示一律經 `formatCurrency(amount, currency)`：本位幣（TWD）為預設，符號前置（`NT$`、`US$`、`€`、`¥`），0 位小數；非本位幣原幣金額傳入自身幣別，形狀與本位幣一致。
