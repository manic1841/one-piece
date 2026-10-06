# 共用元件目錄 (Component Catalog)

本文件是 `src/ui/components/` 共用元件的目錄：每個元件的用途、props 契約、變體、**何時不要用**，以及一處範例。契約（表面規格、token、pattern）屬 [`design-system.md`](design-system.md)；本目錄只回答「這個元件是什麼、什麼時候用它」。

**索引表是機器可讀的**：`src/ui/components/componentCatalog.test.ts` 斷言索引集合與檔案系統的元件集合相等——新增或移除元件而沒有同步索引時，測試會 fail。

## 規則

- **擴充，不 fork**：建立新共用元件前，先確認 `src/ui/components` 既有的能不能擴充；不能才新建，並在同一個 task 內遷移既有的重複實作（[`ui-layer-architecture.md`](ui-layer-architecture.md) §2 規則 9）。
- **Gallery 是正式規範樣板**：`/gallery` 路由（`src/ui/features/app/pages/Gallery*.tsx`，dev-only）已升格為全站畫面的視覺規範樣板——它以真實共用元件呈現每個元件的標準用法與場景。**新畫面開發一律先照 gallery 對應 section 的組合方式做**，不用自製實作；新增或調整共用元件時，同一個 task 內同步更新 gallery section，讓樣板與元件契約不漂移。既有的 production 畫面遷移到 gallery 樣板的追蹤見 GitHub issues（圖表 #259、元件採用 #261、頁面層落差 #262）；升格決策的取捨見 [ADR-0075](../adr/0075-gallery-normative-template.md)。
- **`ui/` 群組**：`ui/` 是 shadcn 上游 primitive 群，**以擴充上游為原則，不 fork 一份自有的**。需要新行為時優先在上游 primitive 或它上層的套件（`form/`、`data-table/`）處理，而不是複製 `ui/` 的檔案出來改。`data-table` 套件疊在結構 primitive 之上而非重寫（[ADR-0061](../adr/0061-data-table-package-over-primitives.md)）。
- **範例路徑**是「哪裡有真實用法」，不是唯一合法用法；沒有真實用法（僅 dev gallery 呈現）者標為 **無真實消費端** 並註明原因。

## 索引

| 檔案                                                    | 條目                              |
| ------------------------------------------------------- | --------------------------------- |
| `src/ui/components/AccessDenied.tsx`                    | AccessDenied                      |
| `src/ui/components/AppFallback.tsx`                     | AppFallback                       |
| `src/ui/components/ActivityList.tsx`                    | ActivityList / ActivityRow        |
| `src/ui/components/Avatar.tsx`                          | Avatar                            |
| `src/ui/components/charts/BarChart.tsx`                 | charts / BarChart                 |
| `src/ui/components/charts/ChartLegend.tsx`              | charts / ChartLegend              |
| `src/ui/components/charts/ChartScrubber.tsx`            | charts / ChartScrubber            |
| `src/ui/components/charts/ChartTooltip.tsx`             | charts / ChartTooltip             |
| `src/ui/components/charts/ComposedChart.tsx`            | charts / ComposedChart            |
| `src/ui/components/charts/DonutChart.tsx`               | charts / DonutChart               |
| `src/ui/components/charts/InteractiveBarChart.tsx`      | charts / InteractiveBarChart      |
| `src/ui/components/charts/InteractiveComposedChart.tsx` | charts / InteractiveComposedChart |
| `src/ui/components/charts/InteractiveLineChart.tsx`     | charts / InteractiveLineChart     |
| `src/ui/components/charts/LineChart.tsx`                | charts / LineChart                |
| `src/ui/components/CliProgress.tsx`                     | CliProgress                       |
| `src/ui/components/DangerZone.tsx`                      | DangerZone                        |
| `src/ui/components/Divider.tsx`                         | Divider                           |
| `src/ui/components/EmptyState.tsx`                      | EmptyState                        |
| `src/ui/components/ErrorBoundary.tsx`                   | ErrorBoundary                     |
| `src/ui/components/FilterStrip.tsx`                     | FilterStrip                       |
| `src/ui/components/FinancialNumber.tsx`                 | FinancialNumber                   |
| `src/ui/components/GateSurface.tsx`                     | GateSurface                       |
| `src/ui/components/InlineEditableTitle.tsx`             | InlineEditableTitle               |
| `src/ui/components/ListSectionHeader.tsx`               | ListSectionHeader                 |
| `src/ui/components/MetricGroup.tsx`                     | MetricGroup / Metric              |
| `src/ui/components/Module.tsx`                          | Module                            |
| `src/ui/components/NumberInput.tsx`                     | NumberInput                       |
| `src/ui/components/PageHeader.tsx`                      | PageHeader                        |
| `src/ui/components/PageSection.tsx`                     | PageSection                       |
| `src/ui/components/PeriodBadge.tsx`                     | PeriodBadge                       |
| `src/ui/components/RadioGroup.tsx`                      | RadioGroup / Radio                |
| `src/ui/components/RowActions.tsx`                      | RowActions                        |
| `src/ui/components/SearchField.tsx`                     | SearchField                       |
| `src/ui/components/Skeleton.tsx`                        | Skeleton                          |
| `src/ui/components/StatusGlyph.tsx`                     | StatusGlyph                       |
| `src/ui/components/Toast.tsx`                           | Toast                             |
| `src/ui/components/Toolbar.tsx`                         | Toolbar                           |
| `src/ui/components/YearMonthPicker.tsx`                 | YearMonthPicker                   |
| `src/ui/components/confirm/ConfirmDialog.tsx`           | confirm / ConfirmDialogProvider   |
| `src/ui/components/confirm/ConfirmDialogBody.tsx`       | confirm / ConfirmDialogBody       |
| `src/ui/components/drawer/DrawerPanel.tsx`              | drawer / DrawerPanel              |
| `src/ui/components/LoadingLine.tsx`                     | LoadingLine                       |
| `src/ui/components/data-table/DataTable.tsx`            | data-table / DataTable            |
| `src/ui/components/data-table/DataTableCell.tsx`        | data-table / DataTableCell        |
| `src/ui/components/data-table/DataTableColGroup.tsx`    | data-table / DataTableColGroup    |
| `src/ui/components/data-table/DataTableHeadCell.tsx`    | data-table / DataTableHeadCell    |
| `src/ui/components/data-table/DataTableRow.tsx`         | data-table / DataTableRow         |
| `src/ui/components/data-table/MobileDataRow.tsx`        | data-table / MobileDataRow        |
| `src/ui/components/data-table/NumberCell.tsx`           | data-table / NumberCell           |
| `src/ui/components/form/AdvancedDisclosure.tsx`         | form / AdvancedDisclosure         |
| `src/ui/components/form/DateInput.tsx`                  | form / DateInput                  |
| `src/ui/components/form/Form.tsx`                       | form / Form                       |
| `src/ui/components/form/FormControl.tsx`                | form / FormControl                |
| `src/ui/components/form/FormDescription.tsx`            | form / FormDescription            |
| `src/ui/components/form/FormField.tsx`                  | form / FormField                  |
| `src/ui/components/form/FormItem.tsx`                   | form / FormItem                   |
| `src/ui/components/form/FormLabel.tsx`                  | form / FormLabel                  |
| `src/ui/components/form/FormMessage.tsx`                | form / FormMessage                |
| `src/ui/components/form/ReadoutField.tsx`               | form / ReadoutField               |
| `src/ui/components/form/Select.tsx`                     | form / Select                     |
| `src/ui/components/form/TextArea.tsx`                   | form / TextArea                   |
| `src/ui/components/form/TextInput.tsx`                  | form / TextInput                  |
| `src/ui/components/sortable/SortableListScope.tsx`      | sortable / SortableListScope      |
| `src/ui/components/statement/StatementPanel.tsx`        | statement / StatementPanel        |
| `src/ui/components/statement/StatementTable.tsx`        | statement / StatementTable        |
| `src/ui/components/ui/accordion.tsx`                    | ui/ 群組                          |
| `src/ui/components/ui/alert.tsx`                        | ui/ 群組                          |
| `src/ui/components/ui/badge.tsx`                        | ui/ 群組                          |
| `src/ui/components/ui/button.tsx`                       | ui/ 群組                          |
| `src/ui/components/ui/card.tsx`                         | ui/ 群組                          |
| `src/ui/components/ui/checkbox.tsx`                     | ui/ 群組                          |
| `src/ui/components/ui/command.tsx`                      | ui/ 群組                          |
| `src/ui/components/ui/dialog.tsx`                       | ui/ 群組                          |
| `src/ui/components/ui/dropdown-menu.tsx`                | ui/ 群組                          |
| `src/ui/components/ui/input.tsx`                        | ui/ 群組                          |
| `src/ui/components/ui/label.tsx`                        | ui/ 群組                          |
| `src/ui/components/ui/popover.tsx`                      | ui/ 群組                          |
| `src/ui/components/ui/select.tsx`                       | ui/ 群組                          |
| `src/ui/components/ui/sheet.tsx`                        | ui/ 群組                          |
| `src/ui/components/ui/switch.tsx`                       | ui/ 群組                          |
| `src/ui/components/ui/table.tsx`                        | ui/ 群組                          |
| `src/ui/components/ui/tabs.tsx`                         | ui/ 群組                          |
| `src/ui/components/ui/textarea.tsx`                     | ui/ 群組                          |
| `src/ui/components/ui/tooltip.tsx`                      | ui/ 群組                          |

