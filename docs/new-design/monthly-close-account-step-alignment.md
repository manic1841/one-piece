# Monthly Close — Account Step 對齊紀錄

> 用途：紀錄 `monthly-close-account-step-prototype.html` 在 Account Balance step 的所有對齊細節，並對照現行實作，作為 UI 修改的依據。
> 狀態：已實作（2026-09-23）。四項決策已確認並套用，見第 5 節實作紀錄。

---

## 0. 總覽：三份來源的對齊規則

| 來源 | 對齊規則 |
| --- | --- |
| 原型（prototype HTML） | 表格欄位明確分 `text-left` / `number`（`text-align:right` + mono）；數字欄位標籤 `.number-label` 右對齊；文字欄位保持左對齊 |
| 現行實作 | 大致已遵循「數字右對齊 + font-mono + tabular-nums」，但缺少**數字欄位標籤右對齊**，且個別欄位寬度/對齊不一致 |
| 全站標準 `docs/design-system.md`（`data-table` 段） | 數字右對齊、monospace、不顯示無意義 `.00`；表格 numeric right aligned、header muted、row height 54px、subtle divider |

## 1. 原型對齊規格（逐區塊）

### 1.1 Cash / Bank 表格

| 欄位 | 對齊 | 備註 |
| --- | --- | --- |
| Account | 左 | `text-left`；`table-layout:fixed`，欄寬均分 |
| Previous | 右 | `.number` = 右對齊 + mono + tabular-nums |
| Ending Balance | 右 | 輸入框 `.input`（150px、文字右對齊、mono），包在 `.input-wrap`（`justify-content:flex-end`） |
| Status | 左 | `.status-text` 左對齊，11px |

表格層級規則：`th`/`td` padding `0 12px`，首欄/尾欄 padding 歸零；header muted（10px uppercase）；row height 54px；1px 分隔線。

### 1.2 Foreign Currency 五欄 grid

原型 grid：`minmax(190px,1.3fr) minmax(120px,.8fr) minmax(160px,1fr) minmax(145px,.9fr) minmax(160px,1fr)`，`column-gap:28px`，`align-items:end`。

| 欄位 | 對齊 | 備註 |
| --- | --- | --- |
| Account | 左 | `.foreign-value` 內 `justify-content:flex-start` |
| Previous | 右 | `.foreign-value` 靠右 |
| Foreign Amount | 右 | 輸入框滿欄寬、文字右對齊 |
| Exchange Rate | 右 | 輸入框滿欄寬、文字右對齊 |
| TWD Value | 右 | `.foreign-value` 靠右 |

關鍵規則：**`.foreign-head.number-label { text-align:right }`**——數字欄位的標籤跟著數字一起右對齊。這是原型與現行實作最大的差異點。

### 1.3 Securities Holdings 表格

欄寬契約（`table-layout:fixed`）：

| 欄位 | 對齊 | 欄寬 |
| --- | --- | --- |
| Symbol | 左 | 18% |
| Name | 左 | 30% |
| Cost | 右 | 17.3% |
| Value | 右 | 17.3% |
| Leverage | 右 | 17.3% |

### 1.4 頁面層級

- 頁面標題區、workflow 列、step 標題區全寬。
- Action 列 `justify-content:flex-end`（SAVE DRAFT / CONFIRM & CONTINUE 靠右）。
- Footer note 僅存在於原型作為對齊說明；實作不應出現。

### 1.5 Responsive

- `<=900px`：foreign grid 收成 2 欄；Account 佔滿整列；數字欄標籤改回左對齊（`.number-label{text-align:left}`），數值靠左。
- `<=620px`：表格 collapse 成卡片式列，`td::before` 顯示欄位名；每列內 label 左、值右（`justify-content:space-between`）；輸入框 `max-width:180px`。

## 2. 現行實作對照

實作檔案：[CloseAccountBalanceInputs.tsx](/workspace/src/ui/features/monthly_close/components/CloseAccountBalanceInputs.tsx)、[SecuritiesAccountRow.tsx](/workspace/src/ui/features/monthly_close/components/SecuritiesAccountRow.tsx)

### 2.1 TWD row（L56-91）

