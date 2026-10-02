# 共用元件目錄 (Component Catalog)

本文件是 `src/ui/components/` 共用元件的目錄：每個元件的用途、props 契約、變體、**何時不要用**，以及一處範例。契約（表面規格、token、pattern）屬 [`design-system.md`](design-system.md)；本目錄只回答「這個元件是什麼、什麼時候用它」。

**索引表是機器可讀的**：`src/ui/components/componentCatalog.test.ts` 斷言索引集合與檔案系統的元件集合相等——新增或移除元件而沒有同步索引時，測試會 fail。

## 規則

- **擴充，不 fork**：建立新共用元件前，先確認 `src/ui/components` 既有的能不能擴充；不能才新建，並在同一個 task 內遷移既有的重複實作（[`ui-layer-architecture.md`](ui-layer-architecture.md) §2 規則 9）。
- **`ui/` 群組**：`ui/` 是 shadcn 上游 primitive 群，**以擴充上游為原則，不 fork 一份自有的**。需要新行為時優先在上游 primitive 或它上層的套件（`form/`、`data-table/`）處理，而不是複製 `ui/` 的檔案出來改。`data-table` 套件疊在結構 primitive 之上而非重寫（[ADR-0061](../adr/0061-data-table-package-over-primitives.md)）。
- **範例路徑**是「哪裡有真實用法」，不是唯一合法用法。

## 索引

| 檔案                                                 | 條目                           |
| ---------------------------------------------------- | ------------------------------ |
| `src/ui/components/AppFallback.tsx`                  | AppFallback                    |
| `src/ui/components/ActivityList.tsx`                 | ActivityList / ActivityRow     |
| `src/ui/components/Avatar.tsx`                       | Avatar                         |
| `src/ui/components/charts/BarChart.tsx`              | charts / BarChart              |
| `src/ui/components/charts/ChartLegend.tsx`           | charts / ChartLegend           |
| `src/ui/components/charts/ChartScrubber.tsx`         | charts / ChartScrubber         |
| `src/ui/components/charts/ChartTooltip.tsx`          | charts / ChartTooltip          |
| `src/ui/components/charts/DonutChart.tsx`            | charts / DonutChart            |
| `src/ui/components/charts/InteractiveBarChart.tsx`   | charts / InteractiveBarChart   |
| `src/ui/components/charts/InteractiveLineChart.tsx`  | charts / InteractiveLineChart  |
| `src/ui/components/charts/LineChart.tsx`             | charts / LineChart             |
| `src/ui/components/CliProgress.tsx`                  | CliProgress                    |
| `src/ui/components/CompactRow.tsx`                   | CompactRow                     |
| `src/ui/components/Divider.tsx`                      | Divider                        |
| `src/ui/components/EmptyState.tsx`                   | EmptyState                     |
| `src/ui/components/ErrorBoundary.tsx`                | ErrorBoundary                  |
| `src/ui/components/FinancialNumber.tsx`              | FinancialNumber                |
| `src/ui/components/InlineEditableTitle.tsx`          | InlineEditableTitle            |
| `src/ui/components/MetricGroup.tsx`                  | MetricGroup / Metric           |
| `src/ui/components/Module.tsx`                       | Module                         |
| `src/ui/components/PageHeader.tsx`                   | PageHeader                     |
| `src/ui/components/PageSection.tsx`                  | PageSection                    |
| `src/ui/components/PeriodBadge.tsx`                  | PeriodBadge                    |
| `src/ui/components/RadioGroup.tsx`                   | RadioGroup / Radio             |
| `src/ui/components/Skeleton.tsx`                     | Skeleton                       |
| `src/ui/components/StatusGlyph.tsx`                  | StatusGlyph                    |
| `src/ui/components/Toast.tsx`                        | Toast                          |
| `src/ui/components/Toolbar.tsx`                      | Toolbar                        |
| `src/ui/components/YearMonthPicker.tsx`              | YearMonthPicker                |
| `src/ui/components/data-table/DataTable.tsx`         | data-table / DataTable         |
| `src/ui/components/data-table/DataTableCell.tsx`     | data-table / DataTableCell     |
| `src/ui/components/data-table/DataTableColGroup.tsx` | data-table / DataTableColGroup |
| `src/ui/components/data-table/DataTableHeadCell.tsx` | data-table / DataTableHeadCell |
| `src/ui/components/data-table/DataTableRow.tsx`      | data-table / DataTableRow      |
| `src/ui/components/data-table/MobileDataRow.tsx`     | data-table / MobileDataRow     |
| `src/ui/components/data-table/NumberCell.tsx`        | data-table / NumberCell        |
| `src/ui/components/data-table/NumberInput.tsx`       | data-table / NumberInput       |
| `src/ui/components/form/CurrencyInput.tsx`           | form / CurrencyInput           |
| `src/ui/components/form/DateInput.tsx`               | form / DateInput               |
| `src/ui/components/form/Form.tsx`                    | form / Form                    |
| `src/ui/components/form/FormControl.tsx`             | form / FormControl             |
| `src/ui/components/form/FormDescription.tsx`         | form / FormDescription         |
| `src/ui/components/form/FormField.tsx`               | form / FormField               |
| `src/ui/components/form/FormItem.tsx`                | form / FormItem                |
| `src/ui/components/form/FormLabel.tsx`               | form / FormLabel               |
| `src/ui/components/form/FormMessage.tsx`             | form / FormMessage             |
| `src/ui/components/form/NumberInput.tsx`             | form / NumberInput             |
| `src/ui/components/form/Select.tsx`                  | form / Select                  |
| `src/ui/components/form/TextArea.tsx`                | form / TextArea                |
| `src/ui/components/form/TextInput.tsx`               | form / TextInput               |
| `src/ui/components/sortable/SortableListScope.tsx`   | sortable / SortableListScope   |
| `src/ui/components/ui/accordion.tsx`                 | ui/ 群組                       |
| `src/ui/components/ui/alert.tsx`                     | ui/ 群組                       |
| `src/ui/components/ui/badge.tsx`                     | ui/ 群組                       |
| `src/ui/components/ui/button.tsx`                    | ui/ 群組                       |
| `src/ui/components/ui/card.tsx`                      | ui/ 群組                       |
| `src/ui/components/ui/checkbox.tsx`                  | ui/ 群組                       |
| `src/ui/components/ui/command.tsx`                   | ui/ 群組                       |
| `src/ui/components/ui/dialog.tsx`                    | ui/ 群組                       |
| `src/ui/components/ui/dropdown-menu.tsx`             | ui/ 群組                       |
| `src/ui/components/ui/input.tsx`                     | ui/ 群組                       |
| `src/ui/components/ui/label.tsx`                     | ui/ 群組                       |
| `src/ui/components/ui/popover.tsx`                   | ui/ 群組                       |
| `src/ui/components/ui/progress.tsx`                  | ui/ 群組                       |
| `src/ui/components/ui/select.tsx`                    | ui/ 群組                       |
| `src/ui/components/ui/sheet.tsx`                     | ui/ 群組                       |
| `src/ui/components/ui/switch.tsx`                    | ui/ 群組                       |
| `src/ui/components/ui/table.tsx`                     | ui/ 群組                       |
| `src/ui/components/ui/tabs.tsx`                      | ui/ 群組                       |
| `src/ui/components/ui/textarea.tsx`                  | ui/ 群組                       |
| `src/ui/components/ui/tooltip.tsx`                   | ui/ 群組                       |

