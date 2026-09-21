# Page Review — Gap Inventory (Visual Consistency Standard)

> 頁面級 review 證據基礎。來源：`visual-consistency.md`（40 節 Standard）逐節對照 `src/ui/**`（115 檔）與 15 條路由的機械式掃描 + 上下文抽查，2026-09-21，branch `feature/apple-design` @ 7174577。

**Status:** Review Evidence
**Scope:** 15 routes / 115 UI source files
**Standard:** visual-consistency.md v1.0

---

## 合規面（不需處理）

- **Radius / shadow / raw palette**（§7/§8/§17）：`src/ui/design-contract.test.ts`（#125）+ eslint gate 機械化強制；`rounded-xl` 歸零、`rounded-full` 白名單 16 檔、shadow 白名單 11 檔。
- **Spacing**（§3）：無任意 px 值（bracket 形式歸零）。
- **Reports 閱讀優先**（§27）：三張報表頁與 ReportsPage 均無 edit / inline editing surface。
- **Retirement 順序**（§26）：`retirementWorkspaceLabels.ts` = OVERVIEW / RESULTS → CURRENT FINANCIAL STATE → PROJECTED NET WORTH → CASH FLOW PROJECTION → SCENARIO ASSUMPTIONS → INCOME → LIVING EXPENSES → LIFE EVENTS，完全吻合 §26。
- **Empty state Card**（§5 允許）：DebtListPage 與 RetirementPlanList 的 `<Card>` 都是 empty state 用法。
- **Dashboard glass sections**（§5）：Trend / Snapshot / Details 三卡是經用戶確認的 translucent glass 決策（c194cb3），低調 non-SaaS。
- **Header 職責**（§31）：Layout header = 品牌 + ● SYSTEM ONLINE + 日期 + Household Switcher + Search + Avatar menu；無 main navigation、period selector、domain actions。
- **Search / Command 分離**（§32）：CommandPalette 為獨立 surface，與 Pixel Pet trigger 分離。

---

## 落差清單（Review Findings）

### 1. TransactionItem「Ledger Code」表頭（§39）— resolved 2026-09-21

**File:** `src/ui/features/transaction/components/TransactionItem.tsx:102`
ACCOUNTING DETAILS accordion 表頭寫 `Ledger Code`，儲存格卻 render `entry.ledgerLabel`（顯示標籤）— 表頭與內容不一致，且交易頁不是 accounting/developer view。
**裁決：已修正（#135）。** 表頭改走 constants layer 顯示標籤 `ACCOUNTING_DETAILS_ENTRY_LABEL`（「會計科目」，`displayLabels.ts`），內容不動；測試斷言表頭不再 render「Ledger Code」。記錄為合規。

### 2. TransactionItem 每列 Edit/Delete（§12/§39）— resolved 2026-09-21

**File:** `src/ui/features/transaction/components/TransactionItem.tsx`（aria-label 編輯交易 / 刪除交易）
**裁決：維持現狀。** Standard §12 已加例外：無 detail 頁的資料允許 row 端 ghost icon action（icon-only、低干擾）。記錄為合規。

### 3. Debt status badges（§16）— resolved 2026-09-21

- `src/ui/features/debt/pages/DebtDetailPage.tsx:224` — `<Badge variant="outline">已結清</Badge>`
- `src/ui/features/debt/pages/DebtListPage.tsx:151` — `<Badge variant="destructive">寬限期</Badge>`

§16 Status 用 icon + text（StatusGlyph ✓ / ○ / ! / ×），不用彩色 badge。**裁決：已修正（#136）。** 兩頁換成 StatusGlyph + text（已結清 = `DEBT_STATUS_SETTLED_LABEL` ✓ verified/positive、寬限期 = `DEBT_STATUS_GRACE_PERIOD_LABEL` ! review/warning，labels 走 `src/ui/constants/debtStatusLabels.ts`）；兩頁無 Badge import 殘留。
（RetirementPlanList 狀態 Badge 是 #131 經用戶確認，不重開。）