## 非元件模組（不在本目錄的元件索引）

這些檔案在 `src/ui/components/` 底下但不是元件本身，因此不列為元件條目。列在這裡是為了讓「索引 vs 檔案系統」的比對沒有暗門——新增同類檔案時測試會要求歸類。

| 檔案                                                  | 種類                                                 |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `src/ui/components/charts/chartTheme.ts`              | 表面常數（色調對應、donut 色階、數值格式）           |
| `src/ui/components/charts/chartInteraction.ts`        | 互動共用（點型別、keyboard scrubber、tooltip 定位）  |
| `src/ui/components/charts/composedChartGeometry.ts`   | 幾何計算（`ComposedChart` 使用）                     |
| `src/ui/components/charts/donutSlices.ts`             | 幾何計算（donut 切片、百分比與 conic-gradient stop） |
| `src/ui/components/charts/lineChartGeometry.ts`       | 幾何計算（`LineChart` 使用）                         |
| `src/ui/components/charts/monthTrendSeries.ts`        | 月份趨勢資料整理（標籤、tooltip、升冪序列）          |
| `src/ui/components/eyebrow.ts`                        | 表面常數（11px 全大寫 mono 標籤的共用 class）        |
| `src/ui/components/moneyTone.ts`                      | 表面常數（金額語意的色調對應）                       |
| `src/ui/components/data-table/index.ts`               | barrel                                               |
| `src/ui/components/data-table/parseOptionalAmount.ts` | 內部 helper（`NumberInput` 使用）                    |
| `src/ui/components/confirm/resolveConfirmOptions.ts`  | 選項正規化（confirm 預設值與型別）                   |
| `src/ui/components/confirm/useConfirm.ts`             | 內部接線（context 與 `useConfirm`）                  |
| `src/ui/components/data-table/styles.ts`              | 表面常數                                             |
| `src/ui/components/statement/statementRows.ts`        | 列組裝（報表語意階層的 `StatementRow[]` builder）    |
| `src/ui/components/statement/statementMetrics.ts`     | 指標身分定義（報表摘要 metrics 的標籤與順序）        |
| `src/ui/components/form/form-context.ts`              | 內部接線（context 與 `useFormField`）                |
| `src/ui/components/form/index.ts`                     | barrel                                               |
| `src/ui/components/form/styles.ts`                    | 表面常數                                             |
| `src/ui/components/ui/button-variants.ts`             | 變體定義模組（`button` 使用）                        |
| `src/ui/components/ui/input-styles.ts`                | 表面常數                                             |
| `src/ui/components/ui/tabs-styles.ts`                 | 表面常數                                             |

## 頁面骨架

- **`PageHeader`** — List / Detail / Workspace 頁的 Page Header：Title、Description、Actions，另可帶 crumb、badge、meta 與返回。
  - Props：`title`（必填）、`description?`、`crumb?`、`badge?`、`meta?`、`actions?`、`onBack?`。
  - 變體：無。
  - **不要用於**：把 Header 做成 Card、塞大量 Metric；那些是 [`visual-standards.md`](visual-standards.md) Page Shell 的禁止事項。
  - 範例：`src/ui/features/debt/pages/DebtDetailPage.tsx`

- **`AccessDenied`** — 拒絕存取畫面：`GateSurface` 版面 + 盾牌圖示 + H1「Access Denied」+ 說明 + Logout。`/access-denied` 路由與 Settings 授權閘共用。
  - Props：`description?`（預設為 `DEFAULT_ACCESS_DENIED_DESCRIPTION`）、`onLogout`（必填，由呼叫端注入）。
  - 變體：無。
  - **不要用於**：登入畫面（用 `LoginPage`）；一般頁面層的權限提示（那用 inline alert 或 `EmptyState`）。
  - 範例：`src/ui/features/auth/pages/AccessDeniedPage.tsx`、`src/ui/features/setting/pages/SettingsLayout.tsx`。