## 非元件模組（不在本目錄的元件索引）

這些檔案在 `src/ui/components/` 底下但不是元件本身，因此不列為元件條目。列在這裡是為了讓「索引 vs 檔案系統」的比對沒有暗門——新增同類檔案時測試會要求歸類。

| 檔案                                                  | 種類                                                |
| ----------------------------------------------------- | --------------------------------------------------- |
| `src/ui/components/charts/chartTheme.ts`              | 表面常數（色調對應、donut 色階、數值格式）          |
| `src/ui/components/charts/chartInteraction.ts`        | 互動共用（點型別、keyboard scrubber、tooltip 定位） |
| `src/ui/components/charts/lineChartGeometry.ts`       | 幾何計算（`LineChart` 使用）                        |
| `src/ui/components/moneyTone.ts`                      | 表面常數（金額語意的色調對應）                      |
| `src/ui/components/data-table/index.ts`               | barrel                                              |
| `src/ui/components/data-table/parseOptionalAmount.ts` | 內部 helper（`NumberInput` 使用）                   |
| `src/ui/components/data-table/styles.ts`              | 表面常數                                            |
| `src/ui/components/form/form-context.ts`              | 內部接線（context 與 `useFormField`）               |
| `src/ui/components/form/index.ts`                     | barrel                                              |
| `src/ui/components/form/styles.ts`                    | 表面常數                                            |
| `src/ui/components/ui/button-variants.ts`             | 變體定義模組（`button` 使用）                       |
| `src/ui/components/ui/input-styles.ts`                | 表面常數                                            |