### 4. Neutral / data-type badges 4 處（§17 borderline）— record-only

AccountDetailPage `:232` currency、PortfolioDetail `:216` date、WatchListSettings `:137` target-type、TransactionForm form-mode。無色、無 pill 濫用，§17 嚴格而言 data-type 不上色，但這些 badge 也不表達 state。維持現狀。

### 5. RetirementPlanList 狀態 badge — record-only

#131 經用戶確認（Badge 狀態欄）。不重開。

### 6. PortfolioDetailPage 無 PageHeader（§1/§12）— accepted, medium

**File:** `src/ui/features/portfolio/pages/PortfolioDetailPage.tsx`（0 個 PageHeader 引用，使用 PortfolioDetail 元件內建 header）
§1 Page Shell 統一 header；其他 detail 頁（Account / Debt / Project）皆已 PageHeader + back + header actions。之前「detail header 不遷移」是 Apple-design redesign 範圍邊界，Standard 現在涵蓋它 → 合規落差。PortfolioDetail 複雜且有既有測試，遷移需小心。**裁決：遷移至 PageHeader（含 back + header actions）。**

### 7. YearlyDetails 橫向捲動表格（§28）— fix, medium — resolved 2026-09-21

**File:** `src/ui/features/retirement/components/projection/YearlyDetails.tsx:41`（`overflow-x-auto` 包展開年表格）
§28 不使用 horizontal scroll 作為主要解法。**Fix:** mobile 為 compact rows（Year + Closing Net Worth + accordion 展開其餘欄位），md+ 維持 table。多欄 metrics 需設計取捨。
**已修正（#138，2026-09-21）**：mobile compact row 顯示 Year + Savings（收盤淨資產）+ 展開，其餘欄位在 reveal 區，閱讀順序與桌面一致；`overflow-x-auto` 移除；md+ 維持 table。
（TransactionsPage `:179` 的 `overflow-x-auto` 是 chip-group 捲動條，非 data table，記錄即可。）

### 8. Mobile compact-row 覆蓋薄弱（§28/§38）— runtime verification — verified 2026-09-21

僅 4 檔使用 `md:hidden` / `hidden md:` / `sm:hidden`（PixelPet、DashboardPage、RetirementPlanList、MonthlyClosePage）。Account / Debt / Transactions / Portfolios / Projects 列表表格在 mobile 的實際行為無法由靜態掃描確認。
**Fix:** runtime 驗證 task — 390px viewport DOM 檢查（每個 list table 是否 overflow / squash / 退化 compact rows）。
**已驗證（#139，2026-09-21）**：390px viewport DOM 檢查（feature/apple-design @ d19dbeb，QA emulator 資料集，`overflowX` = `documentElement.scrollWidth - clientWidth`、squash = table width vs wrapper clientWidth、退化 = 無 `md:hidden` compact rows）。五頁結果：