- **`AppFallback`** — 全 app 啟動不可恢復失敗的畫面。由 `ErrorBoundary` 與 `AuthGate` 使用；版面建在 `GateSurface` 上。
  - Props：`title`、`description`、`hint?`、`onRetry?`（未提供時預設按鈕為重新載入）。
  - 變體：無。
  - **不要用於**：一般頁面層的錯誤——那用 inline alert 或 exception（見 [`states-and-a11y.md`](states-and-a11y.md) 錯誤狀態）。
  - 範例：`src/ui/features/app/AuthGate.tsx`

- **`GateSurface`** — App 入口畫面（登入、拒絕存取、Onboarding）與啟動失敗共用的版面殼：置中窄欄、鋪滿視窗高度、`bg-background`，不含卡片。
  - Props：`children?`、`className?`（加在內層容器，用來控制間距與對齊）。
  - 變體：無。
  - **不要用於**：主介面內的頁面——那些用 Page Shell（`PageHeader` ＋ `PageSection`），見 [`visual-standards.md`](visual-standards.md)。
  - 範例：`src/ui/features/auth/pages/LoginPage.tsx`、`src/ui/components/AppFallback.tsx`

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

- **`InlineEditableTitle`** — 就地編輯的標題。trim 後為空或未變更即取消；Enter 儲存、Escape 取消；儲存失敗自動還原。
  - Props：`value`、`onSave(value) => Promise<void> | void`、`disabled?`、`className?`。
  - **不要用於**：需要明確 save／cancel 按鈕與欄位驗證的表單（用 `form` 套件）。
  - 範例：`src/ui/features/project/pages/ProjectDetailPage.tsx`

- **`Skeleton`** — 載入 shimmer 區塊（Table / List / Detail 的 loading 態）。組合多個 block 成列；自身只渲染一塊。
  - Props：`className?`（尺寸由呼叫端給）。
  - **不要用於**：長時間工作的進度（用 `CliProgress`）；單行文字 loading 已足夠時。
  - 範例：`src/ui/features/dashboard/pages/DashboardPage.tsx`、`src/ui/features/project/pages/ProjectsPage.tsx`

- **`CliProgress`** — Terminal-style 進度條（`[████░░] 62%`）。自繪 bar，自帶 `role="progressbar"` 與 `aria-value*`。ASCII 軌道會撐滿容器寬度（填色與剩餘格都是超長字元串、依左右各自裁切），在任何寬度下都維持 terminal 讀數外觀。預設用於長時間工作的 loading 態（states-and-a11y 的 engineering identity）；省略 `command` 時可作為區塊/階段的完成量表。
  - Props：`command?`（有給才畫 `$ …` 命令列）、`value`（0-100）、`tone?`（`default`/`positive`/`warning`）、`statusText?`（`→ …` 行）、`detail?`（尾端小字，如 `3/5 · NEXT LEDGER`）、`ariaLabel?`（`command` 缺席時的無障礙名稱）、`className?`。
  - **不要用於**：短暫 loading（用 `Skeleton` 或單行文字）；需要水平量表的比例顯示（用堆疊條或 `DonutChart`）。
  - 範例：`src/ui/features/dashboard/components/MonthlyCloseCard.tsx`、`src/ui/features/app/pages/GalleryFeedback.tsx`

- **`LoadingLine`** — 一般載入態的單行文字（`Loading...`）。預設鋪滿視窗高度並置中，供 app 啟動閘門用；嵌在區塊內時以 `className` 覆寫高度。
  - Props：`className?`。
  - **不要用於**：Table / List / Detail 的載入（用 `Skeleton`）；長時間工作（用 `CliProgress`）。
  - 範例：`src/ui/features/app/AuthGate.tsx`、`src/ui/features/app/router/ProtectedRoute.tsx`、`src/ui/features/app/pages/GalleryFeedback.tsx`

- **`EmptyState`** — 空狀態：狀態 glyph ＋ status 標題 ＋ 一句說明 ＋ 一個主要 action。不做大型 Card。
  - Props：`title`、`description`、`action?`、`className?`。glyph 固定，不是 prop。
  - **不要用於**：錯誤狀態（用 inline alert）；頁面級 fallback（用 `AppFallback`）。
  - 範例：`src/ui/features/dashboard/pages/DashboardPage.tsx`、`src/ui/features/project/pages/ProjectsPage.tsx`、`src/ui/features/debt/pages/DebtListPage.tsx`

- **`FinancialNumber`** — 財務數值顯示：`hero` / `large` / `default` 三級 ＋ 選用 change line ＋ 缺值「$ —」。值與 change line 都由呼叫端預先格式化，本元件不做貨幣運算。
  - Props：`value?: string | null`、`size?`、`tone?`（`default`/`positive`/`negative`）、`change?`、`changeTone?`（`default`/`positive`/`negative`/`muted`）、`className?`。提供 `change` 時根元素變為 block。
  - **不要用於**：表格儲存格（用 `data-table` 的 `NumberCell`）；輸入（用 `NumberInput`）。
  - 範例：`src/ui/features/dashboard/pages/DashboardPage.tsx`（hero 淨資產 ＋ YTD change line）、`src/ui/features/debt/pages/DebtDetailPage.tsx`、`src/ui/features/project/pages/ProjectDetailPage.tsx`（hero 專案餘額）。

- **`MetricGroup` / `Metric`** — 同層級財務指標列：label + mono 值 + change line，非卡片。`MetricGroup` 是分割線容器，`Metric` 是單一指標。
  - Props（Group）：`children`、`columns?`（`2`/`3`/`4`/`5`，md 以上；手機固定 2 欄）、`lastSpansFull?`（末格在手機跨滿，收掉 2 欄換行留下的缺角）、`className?`。Props（Metric）：`label`、`value`、`tone?`、`change?`、`changeTone?`、`testId?`、`className?`。
  - **不要用於**：需要互動或篩選的資料（那是 table/toolbar 的事）。
  - 範例：`src/ui/features/dashboard/pages/DashboardPage.tsx`（FINANCIAL SNAPSHOT，5 欄）、`src/ui/features/project/pages/ProjectDetailPage.tsx`（SUMMARY，3 欄）、`src/ui/features/debt/pages/DebtDetailPage.tsx`（LOAN INFORMATION，4 欄）、`src/ui/features/debt/pages/DebtListPage.tsx`（SUMMARY，2 欄）。