現況：`md:grid-cols-[minmax(8rem,1fr)_auto_auto]` + `md:items-end md:gap-4`。

| # | 發現 |
| --- | --- |
| A | grid 只定義 3 欄，但有 4 個子元素（Account / 前期餘額 / 期末餘額 / Status）；Status 用 `md:col-start-4` 放到不存在的第 4 軌，產生隱式欄、寬度不可預期 |
| B | 前期餘額容器 `md:text-right` 僅 md 以上生效；mobile 時標籤與數字都左對齊，與原型 620px 以下「label 左、值右」規則不同 |
| C | 期末餘額輸入框 `w-36 text-right font-mono tabular-nums`（144px，接近原型 150px，可接受） |

### 2.2 Foreign row（L140-205）

現況：`md:grid-cols-4` 四欄均分。

| # | 發現 |
| --- | --- |
| D | 四欄均分與原型五欄不等比（原型：1.3fr / .8fr / 1fr / .9fr / 1fr）；原型把 Account 佔獨立欄，現行 Account 在標題列 |
| E | 前期餘額/外幣金額/匯率/TWD 價值的**欄位標籤全部左對齊**，數字右對齊——軸線不一致，即原型 `.number-label` 要解決的問題 |
| F | `取得匯率` 按鈕與 status 在標題列右側。原型沒有此按鈕，屬功能差異：保留功能、僅調整對齊 |

### 2.3 Securities row（`SecuritiesAccountRow.tsx`）

| # | 發現 |
| --- | --- |
| G | 桌面表格 `w-full` 無欄寬定義（原型 18/30/17.3/17.3/17.3%）；數字欄 `th` 有 `text-right`，但輸入框靠 `ml-auto` 補償（L139/149/160），欄寬不固定時 header 與輸入框對齊軸可能錯位 |
| H | mobile 持倉卡片的 Cost/Value/Leverage：標籤左對齊、輸入框右對齊，與原型 620px「label 左、值右」一致 |
| I | 「市值」「TWD 價值」標籤有 `text-right` 但包在 `justify-between` flex 裡，右側標籤-數字軸線沒有固定對齊參考 |
| J | Securities 匯率輸入框 `w-28`（112px）與 TWD 期末餘額 `w-36`（144px）不一致 |

### 2.4 輸入框寬度現況

| 位置 | 寬度 | 原型對應 |
| --- | --- | --- |
| TWD 期末餘額 | `w-36`（144px） | 150px |
| Foreign 外幣金額 / 匯率 | 滿欄寬（無固定寬） | 滿欄寬 |
| Securities Cost / Value / Leverage | `w-28` / `w-28` / `w-20` | 150px |
| Securities 匯率 | `w-28`（112px） | 150px |

### 2.5 標籤處理現況

- `sectionLabelClass = text-[10px] font-semibold uppercase tracking-widest text-muted-foreground`——無對齊規則，繼承父容器。
- 原型：表頭 muted（一致）；數字欄標籤右對齊（現行缺）。

## 3. 修改時的對齊契約（確認後採納）

1. **數字欄位標籤與數字同軸右對齊**（原型 `.number-label` 規則），md 以上生效；mobile 卡片式維持「label 左、值右」。
2. 沿用 `visual-consistency.md`：數字 `text-right` + `font-mono` + `tabular-nums`、表格 numeric right aligned、header muted、row 高度放寬至 ~48px 級距（現行 `py-1` 太緊）。
3. 欄寬契約：foreign row 採原型五欄 minmax 比例；securities 表格採 18/30/17.3/17.3/17.3% + actions 欄。
4. 輸入框寬度統一：金額輸入 `w-36`；匯率/小數欄統一 `w-28`；Securities Cost/Value 改滿欄寬或統一寬度，不再用 `ml-auto` 補償對齊。
5. 修復 TWD row grid：4 個子元素對 4 欄定義，移除 `md:col-start-4` 溢出。
6. Status 欄固定左對齊。
7. `取得匯率`、`匯入上月持倉` 按鈕為功能差異：保留功能與位置（標題列右側、垂直置中），僅確保與 status glyph 的對齊一致。

## 4. 待確認決策