## 頁面骨架

- **`PageHeader`** — List / Detail / Workspace 頁的 Page Header：Title、Description、Actions，另可帶 crumb、badge、meta 與返回。
  - Props：`title`（必填）、`description?`、`crumb?`、`badge?`、`meta?`、`actions?`、`onBack?`。
  - 變體：無。
  - **不要用於**：把 Header 做成 Card、塞大量 Metric；那些是 [`visual-standards.md`](visual-standards.md) Page Shell 的禁止事項。
  - 範例：`src/ui/features/debt/pages/DebtDetailPage.tsx`

- **`AppFallback`** — 全 app 啟動不可恢復失敗的畫面。由 `ErrorBoundary` 與 `AuthGate` 使用。
  - Props：`title`、`description`、`hint?`、`onRetry?`（未提供時預設按鈕為重新載入）。
  - 變體：無。
  - **不要用於**：一般頁面層的錯誤——那用 inline alert 或 exception（見 [`states-and-a11y.md`](states-and-a11y.md) 錯誤狀態）。
  - 範例：`src/ui/features/app/AuthGate.tsx`

- **`ErrorBoundary`** — class component，捕捉 render 期錯誤並渲染 `AppFallback`。
  - Props：`children`。**不要用於**：可預期的資料錯誤（那是 Controller 的責任）。

## 通用呈現

- **`StatusGlyph`** — 狀態的五（六）字形。`type`：`active` / `verified` / `waiting` / `review` / `error` / `inactive`。
  - Props：`type`、`label?`、`className?`。字形、色彩與標籤由 `type` 決定，呼叫端不自行配色彩。
  - **不要用於**：需要自訂顏色的臨時狀態點——新增一個 `type`，不要在呼叫端另畫。
  - 範例：`src/ui/features/app/layout/Layout.tsx`

- **`PeriodBadge`** — 財務期間標籤（`label` ＋ `period`）。
  - Props：`label`、`period`、`className?`。
  - **不要用於**：一般標籤（用 `ui/` 群組的 `badge`）。
  - 範例：`src/ui/features/monthly_close/pages/MonthlyClosePage.tsx`

- **`CompactRow`** — 行動版佈局的資訊列：單列 label／值對齊。
  - Props：`children`、`onClick?`、`testId`（必填）、`className?`、`style?`、`ref?`。
  - **不要用於**：桌面版的表格資料（用 `data-table` 套件）；它只在行動版佈局出現。
  - 範例：`src/ui/features/debt/pages/DebtListPage.tsx`

- **`InlineEditableTitle`** — 就地編輯的標題。trim 後為空或未變更即取消；Enter 儲存、Escape 取消；儲存失敗自動還原。
  - Props：`value`、`onSave(value) => Promise<void> | void`、`disabled?`、`className?`。
  - **不要用於**：需要明確 save／cancel 按鈕與欄位驗證的表單（用 `form` 套件）。
  - 範例：`src/ui/features/project/pages/ProjectDetailPage.tsx`

- **`Skeleton`** — 載入 shimmer 區塊（Table / List / Detail 的 loading 態）。組合多個 block 成列；自身只渲染一塊。
  - Props：`className?`（尺寸由呼叫端給）。
  - **不要用於**：長時間工作的進度（用 `CliProgress`）；單行文字 loading 已足夠時。
  - 範例：`src/ui/features/app/pages/GalleryStates.tsx`

- **`CliProgress`** — Terminal-style 進度（長時間工作的 loading 態，states-and-a11y 的 engineering identity）。自繪 bar，自帶 `role="progressbar"` 與 `aria-value*`。
  - Props：`command`、`value`（0-100）、`statusText?`、`className?`。
  - **不要用於**：短暫 loading（用 `Skeleton` 或單行文字）。
  - 範例：`src/ui/features/app/pages/GalleryStates.tsx`

- **`EmptyState`** — 空狀態：狀態 glyph ＋ status 標題 ＋ 一句說明 ＋ 一個主要 action。不做大型 Card。
  - Props：`title`、`description`、`action?`、`className?`。glyph 固定，不是 prop。
  - **不要用於**：錯誤狀態（用 inline alert）；頁面級 fallback（用 `AppFallback`）。
  - 範例：`src/ui/features/app/pages/GalleryStates.tsx`