- **`PageSection`** — 頁面層級的全寬 section band（`border-b` ＋ `py-10`），visual-standards 的「structure over cards」：頁面區域用 band 分段，不用浮動卡片。number ＋ title 為選用的 section 標題（14px mono 全大寫 `font-semibold text-foreground`，`sectionTitleClass`，比 eyebrow 標籤大一階）；僅內容時是素 band。
  - Props：`number?`、`title?`、`action?`（與標題同列的尾端控件）、`spacing?`（`default`/`compact`，後者收緊密集堆疊）、`children`、`className?`。
  - **不要用於**：section 內的個別單元（用 `Module`）；需要 sticky 或導航的區域（用 `PageHeader` / `Toolbar`）。
  - 範例：`src/ui/features/dashboard/pages/DashboardPage.tsx`（`spacing="compact"` 堆疊）、`src/ui/features/project/pages/ProjectDetailPage.tsx`、`src/ui/features/debt/pages/DebtDetailPage.tsx`、`src/ui/features/debt/pages/DebtListPage.tsx`。

- **`Module`** — PageSection 內的 distinct module：mono label + 卡片邊界（唯一允許卡片的層級，design-system「Card 保留給 distinct module」）。`min-w-0` 防止在響應式 grid 溢出。
  - Props：`label`、`children`、`className?`。
  - **不要用於**：頁面級分段（用 `PageSection`）；列表內的重複列（那不是 module，是 row）。
  - 範例：`src/ui/features/setting/pages/sections/HouseholdSettingsPage.tsx`、`src/ui/features/setting/pages/sections/AccountingSettingsPage.tsx`。

- **`ui/accordion`** — 可摺疊的 section 級面板（Radix 包裝）：trigger 是一列 mono 標題，內容展開。用於把次要閱讀層收起，或把同質項目依固定維度分成可收合的群組。
  - Props：透通 Radix Root／Item／Trigger／Content；`type`、`defaultValue` 由呼叫端決定（`multiple` 可多開）。
  - **不要用於**：表格列的展開明細（那是 `data-table` 的列展開，見 [`design-system.md`](design-system.md) `data-table`）；需要 tab 語意的區塊切換（用 `ui/tabs`）；**section 標題本身**——非摺疊的 section 用 `PageSection` 的 `title`，不要拿 accordion trigger 當標題樣式。
  - 範例：`src/ui/features/monthly_close/stages/portfolio_cash_flow/components/PortfolioCashFlowSection.tsx`（每個 portfolio 一個可摺疊 section）；`src/ui/features/setting/components/LedgerCodeSettings.tsx`（把科目清單依類型分成可收合的群組、預設全開，群組標題帶筆數）。

- **`ActivityList` / `ActivityRow`** — 最近活動列：date / title+meta / amount。列表容器收掉最後一列的底線。
  - Props（Row）：`date`、`title`、`meta?`、`amount?`、`tone?`、`onActivate?`（提供時該列變成可點擊的 button，供導覽／選取）、`className?`。
  - **不要用於**：完整交易資料表（用 `data-table` 套件）。
  - 範例：`src/ui/features/dashboard/pages/DashboardPage.tsx`（RECENT TRANSACTIONS）。

- **`ListSectionHeader`** — 清單區塊的標題列：標題（可選 `(n)` 計數）＋ 尾端動作。section 標題 class 在此決定，垂直間距由呼叫端給（`className`）。
  - Props：`title`（必填）、`count?`、`actions?`、`className?`。
  - **不要用於**：頁面層級 section（用 `PageSection` 的 `title`）；資料表自身的表頭（那是 `data-table`）。
  - 範例：`src/ui/features/retirement/components/detail/IncomeTabContent.tsx`、`src/ui/features/retirement/components/AssumptionsForm.tsx`

- **`RowActions`** — 可編輯列的列尾 edit／delete 成對動作：`edit` 是節點（通常是 dialog trigger），delete 是 destructive icon button。
  - Props：`edit?`、`onDelete`（必填）、`deleteLabel`（必填，delete 的無障礙名稱）、`className?`。
  - **不要用於**：密度或語意不同的列動作——交易列用較密的 `h-8 w-8` muted→primary 變體（見 `TransactionItem`），本元件不涵蓋。
  - 範例：`src/ui/features/retirement/components/detail/IncomeTabContent.tsx`、`src/ui/features/retirement/components/detail/ExpenseTabContent.tsx`

- **`Avatar`** — 身分圓形：photo 或 initials，mono、uppercase。`rounded-full` 白名單內的本質圓形。
  - Props：`initials?`、`src?`、`alt?`、`size?`（`sm`/`default`）、`className?`。
  - **不要用於**：非身分用途的圓形裝飾。
  - 範例：`src/ui/features/app/layout/UserMenu.tsx`

- **`Divider`** — 結構性分隔線。純呈現、無語意。
  - Props：`className?`。
  - **不要用於**：需要語意分組的內容（用 section / heading）。
  - 範例：`src/ui/features/transaction/components/form/TransactionForm.tsx`、`src/ui/features/transaction/components/form/DynamicCategorySelector.tsx`。

- **`DangerZone`** — 頁面尾端的不可逆動作區（ui-layer-architecture §7.6）：destructive 分隔線、destructive 標題、destructive 動作鈕。標題文字固定在本元件內，不由呼叫端傳入。
  - Props：`actionLabel`、`onAction`、`className?`。
  - **不要用於**：可逆的管理動作（用 Detail header 的 inline action）。
  - 範例：`src/ui/features/debt/components/DebtDetail.tsx`

- **`Toolbar`** — 頁面工具列：資料檢視控制在前、動作在後，兩組分離。
  - Props：`children?`（leading）、`actions?`（trailing）、`className?`。
  - **不要用於**：表單欄位列（用 `form` 套件）。
  - 範例：`src/ui/features/app/pages/GalleryLayout.tsx`、`src/ui/features/project/pages/ProjectsPage.tsx`

- **`FilterStrip`** — 語意為 filter 的底線式篩選列。項目為原生 `button`，以 `aria-pressed` 標示選取；整列是具名的 `role="group"`。沿用 `tabs` 的觸發區 token（選中態 2px 底線以 `-mb-px` 咬住細線），但**細線由呼叫端的列提供**——本元件不畫自己的容器框線，因此可嵌進任何有底線的列。
  - Props：`items`（`{ id, label }[]`，必填）、`value`（選取的 id）、`onValueChange`（必填）、`ariaLabel`（必填）、`className?`。
  - **不要用於**：切換內容區塊的 tab（用 `ui/tabs`）；需要 server-side 重載的資料範圍選擇（那是期間瀏覽，不是情境篩選）。
  - 範例：`src/ui/features/transaction/pages/TransactionsPage.tsx`、`src/ui/features/project/pages/ProjectsPage.tsx`、`src/ui/features/app/pages/GalleryFeedback.tsx`