| # | 決策點 | 選項 |
| --- | --- | --- |
| 1 | Foreign row 是否改成原型五欄（Account 佔獨立欄） | 現行四欄 + 標題列 Account vs 原型五欄 |
| 2 | 數字欄標籤右對齊只做 md 以上，mobile 維持 label 左 | 建議是（原型 900px 斷點行為） |
| 3 | Securities 表格是否導入原型欄寬百分比 | 建議是 |
| 4 | Row 高度是否從 `py-1` 放寬到 ~48px 標準 | 建議是（`visual-consistency.md` 第 11 節） |

## 5. 實作紀錄（2026-09-23）

四項決策皆確認採納（五欄 / md 以上標籤右對齊 / 導入欄寬 / 放寬 row 高度）。實作內容：

### 5.1 修改檔案

- `src/ui/features/monthly_close/components/CloseAccountBalanceInputs.tsx`
  - TWD row grid 改為 4 欄定義（`minmax(8rem,1fr)_auto_auto_auto`），移除 `md:col-start-4` 溢出。
  - 期末餘額欄 `md:text-right` + 輸入框 `md:ml-auto`：標籤與數字 md 以上同軸右對齊，mobile 維持 label 上、值下。
  - Foreign row 改五欄 `minmax(7rem,1.3fr)_minmax(5rem,0.8fr)_minmax(6.5rem,1fr)_minmax(6rem,0.9fr)_minmax(6.5rem,1fr)`（原型比例的 rem 版），Account 佔獨立欄（名稱 + 幣別），前期餘額/外幣金額/匯率/TWD 價值標籤 `md:text-right`。
  - `取得匯率` 按鈕與 status 移入 Account 欄（單一實體，避免 getByRole 重複）。
  - 後續追加（同日）：TWD row 欄寬改為 `md:grid-cols-4` 四欄等分（實測各 292px / 25.0%），對齊原型 Cash/Bank 表格 `table-layout:fixed` 均分規格；先前的 `1fr+auto` 群聚式定義會讓帳戶名佔 76%，不符原型比例。
- `src/ui/features/monthly_close/components/SecuritiesAccountRow.tsx`
  - 桌面表格 `table-fixed`，欄寬經 thead 定義：Symbol/Name/Cost/Value/Leverage 均分 + actions 7%（原型比例因多了 actions 欄等比調整）。
  - 數字欄輸入框改滿欄寬，移除 `ml-auto` 與固定寬；數字欄 `th` 加 `pr-3` 與 `td` 的 `pr-3` 對齊。
  - Row 高度 `py-1` 放寬為 `py-2.5`（實測 row 高 52px，在 ~48px 標準級距內）。
  - 「市值」「TWD 價值」標籤改由父容器 `text-right` 統一軸線；外幣匯率列 `md:text-right` + `md:ml-auto`。

### 5.2 驗證結果（Playwright 量測，viewport 1280）

| 項目 | 結果 |
| --- | --- |
| TWD row grid | `grid` 生效，4 欄等分各 292px（25.0% / 25.0% / 25.0% / 25.0%） |
| 前期餘額標籤 vs 數字右緣 | 632 = 632（同軸，欄內右對齊） |
| 期末餘額標籤 vs 輸入框右緣 | 940 = 940（同軸，欄內右對齊） |
| Securities 數字欄 header vs 輸入框 | diff 0（三欄皆同軸） |
| Securities row 高度 | 52px（`py-2.5`，48px 標準級距內） |
| Mobile 570px | 行動卡片顯示、桌面表格隱藏，label 左、值右 |

### 5.3 測試

- `CloseAccountBalanceInputs.test.tsx`：12 passed（測試期間抓到「取得匯率」按鈕重複渲染的缺陷，已修復為單一實體）。
- `src/ui/features/monthly_close/` 全部 + `design-contract.test.ts`：45 passed。
- ESLint：兩個修改檔案無錯誤。

## 6. 文字排版對齊 prototype（2026-09-23 第二輪）

比對 prototype 的欄位文字與內容排版，追加修改：

