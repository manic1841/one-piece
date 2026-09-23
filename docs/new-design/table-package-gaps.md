# Data Table 全域套件 — 規格差異與對齊紀錄

> 用途：盤點 data table 規格的三個來源與實際實作之間的差異，作為建立全域 data table 套件的依據。
> 狀態：**已實作（2026-09-23）**。套件與決策已折進正式文件（`docs/ui/design-system.md` 的 `data-table` 段、ADR-0061）；本檔保留作為對齊過程紀錄，內容已無正式文件未涵蓋的事實。
> 決策紀錄見第 5 節。

---

## 1. 規格來源

| 來源 | 性質 | 表格相關內容 |
| --- | --- | --- |
| `docs/ui/design-system.md` → `data-table` 段 | 正式文件（權威） | 全站表格共通原則，2026-09-23 定案 |
| `docs/new-design/visual-consistency.md` §11 Tables | staging | header muted、row ~48px、numeric right aligned、mono、subtle divider、無 zebra、hover 微弱 feedback、row 可點擊 |
| `docs/new-design/one-piece-engineering-spec-v1/08_Component_Design.md` | staging | component inventory #3 Data Table（subtle dividers, 48px rows, numeric right alignment, clickable rows） |
| `docs/new-design/monthly-close-account-step-prototype.html` | staging（原型） | 實際 CSS 值：`table-layout:fixed`、th 10px/500/.08em/uppercase/`padding:0 12px 9px`/`border-bottom`/`vertical-align:bottom`、td `13px 12px`/`height:54px`/`vertical-align:middle`、首尾欄 padding 歸零、`.number` 右對齊 + mono + tabular-nums、input 150×34、證券表 18/30/17.3/17.3/17.3%、**無列 hover 規則** |

---

## 2. 規格之間的衝突

| 項目 | design-system.md | visual-consistency | 08_Component_Design | prototype |
| --- | --- | --- | --- | --- |
| 資料列高 | 54px | ~48px | 48px | 54px |
| 首尾欄 padding | `13px 12px`（未提歸零） | 未定義 | 未定義 | 歸零 |
| Hover | 僅可點擊列 | 「hover 有微弱 feedback」 | 未定義 | 無 hover |

`visual-consistency.md` 與 `08_Component_Design.md` 的 48px 都是無原型依據的概述句；54px 有 prototype 實測支撐。

---

## 3. 差異：規格 vs 現有全域套件

現有唯一共用表格套件：`src/ui/components/ui/table.tsx`（shadcn 骨架，純結構 primitive）。

| 規格要求 | 套件現況 | 落差 |
| --- | --- | --- |
| `table-fixed` + `border-collapse` | `w-full caption-bottom text-sm` + 外層 `div.overflow-auto` | 無 fixed layout、無 collapse |
| 欄寬為明確 % 且總和 = 100 | 無欄寬契約 | 無強制機制 |
| Header 10px/500/uppercase/0.08em/`pb-[9px]`/align-bottom | `h-12 px-4 text-left font-medium text-muted-foreground` | 字級、字重、letter-spacing、uppercase、padding、垂直對齊皆不符 |
| td padding `13px 12px` | `p-4`（16px） | 不一致 |
| 數字欄右對齊 + `font-mono` + `tabular-nums` | 無數字欄概念 | 消費端各自補 |
| 空值「—」、不顯示無意義 `.00` | 無 helper | 無 |
| 僅可點擊列有 hover | **所有列強制 `hover:bg-muted/50`** | 直接衝突 |
| Mobile `md:hidden` grouped cards | 無 | 無 |
| 同頁多表共用欄寬常數 | 無 | 無 |
| Number input 34px、無原生 spinner | 無 | 無 |

消費端分佈：`ui/table.tsx` 16 個（account 3、debt 3、portfolio 3、project 2、retirement 1、transaction 2、其他 2）；monthly close 另有 3 個原生 `<table>`（`CloseAccountBalanceInputs.tsx` ×2、`SecuritiesAccountRow.tsx` ×1）。

**已存在的對抗證據**：規格要求「僅可點擊列有 hover」，但套件預設對所有列上 hover，導致兩個消費端必須硬覆寫——`AccountSnapshotTable.tsx:150`、`TransactionItem.tsx:155` 都寫了 `hover:bg-transparent`。無任何測試斷言預設 hover class，移除它是安全的。

---

## 4. 差異：規格 vs 首個合格實作（monthly close account step）