- **`SearchField`** — 模組內情境搜尋欄（標準 input 表面；focus 走既有 input 的 primary focus ring，不另換表面）。
  - Props：`value`、`onValueChange`（必填）、`placeholder?`、`ariaLabel`（必填，可存取名稱）、`className?`、`ref`。
  - **不要用於**：全域 Find / Do / Navigate（那是 Command Palette）；需要送出才過濾的查詢（本元件只回報輸入值）。
  - 範例：`src/ui/features/transaction/pages/TransactionsPage.tsx`、`src/ui/features/app/pages/GalleryFeedback.tsx`

- **`Toast`** — Toast 表面（visual-standards §通知）：浮動卡片，左側狀態 glyph + 訊息、右側單一選用動作（UNDO／RETRY）。元件自帶表面（`bg-card` + `border` + `shadow-lg`）；live toast 以 `toast.custom(() => <Toast …/>, { unstyled: true, style: { width: '356px' } })` 掛進 sonner，全域 `Toaster` 只負責定位，不再加表面。同檔匯出 `showToast(message, tone?)`（封裝上述掛法）與 `LIVE_TOAST_OPTIONS`；呼叫端優先用 `showToast`。Toast 只回報結果，不承載 workflow instruction。
  - Props：`message`、`tone?`（`success`／`error`）、`actionLabel?`、`onAction?`、`className?`。
  - **不要用於**：需要使用者解決的問題（用 inline alert）；重要的 workflow instruction；純字串 `toast('…')`（會落到 sonner 預設外觀）。
  - 範例：`src/ui/features/transaction/pages/TransactionsPage.tsx`（`showToast`：交易儲存／刪除成功）。

- **`RadioGroup` / `Radio`** — 行內單選：原生 `input[type=radio]`、`<label>` 包覆控制項，零 Radix 依賴。
  - Props（Group）：`aria-label`（必填）、`name`、`value?`、`onValueChange?`、`children`、`className?`。Props（Radio）：`value`、`label`、`className?`。
  - **不要用於**：二元設定（用 `ui/` 群組的 `switch`）；多選（用 `checkbox`）。
  - 範例：`src/ui/features/transaction/components/TransactionPeriodPicker.tsx`、`src/ui/features/app/pages/GalleryForms.tsx`

- **`ui/tooltip`** — Tooltip primitive：Radix 包裝、Root 自帶 Provider。「僅在需要時解釋」——不懂的縮寫、推導式、缺值說明。
  - Props：透通 Radix Root/Trigger/Content；Content 預設 `sideOffset={6}`、`max-w-xs`。
  - **不要用於**：恆常可見的說明（那用 description 文字）。
  - 範例：`src/ui/features/portfolio/components/PortfolioDetail.tsx`（RETURN section 的「報酬計算方式」資訊鈕，解釋 Modified-Dietz 推導）。

- **`YearMonthPicker`** — 年月選擇（outline 按鈕 ＋ Popover 內雙 Select）。`mode` 為 `'year-month'`（預設）或 `'year'`。
  - Props：`mode?`、`year`、`month?`、`onYearChange`、`onMonthChange?`、`className?`。
  - 選擇只暫存在 picker 內（draft state），按 APPLY 才 commit；Escape／外點取消。
  - **不要用於**：單一日期（那是 `form / DateInput`）。
  - 範例：`src/ui/features/monthly_close/pages/ClosePeriodPickerPage.tsx`、`src/ui/features/app/pages/GalleryForms.tsx`

## 抽屜與確認 (drawer / confirm)

兩組升格自 app shell 的共用表面（issue #262）。形狀相同：Radix 容器（`SheetContent`／`DialogContent`）擁有 overlay、焦點與關閉鈕；內容殼只負責標題、內文與 footer。

**inline 與 live 是同一個表面**：兩者都能放在 Radix 容器內（live）或直接 render 在頁面上（`inline`）。live 用 Radix 的 `SheetTitle`／`SheetDescription`／`DialogTitle`（讓容器取得無障礙名稱），inline 用**同 class** 的語意元素；契約由測試斷言（`DrawerPanel.test.tsx`、`ConfirmDialog.test.tsx`）——class 漂移會 fail。

- **`drawer / DrawerPanel`** — 抽屜的內容殼，放在 `SheetContent` 內。
  - Props：`title`（必填）、`description?`、`onClose?`（僅 inline 分支自畫；live 的關閉鈕由 `SheetContent` 擁有）、`footer?`、`children?`、`titleClassName?`、`inline?`。
  - 使用規則：**抽屜／panel 用 `DrawerPanel`；非抽屜語意的 sheet（如 Pixel Pet 行動版 navigator）才直接用 `ui/sheet`**。
  - **不要用於**：非抽屜語意的 sheet；需要自組 `SheetContent` 內部結構的場合。
  - 範例：`src/ui/features/monthly_close/stages/securities_trade/components/TradeDrawer.tsx`、`src/ui/features/app/pages/GalleryInteraction.tsx`

- **`confirm / ConfirmDialogProvider`** — 全站掛載的 promise-based 確認對話（`useConfirm()` 回傳 `Promise<boolean>`）。結構為 Title → Context → Consequence → Actions。字串輸入是不可逆刪除的預設（destructive `DELETE`）；可逆動作傳結構化 options 並用非 destructive 標籤。
  - **不要用於**：需要多欄位輸入的對話（那不是 confirm）。
  - 範例：`src/ui/features/transaction/pages/TransactionsPage.tsx`

- **`confirm / ConfirmDialogBody`** — 對話的內容殼，可放在 `DialogContent`（modal）或頁面內（`inline`，Gallery 預覽用）。
  - Props：`options`（`ConfirmOptions | null`）、`onConfirm`、`onCancel`、`inline?`。
  - 範例：`src/ui/components/confirm/ConfirmDialog.tsx`（modal 分支）。

## 圖表 (charts)

資料驅動的圖表群：呼叫端傳值與標籤，幾何、比例與軸標籤由元件推導。色調一律走 `chartTheme.ts`：語意圖表用 tone→token 對應（`primary` / `positive` / `negative` / `neutral` / `investment` / `asset`），分類拆解圖（donut）用 `CHART_DONUT_COLORS` 的 `chart-*` 類別色板（[`design-system.md`](design-system.md) §1、[ADR-0081](../adr/0081-chart-tone-vs-categorical-palette.md)）。標籤文字一律由呼叫端提供——元件不得硬編任何領域系列名稱。