- **`FinancialNumber`** — 財務數值顯示：`hero` / `large` / `default` 三級 ＋ 選用 change line ＋ 缺值「$ —」。值與 change line 都由呼叫端預先格式化，本元件不做貨幣運算。
  - Props：`value?: string | null`、`size?`、`tone?`（`default`/`positive`/`negative`）、`change?`、`changeTone?`（`default`/`positive`/`negative`/`muted`）、`className?`。提供 `change` 時根元素變為 block。
  - **不要用於**：表格儲存格（用 `data-table` 的 `NumberCell`）；輸入（用 `form` 的 `NumberInput`/`CurrencyInput`）。
  - 範例：`src/ui/features/app/pages/GalleryPrimitives.tsx`

- **`MetricGroup` / `Metric`** — 同層級財務指標列：label + mono 值 + change line，非卡片。`MetricGroup` 是分割線容器，`Metric` 是單一指標。
  - Props（Group）：`children`、`className?`。Props（Metric）：`label`、`value`、`tone?`、`change?`、`changeTone?`、`className?`。
  - **不要用於**：需要互動或篩選的資料（那是 table/toolbar 的事）。
  - 範例：`src/ui/features/app/pages/GalleryPrimitives.tsx`

- **`PageSection`** — 頁面層級的全寬 section band（`border-b` + `py-10`），visual-standards 的「structure over cards」：頁面區域用 band 分段，不用浮動卡片。number + title 為選用的 mono 標題；僅內容時是素 band。
  - Props：`number?`、`title?`、`children`、`className?`。
  - **不要用於**：section 內的個別單元（用 `Module`）；需要 sticky 或導航的區域（用 `PageHeader` / `Toolbar`）。
  - 範例：`src/ui/features/app/pages/GalleryScaffold.tsx`（re-export 為 `GallerySection`）。

- **`Module`** — PageSection 內的 distinct module：mono label + 卡片邊界（唯一允許卡片的層級，design-system「Card 保留給 distinct module」）。`min-w-0` 防止在響應式 grid 溢出。
  - Props：`label`、`children`、`className?`。
  - **不要用於**：頁面級分段（用 `PageSection`）；列表內的重複列（那不是 module，是 row）。
  - 範例：`src/ui/features/app/pages/GalleryScaffold.tsx`（re-export 為 `GalleryModule`）。

- **`ActivityList` / `ActivityRow`** — 最近活動列：date / title+meta / amount。列表容器收掉最後一列的底線。
  - Props（Row）：`date`、`title`、`meta?`、`amount?`、`tone?`、`className?`。
  - **不要用於**：完整交易資料表（用 `data-table` 套件）。
  - 範例：`src/ui/features/app/pages/GalleryStates.tsx`

- **`Avatar`** — 身分圓形：photo 或 initials，mono、uppercase。`rounded-full` 白名單內的本質圓形。
  - Props：`initials?`、`src?`、`alt?`、`size?`（`sm`/`default`）、`className?`。
  - **不要用於**：非身分用途的圓形裝飾。
  - 範例：`src/ui/features/app/layout/UserMenu.tsx`

- **`Divider`** — 結構性分隔線。純呈現、無語意。
  - Props：`className?`。
  - **不要用於**：需要語意分組的內容（用 section / heading）。
  - 範例：`src/ui/features/app/pages/GalleryStates.tsx`

- **`Toolbar`** — 頁面工具列：資料檢視控制在前、動作在後，兩組分離。
  - Props：`children?`（leading）、`actions?`（trailing）、`className?`。
  - **不要用於**：表單欄位列（用 `form` 套件）。
  - 範例：`src/ui/features/app/pages/GalleryStates.tsx`

- **`Toast`** — Toast 表面（visual-standards §通知）：浮動卡片，左側狀態 glyph + 訊息、右側單一選用動作（UNDO／RETRY）。元件自帶表面（`bg-card` + `border` + `shadow-lg`）；live toast 以 `toast.custom(() => <Toast …/>, { unstyled: true, style: { width: '356px' } })` 掛進 sonner，全域 `Toaster` 只負責定位，不再加表面。Toast 只回報結果，不承載 workflow instruction。
  - Props：`message`、`tone?`（`success`／`error`）、`actionLabel?`、`onAction?`、`className?`。
  - **不要用於**：需要使用者解決的問題（用 inline alert）；重要的 workflow instruction；純字串 `toast('…')`（會落到 sonner 預設外觀）。
  - 範例：`src/ui/features/app/pages/GalleryToasts.tsx`