| 落差 | 細節 |
| --- | --- |
| 規則不是共用元件 | 以 module-local class 常數存在於 `CloseAccountBalanceInputs.tsx`（`tableHeadCellClass`、`tableHeadNumberCellClass`、`tdBaseClass`、`statusTdClass`、`col*Width`…） |
| 常數重複且已分歧 | `sectionLabelClass` 在 `CloseAccountBalanceInputs.tsx` 與 `SecuritiesAccountRow.tsx` 各一份，值不同（`font-medium tracking-[0.08em]` vs `font-semibold tracking-widest`） |
| 逐字重複 | `numberInputClass` 兩檔各存一份相同字串 |
| 跨表同軸做不到 | 規格要求「同頁多表格共用欄寬常數」，但常數散在兩個 module 內，證券表未定義寬度 |
| 首尾欄 padding 三方分歧 | prototype 歸零 → 實作改 `pl-3 pr-3`（因輸入框被裁切，見 `monthly-close-account-step-alignment.md` §7.4）→ 規格未記載 |
| Mobile 卡片式手寫兩次 | 規格要求 `md:hidden` grouped cards，無共用樣式 |
| 金額格式 helper 私有 | `amountText` 為 `CloseAccountBalanceInputs` 內部函式，其他表格無法共享 |

---

## 5. 已定案決策（2026-09-23）

| # | 決策 |
| --- | --- |
| Q1 | 建立共用 **data table 套件**；未來所有頁面 data table 使用同一套樣式設計；既有 table 在套件完成後逐一遷移（不批次） |
| Q2 | 資料列高以 **54px** 為準（prototype 實測） |
| Q3 | **移除 `TableRow` 預設 hover**，改為明示 opt-in（`interactive`）——不可點擊列不假裝可點擊 |
| Q4 | 既有 table 的遷移由使用者自行處理，**不在本次範圍** |
| Q5 | `docs/new-design/` 為暫時文件，功能確認後整合進正式文件（執行順序見第 6 節） |
| Q6 | Header 樣式（10px/uppercase/0.08em）最終**全域套用**，但本階段不處理既有頁面 |
| Q7 | 差異紀錄落檔於本文件 |
| Q8 | 套件位置：`src/ui/components/data-table/` |
| Q9 | 公開 API：**可組合 parts**（元件 + 共用 class 常數），不做宣告式 `columns` API |
| Q10 | `interactive` 為 `TableRow` 的**明示 boolean prop**，不自動偵測 `onClick` |
| Q11 | 數字輸入框（34px、右對齊 mono、無原生 spinner）**納入套件** |
| Q12 | 欄寬由 feature 決定；套件提供 colgroup 元件並在 dev 時斷言總和 ≈ 100 |
| Q13 | Mobile grouped card **共用元件** |
| Q14 | 本次一併把 monthly close **account step** 改成由套件驅動（作為套件驗證）；其餘 16 個消費端不觸碰 |
| Q15 | 「Data Table」**不**寫入 `CONTEXT.md`（純財務領域 glossary），留在 `design-system.md` |
| Q16 | 套件內部檔案切分：`data-table/` 下 parts 元件 + `styles.ts` 常數出口 + `index.ts` barrel + 單一測試檔 |
| Q17 | 測試契約：單一 `data-table.test.tsx` 集中守住共同樣式契約（不用逐元件拆測） |
| Q18 | reorder mode 下 `interactive` 維持 true；grip hover 由 grip 自身承擔、不擴散成整列 |
| Q19 | 把 `visual-consistency.md` §11 折進 `design-system.md` 的 `data-table` 段並刪除 §11；`08_Component_Design.md` 的 48px 改 54px |
| Q20 | 開 ADR：套件疊在 `ui/table.tsx` structural primitives 之上的分層決策 |

### 補充定案

| # | 決策 |
| --- | --- |
| 反問 1 | `ui/table.tsx` **保留為結構 primitive 層**（不刪除）；套件為其上的樣式與契約層，並再輸出 primitive。唯一改動：移除 `TableRow` 預設 hover |
| 反問 2 | 文件整合**先做表格範圍**（只動 `visual-consistency.md` §11 與 `08_Component_Design.md` 的 Data Table 相關句），不做 staging 全量整合；完成後才開發套件 |

### Hover 契約（已寫入 `docs/ui/design-system.md`）

> **僅整列可點擊的列**提供 `hover:bg-muted/50`。hover 底色是「這列可點擊」的 subtle feedback 契約，不是表格的預設裝飾——不可點擊的列（純資料列、編輯中的輸入列、展開中的子列）一律不得有 hover 底色。列內可互動元素（ghost icon action、grip handle）的 hover 由該元素自身承擔，不擴散成整列底色。