- **`charts / LineChart`** — 折線圖：格線、可選面積、座標軸標籤。y 軸預設以資料範圍加邊距（不做 0 基底），讓大額餘額中的小幅變動仍可讀；`includeZero` 可改為 0 基底。
  - Props：`values`（必填）、`labels?`（長度需與 `values` 相同才會畫 x 軸）、`tone?`、`showArea?`、`markLastPoint?`、`includeZero?`（y 值域含 0）、`zeroLine?`（在 0 畫虛線，需 0 落在值域內）、`yAxis?`（`none`/`left`，左側值標籤）、`height?`、`ariaLabel?`、`className?`、`children?`（render-prop，取得算好的 geometry 以便疊加互動層）。
  - **不要用於**：需要 hover 明細——用 `InteractiveLineChart`。
  - 範例：`src/ui/components/charts/InteractiveLineChart.tsx`（作為互動版的基礎）；`src/ui/features/app/pages/GalleryCharts.tsx`（`includeZero` ＋ `zeroLine` 場景）。

- **`charts / BarChart`** — 分組長條圖。值以**大小**呈現（高度 ∝ 數值），收入／支出用 series 的 tone 表達，不是負高度；`highlightIndex` 指定的欄位改用 primary tone（呼叫端不需要 highlight 時可省略）。
  - Props：`labels`、`series`（`{ tone, values }[]`）、`highlightIndex?`、`height?`、`showLabels?`、`ariaLabel?`、`className?`、`children?`（`(layout) => ReactNode` 疊加層，`layout` 提供每個欄位的 index／label／values／ratio）。
  - `children` 疊加層會被放在長條區內、與欄位同樣的 flex 版面下；一旦提供 `children`，`ariaLabel` 不再掛 `role="img"`（交給疊加層自行標註語意）。
  - **不要用於**：長條圖的明細 tooltip——用 `InteractiveBarChart`。
  - 範例：`src/ui/components/charts/InteractiveBarChart.tsx`（作為互動版的基礎）。

- **`charts / ComposedChart`** — 複合圖：分組長條與折線共用同一塊繪圖區。長條可為負值（由 0 基準線向下長），折線可選擇填滿；具 `axis: 'right'` 的序列使用獨立的右側 y 軸。可標記 `referenceLines`（依欄位 index 畫垂直虛線，例如退休年）。左／右軸刻度與 x 軸標籤由元件推導。
  - Props：`labels`、`series`（`{ kind: 'bar' | 'line', tone, values, axis?, area?, baselineValues? }[]`）、`referenceLines?`（`{ index, tone?, label? }[]`）、`height?`、`showLabels?`、`ariaLabel?`、`className?`、`children?`（`(layout) => ReactNode` 疊加層，`layout` 提供欄位、長條矩形、折線路徑、軸標籤與實際使用的標記）。
  - 值以**大小**呈現；長條一律從 0 基準線長出，負值向下。折線與同軸的長條共用一個 y 值域。
  - `area` 的面積預設填到 0 基準線；`baselineValues` 逐點指定另一條線為下緣（堆疊帶，例如把投資報酬疊在收入之上）；基線逐點變動時，面積路徑的下緣會逐一描過基線取樣點，不會只收兩個角點而切過那條線。面積一律是該序列顏色的**單色資料歸屬漸層**：濃度端在該帶自己的線上，往它的基線淡出；基線在線的上方時（零基準以下的支出帶、或被堆疊在別人之下）方向整個反轉（[ADR-0078](../adr/0078-single-colour-data-affiliation-gradient.md)）。
  - 一旦提供 `children`，`ariaLabel` 不再掛 `role="img"`（交給疊加層自行標註語意）。
  - **不要用於**：需要 hover 明細——用 `InteractiveComposedChart`。
  - 範例：`src/ui/features/retirement/components/projection/CashFlowChart.tsx`（收入＋投資報酬堆疊帶＋支出帶＋淨現金流線＋淨資產右軸線）。

- **`charts / DonutChart`** — 圓環圖：圓環 ＋ 中心標題 ＋（可選）垂直圖例。切片顏色取自 `CHART_DONUT_COLORS` 類別色板（首片 `primary`，其餘 `chart-1..7`，依資料順序），佔比由數值推導並四捨五入為整數百分比。
  - Props：`segments`（`{ label, value }[]`）、`centerLabel`、`size?`、`showLegend?`、`ariaLabel?`、`className?`。
  - **不要用於**：需要精確讀值——圓環只適合看比例；精確值用數字或表格。
  - 範例：`src/ui/features/dashboard/components/AssetCompositionBlock.tsx`（資產組成）。

- **`charts / ChartLegend`** — 圖例。`horizontal` 為 inline swatch 列（長條圖），`vertical` 為 label／value 列（圓環）。
  - Props：`items`（`{ label, tone?, color?, value? }[]`）、`orientation?`、`className?`。
  - **不要用於**：需要互動切換序列（本輪未實作）。
  - 範例：`src/ui/components/charts/DonutChart.tsx`（`vertical` 模式）。

- **`charts / ChartTooltip`** — 圖表 hover 卡片表面（標題／數值／次要行）。定位由呼叫端負責。
  - Props：`title`、`value`、`meta?`、`className?`、`style?`。
  - **不要用於**：非圖表的說明（那用 `ui/tooltip`）。
  - 範例：`src/ui/components/charts/InteractiveLineChart.tsx`、`src/ui/components/charts/InteractiveBarChart.tsx`

- **`charts / ChartScrubber`** — 兩個互動圖表共用的互動層：單一 `role="slider"` 表面、鍵盤契約（左右鍵移動、Escape 清除）與 `aria-valuetext`。呼叫端提供「指標位置 → 索引」的映射（`resolveIndex`，回 -1 表示不改變），並以 render-prop 從 scrubber state 畫自己的導線／資料點／tooltip。
  - Props：`count`、`plotHeight`、`points`、`ariaLabel`、`className`、`resolveIndex`、`children`。
  - **不要用於**：非互動的圖表——`LineChart` / `BarChart` 不需要它。
  - 範例：`src/ui/components/charts/InteractiveLineChart.tsx`、`src/ui/components/charts/InteractiveBarChart.tsx`