- **AccountList（/accounts）— pass**。3-col 表（Account / Ending Balance / As of），table width = wrapper width = 343px、無 clipping、無 overflow。分類（CASH / SECURITIES）分組 + 3 欄在 390px 剛好可讀。
- **DebtList（/debt）— fail**。5-col 表（Loan Name / Type / Outstanding Balance / Monthly Payment / As of）table 408px vs wrapper 358px，wrapper 橫向捲動（可觸及但未退化 compact rows）；無 clipping 進文件層。
- **Transactions（/transactions）— fail（最嚴重）**。按月分組 21 張 5-col 表（Date / Intent / Amount / Project / actions），每張 table 689px vs wrapper 342px（~2x 超寬），wrapper 橫向捲動；1127 個 element 橫向超出文件層。另發現 HTML 有效性錯誤：`TransactionItem` 在 `<tbody>` 內 render `<div>` wrapper（React DOM validateDOMNesting 錯誤）。
- **Portfolios（/portfolios）— fail**。5-col 表（Name / Securities / Bank / Portfolio Value / Return）table 403px vs wrapper 358px，wrapper 橫向捲動；7 個 element 超出（僅 table 內部，文件層 overflowX = 0）。
- **Projects（/projects）— fail（含 header）**。5-col 表（Name / Status / Income / Expense / Net Cash Flow）table 433px vs wrapper 343px，wrapper 橫向捲動；且文件層 overflowX = 44px：header 三顆文字按鈕（Settings / Settlement / New Project）無法 wrap，把 main 撐出 390px。
**裁決：4 頁 fail（Debt / Transactions / Portfolios / Projects），follow-up issues 已開。** 共同模式：5-col 資料表在 390px 以 `overflow-x-auto` wrapper 捲動，未提供 compact-row 退化（§28 不以橫向捲動為主要解法）。裁決原則：**mobile layout 依資料密度決定，不是全部 List 統一改 Card** — AccountList 記錄為合規（3 欄 + 分組是可行模式，作為 mobile list benchmark），其餘 4 頁針對實際問題退化 compact rows。追蹤：P0 umbrella #147（Debt #141 / Transactions redesign #142 / Portfolios #143 / Projects list #144）；獨立 task：Transactions div-in-tbody DOM 修正 #145（implementation bug，獨立修）、Projects header 溢出 #146（移除 Settings + 允許 wrap）。

### 9. Dashboard Close / Recent 順序 vs §25 — resolved 2026-09-21

現況 = hero → stat row → Trend → Snapshot → Details → Close → Recent。
**裁決：修訂 Standard。** §25 已更新為 Close → Recent（workflow 入口時間敏感優先於系統日誌），與實作一致，記錄為合規。

### 10. Mobile 導覽主導權（§29/§30）— accepted, high

現況 mobile = 既有 bottom nav + More sheet 為主要導覽，Pixel Pet 為額外入口（#10 修訂決策）。
**裁決：Pet 為主。** bottom nav + More sheet 退場，Pixel Pet + bottom sheet 為 mobile 唯一導覽入口。Standard §29 已加退場條件（Pet + sheet 覆蓋全部既有目的地與 More 功能後才移除）。Phase 8 收尾範圍。

---

## 摘要

| # | Finding | Rule | Risk | Type |
| - | ------- | ---- | ---- | ---- |
| 1 | TransactionItem Ledger Code 表頭 | §39 | low | resolved：已修正（#135，constants-layer 顯示標籤） |
| 2 | Row-level Edit/Delete | §12/§39 | medium | resolved：維持現狀（§12 例外已定案） |
| 3 | Debt status badges ×2 | §16 | low-medium | resolved：已修正（#136，StatusGlyph + text） |
| 4 | Neutral badges ×4 | §17 | low | record-only |
| 5 | RetirementPlanList badge | — | low | record-only |
| 6 | PortfolioDetailPage 無 PageHeader | §1/§12 | medium | task：遷移 PageHeader |
| 7 | YearlyDetails mobile 橫向表格 | §28 | medium | resolved：已修正（#138） |
| 8 | Mobile compact-row 覆蓋 | §28/§38 | medium | resolved：已驗證（#139，4 頁 fail → umbrella #147：Debt #141 / Transactions #142 / Portfolios #143 / Projects #144；DOM #145、header #146 獨立） |
| 9 | Dashboard Close/Recent 順序 | §25 | low | resolved：§25 已修訂（Close → Recent） |
| 10 | Mobile 導覽主導權 | §29/§30 | high | task：Pet 為主，bottom nav 退場（Phase 8） |

已定案：1 個修正 task（7）、2 個已裁決的 task（6 / 10）、1 個 runtime 驗證（8，4 頁 fail → umbrella #147 + 獨立 task #145 / #146）、2 組記錄項（4 / 5）。
**下一步：** 開 GitHub issues 追蹤（6 / 7 / 10）；8 的 follow-up 已開（#141-#146，密度決定 mobile layout，Account 為 benchmark）。
**延伸盤點：** List/Detail header 與動作一致性另見 `page-review-list-detail.md`（同日，L1-L6 落差清單）。