- **`RadioGroup` / `Radio`** — 行內單選：原生 `input[type=radio]`、`<label>` 包覆控制項，零 Radix 依賴。
  - Props（Group）：`aria-label`（必填）、`name`、`value?`、`onValueChange?`、`children`、`className?`。Props（Radio）：`value`、`label`、`className?`。
  - **不要用於**：二元設定（用 `ui/` 群組的 `switch`）；多選（用 `checkbox`）。
  - 範例：`src/ui/features/app/pages/GalleryStates.tsx`

- **`ui/tooltip`** — Tooltip primitive：Radix 包裝、Root 自帶 Provider。「僅在需要時解釋」——不懂的縮寫、推導式、缺值說明。
  - Props：透通 Radix Root/Trigger/Content；Content 預設 `sideOffset={6}`、`max-w-xs`。
  - **不要用於**：恆常可見的說明（那用 description 文字）。
  - 範例：`src/ui/features/app/pages/GalleryPrimitives.tsx`

- **`YearMonthPicker`** — 年月選擇（outline 按鈕 ＋ Popover 內雙 Select）。`mode` 為 `'year-month'`（預設）或 `'year'`。
  - Props：`mode?`、`year`、`month?`、`onYearChange`、`onMonthChange?`、`className?`。
  - 選擇只暫存在 picker 內（draft state），按 APPLY 才 commit；Escape／外點取消。
  - **不要用於**：單一日期（那是 `form / DateInput`）。
  - 範例：`src/ui/features/account/pages/AccountSnapshotEditor.tsx`

## 圖表 (charts)

資料驅動的圖表群：呼叫端傳值與標籤，幾何、比例與軸標籤由元件推導。色調一律走 `chartTheme.ts` 的 tone→token 對應（`primary` / `positive` / `negative` / `neutral`），不新增顏色（[`design-system.md`](design-system.md) §1）。標籤文字一律由呼叫端提供——元件不得硬編任何領域系列名稱。

- **`charts / LineChart`** — 折線圖：格線、可選面積、座標軸標籤。y 軸以資料範圍加邊距（不做 0 基底），讓大額餘額中的小幅變動仍可讀。
  - Props：`values`（必填）、`labels?`（長度需與 `values` 相同才會畫 x 軸）、`tone?`、`showArea?`、`markLastPoint?`、`height?`、`ariaLabel?`、`className?`、`children?`（render-prop，取得算好的 geometry 以便疊加互動層）。
  - **不要用於**：需要 hover 明細——用 `InteractiveLineChart`。
  - 範例：`src/ui/features/app/pages/GalleryCharts.tsx`

- **`charts / BarChart`** — 分組長條圖。值以**大小**呈現（高度 ∝ 數值），收入／支出用 series 的 tone 表達，不是負高度；`highlightIndex` 指定的欄位改用 primary tone。
  - Props：`labels`、`series`（`{ tone, values }[]`）、`highlightIndex?`、`height?`、`showLabels?`、`ariaLabel?`、`className?`、`children?`（`(layout) => ReactNode` 疊加層，`layout` 提供每個欄位的 index／label／values／ratio）。
  - `children` 疊加層會被放在長條區內、與欄位同樣的 flex 版面下；一旦提供 `children`，`ariaLabel` 不再掛 `role="img"`（交給疊加層自行標註語意）。
  - **不要用於**：長條圖的明細 tooltip——用 `InteractiveBarChart`。
  - 範例：`src/ui/features/app/pages/GalleryCharts.tsx`

- **`charts / DonutChart`** — 圓環圖：圓環 ＋ 中心標題 ＋（可選）垂直圖例。切片顏色取自共用的 token 色階（首片 accent、其餘中性），佔比由數值推導並四捨五入為整數百分比。
  - Props：`segments`（`{ label, value }[]`）、`centerLabel`、`size?`、`showLegend?`、`ariaLabel?`、`className?`。
  - **不要用於**：需要精確讀值——圓環只適合看比例；精確值用數字或表格。
  - 範例：`src/ui/features/app/pages/GalleryCharts.tsx`

- **`charts / ChartLegend`** — 圖例。`horizontal` 為 inline swatch 列（長條圖），`vertical` 為 label／value 列（圓環）。
  - Props：`items`（`{ label, tone?, color?, value? }[]`）、`orientation?`、`className?`。
  - **不要用於**：需要互動切換序列（本輪未實作）。
  - 範例：`src/ui/features/app/pages/GalleryCharts.tsx`

- **`charts / ChartTooltip`** — 圖表 hover 卡片表面（標題／數值／次要行）。定位由呼叫端負責。
  - Props：`title`、`value`、`meta?`、`className?`、`style?`。
  - **不要用於**：非圖表的說明（那用 `ui/tooltip`）。
  - 範例：`src/ui/components/charts/InteractiveLineChart.tsx`、`src/ui/components/charts/InteractiveBarChart.tsx`