- **`charts / InteractiveLineChart`** — `LineChart` ＋ scrubber：導線、資料點、共用 `ChartTooltip`。整塊以 `role="slider"` 呈現，滑鼠 hover 與鍵盤左右鍵都能選取同一筆資料（Escape 清除）。
  - Props：`values`、`points`（`{ title, value, meta? }[]`）、`xLabels?`、`tone?`、`includeZero?`、`yAxis?`、`height?`、`ariaLabel`（必填）、`className?`。
  - **不要用於**：只是要看趨勢、不需要明細——用 `LineChart`。
  - 範例：`src/ui/features/dashboard/pages/DashboardPage.tsx`（淨資產趨勢，`includeZero` ＋ `yAxis="left"`）、`src/ui/features/app/pages/GalleryCharts.tsx`

- **`charts / InteractiveBarChart`** — `BarChart` ＋ hover／鍵盤 scrubber：導線、共用 `ChartTooltip`。整塊以 `role="slider"` 呈現，滑鼠移到任一欄位（以各欄實際 rect 命中）或鍵盤左右鍵都能選取該欄（Escape 清除）。
  - Props：`labels`、`series`、`points`（`{ title, value, meta? }[]`）、`highlightIndex?`、`height?`、`showLabels?`、`ariaLabel`（必填）、`className?`。
  - **不要用於**：只是要看趨勢、不需要明細——用 `BarChart`。
  - 範例：`src/ui/features/dashboard/components/CashFlowChartBlock.tsx`（月現金流流入／流出）、`src/ui/features/app/pages/GalleryCharts.tsx`

- **`charts / InteractiveComposedChart`** — `ComposedChart` ＋ hover／鍵盤 scrubber：導線、共用 `ChartTooltip`。整塊以 `role="slider"` 呈現，滑鼠移到任一欄位（以指標 x 位置命中）或鍵盤左右鍵都能選取該欄（Escape 清除）。
  - Props：`labels`、`series`、`referenceLines?`、`points`（`{ title, value, meta? }[]`）、`height?`、`showLabels?`、`ariaLabel`（必填）、`className?`。
  - **不要用於**：只是要看趨勢、不需要明細——用 `ComposedChart`。
  - 範例：`src/ui/features/retirement/components/projection/CashFlowChart.tsx`、`src/ui/features/retirement/components/projection/NetWorthChart.tsx`

## data-table 套件

表格的結構 primitive 群，疊在 `ui/table` 之上（[ADR-0061](../adr/0061-data-table-package-over-primitives.md)）。套件同時 re-export `ui/table` 的結構元件與 `styles.ts` 的常數。

- **`DataTable`** — 表格外框。**`DataTableScrollArea`** 是可捲動區（僅桌機）。
  - Props：原生 table 屬性（`DataTable`）／原生 div 屬性（`DataTableScrollArea`）。
  - **不要用於**：非表格的資料陳列（行動版清單用 `MobileDataRow`）。
  - 範例：`src/ui/features/transaction/components/TransactionItem.tsx`、`src/ui/features/debt/pages/DebtListPage.tsx`、`src/ui/features/debt/components/detail/DebtHistoryTable.tsx`、`src/ui/features/monthly_close/stages/account_balance/components/CloseAccountBalanceInputs.tsx`

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
  - 範例：`src/ui/features/transaction/components/TransactionItem.tsx`、`src/ui/features/monthly_close/stages/account_balance/components/CloseAccountBalanceInputs.tsx`

- **`NumberCell`** — 數字 cell 的顯示。
  - Props：原生 `td` 屬性（不含 children 與 align），另加 `value`（`number | null | undefined`）、`format?`、`emptyText?`（預設 `—`）。
  - **不要用於**：可編輯的數字欄（用 `NumberInput`）。
  - 範例：`src/ui/features/transaction/components/TransactionItem.tsx`、`src/ui/features/monthly_close/stages/account_balance/components/CloseAccountBalanceInputs.tsx`

- **`MobileDataRow`** — 行動版的 grouped row（label／值）。**`MobileDataList`** 是外框；**`MobileDataField`** 是其中一欄。**`MobileExpandableRow`** 是可展開的列變體：`summary` / `value` / `meta` / `actions` / `details`，自身接管展開狀態與鍵盤等價（Enter／Space）並在提供 `details` 時補上 `role="button"` 與 `aria-expanded`；`actions` 區停止冒泡，讓列動作不切換展開。
  - Props：原生 div 屬性；`MobileDataField` 另加 `label`（必填）、`children?`、`className?`；`MobileExpandableRow` 另加 `summary`（必填）、`value?`、`meta?`、`actions?`、`details?`。
  - **不要用於**：桌機佈局（用 `DataTable`）。
  - 範例：`src/ui/features/monthly_close/stages/account_balance/components/CloseAccountBalanceMobileLists.tsx`、`src/ui/features/transaction/components/TransactionItem.tsx`、`src/ui/features/debt/pages/DebtListPage.tsx`

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
- **`NumberInput`** — 全站唯一的數字輸入欄（`src/ui/components/NumberInput.tsx`；`form` 與 `data-table` 兩個 barrel 都 re-export，因此跨畫面共用一個元件、一個 string 契約，[ADR-0065](../adr/0065-rhf-free-field-components-with-formcontrol-glue.md)）。`surface` 選 `form`／`table`，兩者共用幾何與數字處理、surface 各自保留；`compact` 用於表格子列（32px）；`prefix?` 為選用貨幣前綴（呼叫端提供、不內建；金額顯示也不要經它，走 `formatCurrency`；承自已刪除的 `CurrencyInput`，目前僅 dev gallery 範例使用）。表面規格見 [`design-system.md`](design-system.md) §7。
  - Props：同 `TextInput` 的 string value 契約，另加 `surface?`（`form`（預設）／`table`）、`compact?`、`prefix?`、`error?`（僅 `surface="form"` 呈現）。
  - **不要用於**：表格儲存格的顯示（用 `NumberCell`）；唯讀推導值（用 `ReadoutField`）。
  - 範例：`src/ui/features/transaction/components/form/AllocationSection.tsx`（form surface）、`src/ui/features/monthly_close/stages/account_balance/components/CloseAccountBalanceInputs.tsx`（table surface）。
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

### 欄位輔助

欄位形狀、但不承載表單狀態的輔助元件。

- **`AdvancedDisclosure`** — 表單內「Advanced」揭露：field 形狀的邊框切換鈕（`ChevronDown`），展開後顯示次要欄位（visual-standards：複雜設定預設隱藏）。**不是** `ui/accordion`——那是有 mono 標題列的 section 級面板。
  - Props：`label`（必填）、`open`（必填，受控）、`onOpenChange`（必填）、`children`、`className?`。
  - **不要用於**：section 級可摺疊面板（用 `ui/accordion`）；區塊切換（用 `ui/tabs`）。
  - 範例：`src/ui/features/retirement/components/IncomeDialog.tsx`、`src/ui/features/retirement/components/ExpenseDialog.tsx`