| 項目 | prototype 規格 | 修改前 | 修改後 |
| --- | --- | --- | --- |
| 區塊標題（現金 / 銀行等） | 13px / 600 / 亮色 / .08em | 10px muted（與欄位標籤共用 class） | `sectionTitleClass`：13px / 600 / foreground |
| 區塊附註 | 標題列右側小字 | 無 | `SECTION_NOTES`（Ending balance at period end 等），靠右 |
| 欄位標籤（前期餘額等） | 10px / 500 / .08em | font-semibold + tracking-widest | `sectionLabelClass`：10px / 500 / tracking-[0.08em] |
| 帳戶名稱幣別 | 名稱旁 11px mono 標籤 | TWD 列無幣別 | 名稱旁 `font-mono text-[11px]` 幣別標籤 |
| 前期餘額數字 | 預設文字色 | muted | `text-foreground` |
| inline 提示 | prototype 無此元素 | 需期末餘額 / 需金額與匯率 | 已移除（TWD + foreign 兩處），測試改為斷言不渲染 |

注意：inline 提示移除與 [ADR-0052](../adr/0052-monthly-close-stage-data-boundary.md) 的「inline 驗證：TWD 需期末餘額、外幣需金額＋匯率」描述分歧，該分歧已透過 ADR-0052 的 S3 修訂（2026-09-23）解決：inline 必填提示移除，缺漏輸入由 WAITING glyph 承擔。

驗證（Playwright 量測 + 截圖，viewport 1280）：

- 區塊標題實測 13px / 600 / `rgb(229,232,235)` 亮色 / 1.04px letter-spacing
- 區塊附註實測 10px、`justify-content: space-between` 靠右
- 欄位標籤實測 10px / 500 / 0.8px letter-spacing（.08em）
- 幣別標籤實測 11px JetBrains Mono
- 前期餘額數字實測 `rgb(229,232,235)`（foreground，非 muted）
- 「需期末餘額」「需金額與匯率」皆不存在於 DOM
- 期末餘額標籤與輸入框右緣 940 = 940（軸線維持）
- 測試：monthly_close 全部 + design-contract 45 passed

## 7. 全頁面對齊 prototype（2026-09-23 第三輪，grilling 27 題定案）

範圍：月度關帳頁面（頁首、workflow 列、步驟標題區、Account step）。全站 header 與色彩不在範圍（色彩維持 app token）。

### 7.1 定案決策

| # | 決策 |
| --- | --- |
| Q1-Q16 | Account step 內：中文維持、字級與位置照 prototype；thead 底線＋每列底線（實色）、首尾欄 padding 0；區塊間 1px 分隔線；Status 靠左；保留 VERIFIED/WAITING（資料語意）；證券表保留輸入框＋actions 欄（樣式套 prototype：32px 高、右對齊 mono）；列高 54px/13px/12px；輸入框 150×34；標題下間距 16px→30px 區塊級距；斷點維持 `md`；行動版橫向 label 左/值右；單顆按鈕套 prototype 樣式（38px）；外幣前期餘額改主文字色 |
| Q17 | 主標題改月份 `2026 年 9 月`（30px/500），上方 eyebrow `月度關帳`（11px/.12em） |
| Q18 | 移除 `MONTHLY CLOSE WORKFLOW` 副標題行 |
| Q19/Q24 | 開始關帳前 YearMonthPicker＋`開始關帳` 按鈕；開始後改 `PeriodBadge`（新元件：mono 13px 徽章 `關帳期間 / 2026-09`），picker 與按鈕不渲染；`YearMonthPicker` 不動（全站 9 個呼叫點） |
| Q20 | 現金表改真表格＋共用 thead（帳戶/前期餘額/期末餘額/狀態），md 以下維持卡片列 |
| Q21 | 步驟標題區：eyebrow `當前步驟`＋22px/500 標題＋mono 計數器，不加描述行 |
| Q22/Q25 | `StatusGlyph` 擴充 `label=""` 時只渲染 icon；步驟條 glyph icon-only；表頭列維持文字狀態；步驟條每個 step 之間加 1px 豎線（`border-r`，最後一個無） |
| Q23 | 按鈕保留 app 的 rounded-md，只套 38px 高＋右對齊＋間距 |
| Q26 | workflow 列 58px 高＋底線；mono 位置文字；toggle 無框線文字按鈕（11px 大寫 .08em，保留 chevron icon） |
| 追加 | 期末餘額欄與狀態欄之間加間距（`pl-12`，th 與 td 同步）；number 輸入框移除原生 +1/-1 spinner（`[appearance:textfield]` + webkit spin button appearance-none） |