- **`charts / ChartScrubber`** — 兩個互動圖表共用的互動層：單一 `role="slider"` 表面、鍵盤契約（左右鍵移動、Escape 清除）與 `aria-valuetext`。呼叫端提供「指標位置 → 索引」的映射（`resolveIndex`，回 -1 表示不改變），並以 render-prop 從 scrubber state 畫自己的導線／資料點／tooltip。
  - Props：`count`、`plotHeight`、`points`、`ariaLabel`、`className`、`resolveIndex`、`children`。
  - **不要用於**：非互動的圖表——`LineChart` / `BarChart` 不需要它。
  - 範例：`src/ui/components/charts/InteractiveLineChart.tsx`、`src/ui/components/charts/InteractiveBarChart.tsx`

- **`charts / InteractiveLineChart`** — `LineChart` ＋ scrubber：導線、資料點、共用 `ChartTooltip`。整塊以 `role="slider"` 呈現，滑鼠 hover 與鍵盤左右鍵都能選取同一筆資料（Escape 清除）。
  - Props：`values`、`points`（`{ title, value, meta? }[]`）、`xLabels?`、`tone?`、`height?`、`ariaLabel`（必填）、`className?`。
  - **不要用於**：只是要看趨勢、不需要明細——用 `LineChart`。
  - 範例：`src/ui/features/app/pages/GalleryCharts.tsx`

- **`charts / InteractiveBarChart`** — `BarChart` ＋ hover／鍵盤 scrubber：導線、共用 `ChartTooltip`。整塊以 `role="slider"` 呈現，滑鼠移到任一欄位（以各欄實際 rect 命中）或鍵盤左右鍵都能選取該欄（Escape 清除）。
  - Props：`labels`、`series`、`points`（`{ title, value, meta? }[]`）、`highlightIndex?`、`height?`、`showLabels?`、`ariaLabel`（必填）、`className?`。
  - **不要用於**：只是要看趨勢、不需要明細——用 `BarChart`。
  - 範例：`src/ui/features/app/pages/GalleryCharts.tsx`

## data-table 套件

表格的結構 primitive 群，疊在 `ui/table` 之上（[ADR-0061](../adr/0061-data-table-package-over-primitives.md)）。套件同時 re-export `ui/table` 的結構元件與 `styles.ts` 的常數。

- **`DataTable`** — 表格外框。**`DataTableScrollArea`** 是可捲動區（僅桌機）。
  - Props：原生 table 屬性（`DataTable`）／原生 div 屬性（`DataTableScrollArea`）。
  - **不要用於**：非表格的資料陳列（行動版清單用 `MobileDataRow`／`CompactRow`）。
  - 範例：`src/ui/features/monthly_close/stages/account_balance/components/CloseAccountBalanceInputs.tsx`

- **`DataTableRow`** — 資料列。**`DataTableHeadRow`** 是表頭列。
  - Props：原生 `tr` 屬性。
  - 遵守 [ADR-0061](../adr/0061-data-table-package-over-primitives.md) 的 pointer event 優先序：拖曳 grip 不觸發整列導覽，也不做「看起來可點擊」的假整列互動。
  - **不要用於**：不要為 hover 效果而用它——只有能導覽到 Detail 的整列才有 hover 呈現（見 [`design-system.md`](design-system.md) `data-table`）。
  - 範例：`src/ui/features/monthly_close/stages/account_balance/components/SecuritiesAccountRow.tsx`

- **`DataTableCell`** — 資料 cell。**`DataTableHeadCell`** 是表頭 cell。兩者都帶對齊語意。
  - Props：原生 `td`／`th` 屬性，另加 `align?`（`'text'`（預設）或 `'number'`）。
  - **不要用於**：數字欄不要手寫右對齊與等寬——用 `align="number"`。
  - 範例：`src/ui/features/monthly_close/stages/securities_trade/components/TradeTable.tsx`

- **`DataTableColGroup`** — 以百分比陣列定義欄寬；總和必須為 100（開發模式會報錯）。
  - Props：`widths`（必填，百分比陣列，總和 100）、`className?`。
  - **不要用於**：欄寬和必須為 100 的理由見 [`design-system.md`](design-system.md) `data-table`。
  - 範例：`src/ui/features/monthly_close/stages/account_balance/components/CloseAccountBalanceInputs.tsx`