- **`ReadoutField`** — 唯讀推導值的欄位列：label ＋ 與 input 同尺寸的邊框值框。用於表單算出的值（成長率、期間），不是輸入。
  - Props：`label`（必填）、`value`（必填，`ReactNode`）、`className?`。
  - **不要用於**：可編輯欄位（用 `NumberInput`／`TextInput`）；表單外的唯讀顯示（用 `Metric`／`FinancialNumber`）。
  - 範例：`src/ui/features/retirement/components/IncomeDialog.tsx`（Growth／Duration readout）

## sortable

- **`SortableListScope<T extends { id: string }>`** — 可拖曳排序的 scope（`items`、`onReorder`、`children`）。
- **`GripHandle`** — 拖曳啟用鈕（`label` 必填），另可帶 `attributes`、`listeners`、`className`、`testId`、`activatorRef`。
- 只有 grip 可拖曳，列點擊導覽不受干擾；grip 會停止事件冒泡並抑制拖曳後的一次 click。細節見 [ADR-0059](../adr/0059-dnd-kit-shared-sortable.md)。
- **不要用於**：非排序清單；也不要為排序另寫一份 DnD 接線。
- 範例：`src/ui/features/account/pages/AccountList.tsx`

## statement

- **`StatementPanel`** — 一張報表的排版外框：標題（僅行動版 `statementTitleClass`）＋ 摘要指標列 ＋ 表格內容。`title` 與 `metrics` 皆可缺席：空狀態保留標題、省略指標列（不顯示歸零假象）；`testId` 掛在外框根節點。報表檢視與月度關帳共用同一份外框。
- **不要用於**：一般頁面區塊（用 `PageSection`）；需要卡片式 KPI 時。
- **`statementMetrics`**（`statementMetrics.ts`）— 報表摘要指標的**身分定義**：`incomeMetrics`／`balanceMetrics`／`cashFlowMetrics` 各回傳該表固定三個 `StatementMetric`（`key`／`testId`／`label` 內定，值由呼叫端提供）。標籤取自 `@/ui/constants/report/reportMetricLabels` 的 `REPORT_METRIC_LABELS`；月度關帳在值之上另帶漂移變化行（`change`／`changeTone`）。指標陣容只定義一次，兩個表面因此不會各自漂移。
- **`StatementTable`** — 財務報表語意階層表格（兩欄：縮排標籤 ＋ 右緣金額）。`rows` 為 `StatementRow`（`key`／`label`／`amountText`／`amountWarning?`／`tone`／`level`／`children`），`collapsed`／`onToggle` 控制可摺疊列，`testId` 掛在表格上。同模組另匯出 `statementTitleClass`：行動版堆疊時每張表上方的標題表面（桌機由 tabs 承擔），由 `StatementPanel` 使用。
- **`buildStatementRows`**（`statementRows.ts`）— 把「區塊 + 資料」排成 `StatementRow[]`：指派縮排層級與語意角色、以路徑組出穩定 key（同層同名不互撞）、把每個區塊收成「標題列 → 資料列 → 合計列」並補上 terminus。呼叫端只提供已解析的金額欄（`StatementAmountCell`）與標籤；月度關帳（漂移比對）與報表檢視（已產生報表）共用同一份列結構。
- 語意角色由 `tone`（`section`／`group`／`detail`／`deepDetail`／`subtotal`／`terminus`）決定，縮排由 `level` 決定（見 [`visual-standards.md`](visual-standards.md) 「財務報表語意階層」）。金額一律由呼叫端先格式化為 `amountText`（`null` 表示該列無金額），元件不感知任何 drift／比較邏輯。
- **不要用於**：一般資料列表（用 `data-table` 套件）；需要多欄或可編輯欄位時。
- 範例：`src/ui/features/monthly_close/stages/financial_reports/components/CloseFinancialReportViews.tsx`、`src/ui/features/report/pages/ReportDetailPage.tsx`

## ui/ 群組（shadcn 上游 primitive）

`src/ui/components/ui/` 是 shadcn 產生的 primitive 群，包 Radix 或原生元素：`accordion`、`alert`、`badge`、`button`、`card`、`checkbox`、`command`、`dialog`、`dropdown-menu`、`input`、`label`、`popover`、`select`、`sheet`、`switch`、`table`、`tabs`、`textarea`。

- 變體軸（variant／size／direction 等）與完整值以各檔案為準，本目錄不複述完整列舉；表面契約見 [`design-system.md`](design-system.md) §7。其中少數非預設變體值得先知道：`button` 另有 `text` variant（tertiary 動作），`alert` 與 `badge` 另有 `destructive` 變體，`sheet` 有四個進出方向。
- **何時不要用**：表單欄位不要直接用 `input`／`select`／`textarea`，用 `form/` 的對應欄位（見下方裁決）；表格不要直接用 `table`，用 `data-table` 套件。
- 這些元件的表面契約（尺寸、狀態、radius、shadow 允用清單）屬 [`design-system.md`](design-system.md) §7。
- 範例：`src/ui/features/retirement/pages/RetirementPlanForm.tsx`

### 近重複裁決

以下「看起來一樣、其實契約不同」的元件，選錯會拿到錯的 value 契約或錯的 surface。數字輸入原本也是這樣一對（form／data-table 各一個），現已合併為單一 `NumberInput`，改用 `surface` 表達差異，不再列於此表：

| 該用哪個                         | 用在                                                                  | 不要用在                             |
| -------------------------------- | --------------------------------------------------------------------- | ------------------------------------ |
| `form / TextInput`               | form 套件的文字欄位：RHF-free 的 **string** value 契約、帶 error 呈現 | data table 內；需要原生事件物件時    |
| `ui/input`                       | 需要 shadcn 原始 surface／原生事件，或作為上游 primitive 被擴充       | 表單欄位（改用 `form / TextInput`）  |
| `form / Select`（`SelectField`） | 單值選欄位：`options` ＋ `noneLabel`、string value 契約               | 需要自行組合 Radix parts 時          |
| `ui/select`（Radix part 集）     | 需要自行組合 Radix parts 的場合，或被上游擴充                         | 一般表單欄位（改用 `form / Select`） |

`NumberInput` 的 `form`／`table` 兩種 surface **共用的只有幾何與數字處理，不是整體外觀**；其餘各組的判準與表面規格見 [`design-system.md`](design-system.md) §7 的 `form` 與 `data-table`。