### Pointer event priority（已寫入 `docs/ui/design-system.md`）

互動列同時具備「整列導覽」與「列內 grip 拖曳」兩種輸入時，優先序必須明文：

```
點擊 / 輕觸列的普通區域
        ↓
導覽至 Detail

在 grip 上點擊 / 拖曳
        ↓
拖曳排序互動
        ↓
不得觸發整列導覽
```

不可接受的實作缺陷：

- 點 grip 時同時開啟 Detail（缺 `stopPropagation`）
- drag 結束後才觸發 row click（缺拖曳後的 click 抑制）
- reorder mode 期間把整列 click 直接關掉（導覽被無理由犧牲）

契約：grip 的互動必須 `stopPropagation` 並抑制拖曳結束後的一次 click，但**不得因此關閉整列的導覽能力**。

---

## 6. 實作紀錄（2026-09-23）

### 6.1 文件

- `docs/ui/design-system.md`：`data-table` 段補「通則」與「Pointer event priority」；Hover 條目改為「僅整列可點擊的列」。
- `docs/adr/0061-data-table-package-over-primitives.md`：新增（分層決策、API 形狀、54px、pointer priority）。
- `docs/new-design/visual-consistency.md` §11：內容移除，改為指向正式文件（保留節號以免破壞其他 staging 文件的 §12/§13 交叉引用）。
- `docs/new-design/one-piece-engineering-spec-v1/08_Component_Design.md`：Data Table 48px → 54px。
- `docs/new-design/monthly-close-account-step-alignment.md`：來源改指正式文件、48px → 54px。

### 6.2 新增套件 `src/ui/components/data-table/`

`styles.ts`（class 常數契約）、`DataTable` / `DataTableScrollArea`、`DataTableColGroup`（dev 斷言總和 ≈ 100）、`DataTableHeadCell`、`DataTableHeadRow`、`DataTableRow`、`DataTableCell`、`NumberCell`、`NumberInput`、`MobileDataList` / `MobileDataRow` / `MobileDataField`、`index.ts`（barrel，再輸出 primitives）、`data-table.test.tsx`（13 tests）。

### 6.3 修改

- `src/ui/components/ui/table.tsx`：`TableRow` 移除預設 `hover:bg-muted/50`，新增 `interactive` prop（匯出 `TableRowProps`）。
- 行為保全（移除預設 hover 的連帶影響）：`AccountList`、`SortablePortfolioRows`、`ProjectsPage`、`DebtListPage`、`RetirementPlanList` 的可點擊列補上 `interactive`。
- 契約清理：`AccountSnapshotTable`（表頭列與持倉列）、`TransactionItem`（展開列）移除多餘／違反契約的 hover class。
- 首個合格實作遷移：`CloseAccountBalanceInputs.tsx`、`SecuritiesAccountRow.tsx` 改由套件驅動（消滅 module-local class 常數與 `numberInputClass` 逐字重複；`sectionLabelClass` 兩份分歧值收斂為 `dataTableLabelClass`）。

### 6.4 驗證

`tsc -b` 乾淨；`eslint` 0 errors（僅既有 warning）；`pnpm test` 145 檔 / 755 tests 全綠；`pnpm docs:check` OK。瀏覽器走查受阻（Firestore emulator 未啟動，HTTP 000），以測試與型別驗證替代。

### 6.5 未納入本次

其餘 15 個 `ui/table` 消費端（Q4：由使用者自行逐一遷移）；header 樣式的全站套用（Q6：最終要做，本階段不處理）。已知待遷移項目：非可點擊列仍帶手寫 `hover:bg-muted/50` 的檔案（例如 `ProjectDetailItem`、`LedgerCodeSettings` 等 div 型列不受本契約約束，但表格型列遷移時需依 `interactive` 契約檢查）。

---

## 7. 相關文件

- `docs/ui/design-system.md`（`data-table` 段，權威）
- `docs/ui/ui-layer-architecture.md`（共用元件歸屬規則）
- `docs/adr/0059-dnd-kit-shared-sortable.md`（共用模式放 `src/ui/components/<name>/` 的先例）
- `docs/new-design/monthly-close-account-step-alignment.md`（首個合格實作的逐輪對齊紀錄）
- `docs/new-design/monthly-close-account-step-prototype.html`（原型 CSS 值來源）