### 7.2 修改檔案

- `src/ui/features/monthly_close/pages/MonthlyClosePage.tsx`：頁首 eyebrow＋月份 h1＋底線；`PAGE_SUBTITLE` 移除渲染；開始前後的期間顯示切換
- `src/ui/components/PeriodBadge.tsx`：新增（mono 期間徽章）
- `src/ui/components/StatusGlyph.tsx`：`label=""` 時 icon-only（向後相容）
- `src/ui/features/monthly_close/components/ClosePipeline.tsx`：58px workflow 列＋底線、mono 位置文字、無框線 toggle、步驟條豎線、glyph icon-only
- `src/ui/features/monthly_close/components/CloseWorkspace.tsx`：eyebrow `當前步驟`＋22px 標題＋mono 計數器＋底線；動作列 38px 按鈕＋上方分隔線
- `src/ui/features/monthly_close/components/CloseAccountBalanceInputs.tsx`：現金表改真表格＋`TwdTableHead`（54px 列高、13px py、12px pr、thead 底線、數字欄標籤與數字同軸、Status 靠左＋pl-12、150×34 直角輸入框、無 spinner）；行動版卡片列（label 左/值右）；區塊間 1px 分隔線＋30px 級距
- `src/ui/features/monthly_close/components/SecuritiesAccountRow.tsx`：thead 底線（10px/500/.08em）、數字欄 th/td `pr-3` 同軸、54px 列高、輸入框直角＋深底
- `src/ui/features/monthly_close/components/CloseAccountBalanceInputs.test.tsx`：雙渲染（桌表＋行動卡）斷言改 getAll/queryAll

### 7.3 驗證（Playwright 量測 + 截圖，viewport 1280 與 570）

| 項目 | 結果 |
| --- | --- |
| 前期餘額標籤 vs 數字 | 632 = 632（同軸） |
| 期末餘額標籤 vs 輸入框 | 933 = 933（同軸） |
| 狀態欄 | th/td 同步 `pl-12`（th 48px 生效），glyph 內容左移與表頭對齊 |
| 列高 | 54px（py-13px） |
| 期末餘額輸入框 | 150×34、直角、`bg-muted` 深底、無 spinner（appearance: textfield）、可輸入（實測 123456 右對齊） |
| 頁首 | eyebrow `月度關帳` 11px、h1 `2026 年 9 月` 30px/500、`PERIOD_LABEL` 徽章 mono 13px |
| workflow 列 | 58px＋底線、toggle 無框線（border 0px） |
| 步驟條 | 9 items、豎線 0.8px、最後一個無 |
| 步驟標題 | 22px/500、eyebrow `當前步驟` |
| 行動版 570px | 桌面表格隱藏（thead display none 效果由 md:hidden 容器承擔）、卡片列 2 列、label 左/值右 |
| 測試 | 45 passed（monthly_close + design-contract） |

### 7.4 追加修正（2026-09-23 第四輪）

| 項目 | 修正 | 驗證 |
| --- | --- | --- |
| 證券表 Symbol/Name 輸入框左緣被吃掉 | td 首兩欄改 `pl-3`（12px 內距），數字欄 th 補回 `pr-3`（右對齊標籤與輸入框右緣同軸 690=690） | Symbol 輸入框左緣距 td 12px，不再貼齊裁切 |
| workflow 步驟條等分 | `flex flex-wrap` 改 `grid grid-cols-9`（prototype `repeat(9,1fr)` 規格，gap 7px），移除豎線 `border-r` | 9 items 實測各 127px 等分 |
| 證券輸入欄重疊＋spinner | 全部 td 改 `pl-3 pr-3`（左右各 12px），數字欄補 `numberInputClass` 移除原生 spinner；th 同步 `pl-3 pr-3` | 相鄰輸入框間距實測 24px（×4）、appearance: textfield、數字乾淨無箭頭 |