- **`NumberCell`** — 數字 cell 的顯示。
  - Props：原生 `td` 屬性（不含 children 與 align），另加 `value`（`number | null | undefined`）、`format?`、`emptyText?`（預設 `—`）。
  - **不要用於**：可編輯的數字欄（用 `NumberInput`）。
  - 範例：`src/ui/features/monthly_close/stages/account_balance/components/CloseAccountBalanceInputs.tsx`

- **`NumberInput`**（data-table）— 表格內可編輯數字欄。
  - Props：原生 input 屬性（不含 `type`），另加 `compact?`（切換較短的列內高度）。保留原生 `value`／`onChange` 事件契約。
  - **不要用於**：form 套件內的欄位（用 `form / NumberInput`，見下方裁決）；不需要原生事件時也不必用它。
  - 範例：`src/ui/features/monthly_close/stages/debt_repayment/components/CloseDebtRepaymentStage.tsx`

- **`MobileDataRow`** — 行動版的 grouped row（label／值）。**`MobileDataList`** 是外框；**`MobileDataField`** 是其中一欄。
  - Props：原生 div 屬性；`MobileDataField` 另加 `label`（必填）、`children?`、`className?`。
  - **不要用於**：桌機佈局（用 `DataTable`）。
  - 範例：`src/ui/features/monthly_close/stages/account_balance/components/CloseAccountBalanceMobileLists.tsx`

## form 套件

表單套件。狀態與驗證時機的規則（RHF、`useForm` 呼叫點、submit gate）屬 [`ui-layer-architecture.md`](ui-layer-architecture.md) §4；此處只列元件。

### 接線（RHF 綁定）

- **`Form`** — `react-hook-form` 的 provider 轉出。
  - **不要用於**：不要用它承載資料載入狀態——它只提供表單狀態。
- **`FormField`** — 以 controller 綁定單一欄位，發布欄位 context。
  - Props：`name`（必填）、`children`。
  - **不要用於**：需在 form provider 內使用，不能獨立。
- **`FormItem`** — 欄位容器，產生 id 並**決定 label／control／error 的垂直佈局**。
  - Props：原生 div 屬性。
  - **不要用於**：欄位不要自行決定 label 或 error 的位置與間距，一律透過它。
- **`FormLabel`** — 欄位標籤。
  - Props：原生 label 屬性，另加 `required?`（在尾端加 `*`，不寫「必填」字樣）。
  - **不要用於**：需在 `FormField` 內。
- **`FormControl`** — 以 `cloneElement` 把表單狀態注入子欄位（id、name、value、onChange、onBlur、ref、error 與對應的 `aria-*`）。**接線集中在這裡，欄位本身不得 import RHF**（[ADR-0065](../adr/0065-rhf-free-field-components-with-formcontrol-glue.md)）。
  - Props：`children`（單一元素，必填）。
  - **不要用於**：不要用它包非欄位元素。
- **`FormDescription`** — 欄位說明文字。
  - Props：原生 p 屬性。**不要用於**：錯誤訊息用它會顯示不出來（用 `FormMessage`）。
- **`FormMessage`** — 錯誤訊息，只顯示第一筆錯誤；無錯誤時不渲染。
  - Props：原生 p 屬性。
  - **不要用於**：需在 `FormField` 內。
- 範例：`src/ui/features/debt/components/DebtAccountForm.tsx`

### 欄位（RHF-free 受控元件，value 契約為 string）

這些欄位可獨立使用，也可被 `FormControl` 注入。**value 一律是 string**（數值轉換發生在 schema 邊界）；帶 `error?` 供視覺呈現。共同表面契約見 [`design-system.md`](design-system.md) §7 的 `form`。

- **`TextInput`** — 文字欄位。
  - Props：原生 input 屬性（不含 `value`／`onChange`），value 為 string，另加 `error?`。
  - **不要用於**：data table 的輸入欄（用 `data-table`）；需要原生事件物件時。
  - 範例：`src/ui/features/account/pages/AccountForm.tsx`
- **`NumberInput`**（form）— 數字欄位。
  - Props：同 `TextInput` 的 string value 契約，不含 `type`。
  - **不要用於**：data table 內（用 `data-table / NumberInput`）。
  - 範例：`src/ui/features/transaction/components/form/AllocationSection.tsx`
- **`CurrencyInput`** — `NumberInput` 加上前綴。
  - Props：同 `NumberInput`，另加 `prefix?`。
  - **不要用於**：**它不內建貨幣符號**，符號由呼叫端提供；金額顯示也不要經它（顯示走 `formatCurrency`）。
  - 範例：`src/ui/features/app/pages/GalleryPrimitives.tsx`