### 7.5 空值顯示與區塊分隔（2026-09-23 第五輪）

| 項目 | 修正 | 驗證 |
| --- | --- | --- |
| 無資料顯示「-」 | 新增 `MONTHLY_CLOSE_LABELS.NO_DATA: '-'`；階段證據（`CloseStageEvidenceList`）與階段輸入無資料（`CloseStageInputs` portfolios/debtAccounts、`CloseAccountBalanceInputs` accounts）空狀態全部改用 | 階段證據區實測顯示「-」，舊文案「尚無階段證據。」不再出現 |
| 階段證據與階段輸入分隔 | 階段輸入容器（`MonthlyClosePage` `renderInputs`）加 `border-t border-border pt-4` | 實測 0.8px 實線＋16px 上間距 |

### 7.6 工作區標題移除 glyph（2026-09-23 第六輪）

| 項目 | 修正 | 驗證 |
| --- | --- | --- |
| 當前步驟不顯示 glyph | `CloseWorkspace` 移除標題 StatusGlyph 與 `statusText` prop（含 `headerGlyph`/`headerLabel` helpers、StatusGlyph import）；`MonthlyClosePage` 同步移除傳參。上方 pipeline 步驟條已顯示當前步驟狀態，避免重複 | 實測標題「01 帳戶餘額」無 svg glyph，IN PROGRESS 狀態僅顯示於上方步驟條；tsc 0 error、測試 45 passed |

### 7.7 外幣帳戶改 real table（2026-09-23 第七輪）

| 項目 | 修正 | 驗證 |
| --- | --- | --- |
| 外幣帳戶結構統一 | `ForeignAccountRow` 從 5 欄 minmax grid 改為 real `<table>`，與 Cash/Bank、證券 holdings 相同結構與規格：6 欄（帳戶／前期餘額／外幣金額／匯率／TWD 價值／狀態）、`ForeignTableHead`（同 `TwdTableHead` 樣式）、td 54px/13px 12px、輸入框 34px/150px 右對齊 mono＋spinner 移除、「取得匯率」按鈕移入帳戶欄、狀態欄 `pl-12` 同軸 | 桌機實測 6 欄表頭渲染、右對齊輸入框、appearance: textfield；測試 45 passed、tsc 0 error |

### 7.8 匯率自動取得（2026-09-23 第八輪）

| 項目 | 修正 | 驗證 |
| --- | --- | --- |
| 移除「取得匯率」按鈕 | 桌面 table 與行動卡片的按鈕全數移除，`ForeignAccountRow` 移除 `onFetchRate`/`fetchingRate` props | 實測頁面無「取得匯率」按鈕 |
| 自動取得所有外幣帳戶匯率 | `useEffect` 對每個外幣帳戶掛載時呼叫 `getRate(currency, 'TWD')`，只填空值不覆蓋已輸入匯率，失敗顯示錯誤訊息（手動輸入為 fallback） | 實測掛載後匯率欄自動填入 USD→TWD 匯率 31.69025719、無錯誤；測試 46 passed（新增 auto-fetch 與不覆蓋既有值兩案例）、tsc 0 error |

### 7.9 兩表欄位同軸與匯率精度（2026-09-23 第九輪）

| 項目 | 修正 | 驗證 |
| --- | --- | --- |
| 現金/銀行與外幣欄位對齊 | 兩表共用欄寬常數：帳戶 34%＋前期餘額 22%＋狀態 14% 精確同軸；外幣表中間三欄（外幣金額 12%＋匯率 8%＋TWD 價值 10%）合計 30%＝期末餘額 span，語義為「當前帳戶價值」同區塊 | 實測兩表 th 邊界：帳戶 32-440、前期餘額 440-704、狀態 1065-1233 精確相同 |
| 現金/銀行期末餘額加寬 | 輸入框 150px → `w-full max-w-[220px]`（實測 220px） | 實測 220px |
| 匯率欄縮窄＋4 位小數 | 匯率欄 8%、輸入框 `max-w-[110px]`；自動取得與手動輸入都 `Number(value.toFixed(4))` 四捨五入 | 實測自動取得填入 31.6903（4 位小數）；測試 46 passed、tsc 0 error |