- **`DateInput`** — 日期欄位，emit ISO `yyyy-MM-dd`。
  - Props：同 `TextInput` 的 string value 契約，另加 `error?`。
  - **不要用於**：年月（用 `YearMonthPicker`）。
  - 範例：`src/ui/features/transaction/components/form/AmountDateFields.tsx`
- **`Select`**（`SelectField`）— 單值選欄位。
  - Props：`options`（必填）、`value?`、`onChange?`、`onBlur?`、`placeholder?`、`noneLabel?`、`error?`、`disabled?`、`className?`、`id?`、`name?` 與 `aria-*`。
  - 變體：選填的「無值」列以 `noneLabel` 表示；**option 不得自帶空字串 value**（違反時開發模式報錯）。
  - **不要用於**：需要自行組合 Radix parts 的場合（用 `ui/select`）。
  - 範例：`src/ui/features/account/pages/AccountForm.tsx`
- **`TextArea`** — 多行文字。
  - Props：同 `TextInput` 的 string value 契約，另加 `error?`。
  - **不要用於**：單行輸入（用 `TextInput`）。
  - 範例：`src/ui/features/transaction/components/form/AdvancedPanel.tsx`

## sortable

- **`SortableListScope<T extends { id: string }>`** — 可拖曳排序的 scope（`items`、`onReorder`、`children`）。
- **`GripHandle`** — 拖曳啟用鈕（`label` 必填），另可帶 `attributes`、`listeners`、`className`、`testId`、`activatorRef`。
- 只有 grip 可拖曳，列點擊導覽不受干擾；grip 會停止事件冒泡並抑制拖曳後的一次 click。細節見 [ADR-0059](../adr/0059-dnd-kit-shared-sortable.md)。
- **不要用於**：非排序清單；也不要為排序另寫一份 DnD 接線。
- 範例：`src/ui/features/account/pages/AccountList.tsx`

## ui/ 群組（shadcn 上游 primitive）

`src/ui/components/ui/` 是 shadcn 產生的 primitive 群，包 Radix 或原生元素：`accordion`、`alert`、`badge`、`button`、`card`、`checkbox`、`command`、`dialog`、`dropdown-menu`、`input`、`label`、`popover`、`progress`、`select`、`sheet`、`switch`、`table`、`tabs`、`textarea`。

- 變體軸（variant／size／direction 等）與完整值以各檔案為準，本目錄不複述完整列舉；表面契約見 [`design-system.md`](design-system.md) §7。其中少數非預設變體值得先知道：`button` 另有 `text` variant（tertiary 動作），`alert` 與 `badge` 另有 `destructive` 變體，`sheet` 有四個進出方向。
- **何時不要用**：表單欄位不要直接用 `input`／`select`／`textarea`，用 `form/` 的對應欄位（見下方裁決）；表格不要直接用 `table`，用 `data-table` 套件。
- 這些元件的表面契約（尺寸、狀態、radius、shadow 允用清單）屬 [`design-system.md`](design-system.md) §7。
- 範例：`src/ui/features/setting/components/SettingsUI.tsx`

### 近重複裁決

三組「看起來一樣、其實契約不同」的元件。選錯會拿到錯的 value 契約或錯的 surface：

| 該用哪個                         | 用在                                                                     | 不要用在                             |
| -------------------------------- | ------------------------------------------------------------------------ | ------------------------------------ |
| `form / TextInput`               | form 套件的文字欄位：RHF-free 的 **string** value 契約、帶 error 呈現    | data table 內；需要原生事件物件時    |
| `ui/input`                       | 需要 shadcn 原始 surface／原生事件，或作為上游 primitive 被擴充          | 表單欄位（改用 `form / TextInput`）  |
| `form / NumberInput`             | form 套件的數字欄位：string value 契約、`error` 呈現                     | data table 內                        |
| `data-table / NumberInput`       | data table 內的可編輯數字欄：原生事件契約、`compact` 高度、table surface | form 套件內                          |
| `form / Select`（`SelectField`） | 單值選欄位：`options` ＋ `noneLabel`、string value 契約                  | 需要自行組合 Radix parts 時          |
| `ui/select`（Radix part 集）     | 需要自行組合 Radix parts 的場合，或被上游擴充                            | 一般表單欄位（改用 `form / Select`） |

三者**共用的只有幾何與數字處理，surface 各自保留**——判準與表面規格見 [`design-system.md`](design-system.md) §7 的 `form` 與 `data-table`。
