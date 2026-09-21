# Page Review — List/Detail Layout & Action Inventory (Visual Consistency Standard)

> 逐 domain 盤點 List/Detail 頁面的 header、動作、內容結構，對照 visual-consistency.md §1/§12/§16。機械式掃描 + 全文抽查，2026-09-21，branch `feature/apple-design` @ 7174577。

**Status:** Review Evidence
**Scope:** 6 domains / 15 routes / 115 UI files
**Standard:** visual-consistency.md v1.0

---

## 盤點表

| Domain | List 頁 | Detail 頁 | List Header 動作 | Detail Header 動作 | 一致性 |
| ------ | ------- | --------- | ---------------- | ------------------ | ------ |
| Account | AccountList（PageHeader：title + meta 顯示停用 toggle） | AccountDetailPage | 匯出 CSV / 匯入 / 新增帳戶（outline/outline/primary） | 無 actions、無 onBack（badge = currency Badge） | **落差**：Detail 無返回導覽 |
| Debt | DebtListPage | DebtDetailPage | 月度結算 / 顯示已結清 toggle / 新增貸款 | 編輯貸款 / 啟用-停用貸款（outline） | **一致**：onBack + crumb + badge(已結清 StatusGlyph) |
| Project | ProjectsPage | ProjectDetailPage | Settings / Settlement / New Project | YearMonthPicker + 本月（ghost） | **落差**：Detail 無編輯/刪除入口（editClick 死碼） |
| Portfolio | PortfolioList | PortfolioDetail | 排序 / 新增組合（reorder 模式：儲存順序/取消） | 無 actions、badge = 月份 Badge | **落差**：Detail 無編輯入口（setEditingPortfolio 死碼） |
| Transaction | TransactionsPage | 無 detail 頁 | 新增交易（primary） | — | **一致**：無 detail 頁，row 端 ghost edit/delete 已獲 §12 例外 |
| Retirement | RetirementPlanList | RetirementPlanForm（form-as-detail） | New Plan（primary） | inline name edit + Auto-Update / Recalculate / Delete | **落差**：自製 header 不走 PageHeader，Delete 在 header 而非 danger zone |

List 表格欄位結構與數字欄位（`font-mono tabular-nums`、右對齊）全 domain 一致；KPI row（TOTAL BALANCE / TOTAL OUTSTANDING / TOTAL PORTFOLIO VALUE）僅 Account / Debt / Portfolio 列表頁有；空狀態處理一致；mobile compact rows 僅 RetirementPlanList 有（gap 文件 #8 已追蹤）。

## 落差清單（Review Findings）

### L1. AccountDetailPage 無 onBack / header actions — fix, medium

**File:** `src/ui/features/account/pages/AccountDetailPage.tsx`（PageHeader 無 `onBack`、無 `actions`）
§1 Page Shell 統一 header；Debt/Project/Portfolio detail 皆有 onBack。帳戶 detail 需返回列表才能換選其他帳戶。
**Fix:** PageHeader 加 `onBack={() => navigate('/accounts')}`；header actions 依 §12 評估：帳戶無 detail-layer 的編輯表單（AccountForm 僅在 List 頁 in-page swap），故 detail header 暫不掛 actions，先補返回導覽。

### L2. ProjectDetailPage 無編輯/刪除入口 — fix, medium

**File:** `src/ui/features/project/pages/ProjectsPage.tsx`（row 無 edit/delete）
**File:** `src/ui/features/project/pages/ProjectDetailPage.tsx`（header 僅 YearMonthPicker）
ProjectsPage 只有 create-form 入口；`useProjectPage` 的 `editClick`/`deleteClick` 已實作並 exposed，但 ProjectsPage 未 destructure，屬死碼（見 L3c）。
**Fix:** 二選一：ProjectsPage row 端 ghost edit/delete（§12 例外，比照 TransactionItem），或 ProjectDetailPage header actions 掛 edit dialog。開 issue 追蹤（與 L3c 同 issue）。

### L3. PortfolioDetail 無編輯入口 — fix, medium

**File:** `src/ui/features/portfolio/components/PortfolioDetail.tsx`（header 無 actions）
**File:** `src/ui/features/portfolio/components/PortfolioList.tsx`（`setEditingPortfolio` 死碼，見 L3b）
Detail 無任何編輯/管理入口；List 的編輯狀態永不開啟。
**Fix:** 二選一：移除 PortfolioList 死碼並接上 row 端 ghost edit（§12 例外，比照 TransactionItem），或 PortfolioDetail header 掛「編輯組合」outline button（PortfolioForm in dialog）＋死碼一併移除。開 issue 追蹤。

### L3b. PortfolioList 死碼 — record-only, low

**File:** `src/ui/features/portfolio/components/PortfolioList.tsx`（`setEditingPortfolio` 從未設為 non-null）
`editingPortfolio` state + 對應 PortfolioForm 分支永不 render，屬死碼，§2 過度工程清掃對象。若 L3 選 detail-header 方案，死碼可一併移除。

### L3c. Project editClick/deleteClick 死碼 — record-only, low

**File:** `src/ui/features/project/hooks/useProjectPage.ts`（`editClick`/`deleteClick` 已 exposed，但 ProjectsPage 未 destructure）
**裁決：開 GitHub issue 追蹤，與 L2 同 issue。

### L3d. AccountList 編輯入口死碼 — record-only, low

**File:** `src/ui/features/account/hooks/useAccountListController.ts`（`setEditingAccount` 只在 `handleUpdate` 完成後設 null，從未開啟編輯表單）
`editingAccount` state + in-page AccountForm 分支的編輯路徑永不觸發，屬死碼。
**裁決：開 GitHub issue 追蹤，與 L2 同 issue。

### L4. RetirementPlanHeader 不走 PageHeader — fix, medium

**File:** `src/ui/features/retirement/components/detail/RetirementPlanHeader.tsx`（自製 header，h1 text-3xl）
§1 Page Shell 統一 header；RetirementPlanForm 是唯一的 form-as-detail 頁，header 結構（back + title + description + actions）與 PageHeader 對齊但自製：`text-3xl` 違反 `text-2xl`、無 crumb、Delete 在 header 而非 DANGER ZONE。
**Fix:** 遷移至 PageHeader（text-2xl + crumb RETIREMENT + onBack）；Delete 移出 header → 頁面尾端 danger zone（比照 DebtDetailPage），Auto-Update/Recalculate 留 header actions；測試斷言 `text-3xl` 歸零。

### L5. 頁面標題 zh/en 兩層慣例 — record-only

List 頁主標題 zh（帳戶管理/債務管理/專案管理/投資組合/交易/退休規劃），crumb/section titles 用 en mono uppercase（ACCOUNTS / DEBT / PROJECTS / PORTFOLIOS / TOTAL BALANCE）已成兩層慣例。§1 未涵蓋語言層；ui-labeling-guideline scope 目前僅 transaction/account/report/debt-status labels。**維持現狀，記錄為合規。** 若要收編，建議在 ui-labeling-guideline scope 加一條「List 頁主標題 zh、crumb en mono」。

### L6. Status 表達不一致 — fix, low

AccountList 停用帳戶以 text-muted-foreground 呈現（無 glyph）；Debt 用 StatusGlyph（已結清 ✓）；Project 用 text-positive（進行中）；PortfolioList 無狀態欄；RetirementPlanList 用 Badge（#131 已裁決不重開）。Debt 是 §16 標竿（StatusGlyph + text）。
**Fix:** AccountList 停用列 = StatusGlyph + text（`text-muted-foreground` 語意）；Project 進行中/停用 = StatusGlyph verified / muted；PortfolioList 視需要加狀態欄。低風險，可與其他 fix 同 task。

### L6b. RetirementPlanList status Badge — record-only

#131 經用戶確認（Badge 狀態欄），不重開。

---

## 摘要

| # | Finding | Rule | Risk | Type |
| - | ------- | ---- | ---- | ---- |
| L1 | AccountDetailPage 無 onBack/actions | §1 | medium | fix |
| L2+L3c | ProjectDetailPage 無 edit/delete 入口（editClick 死碼） | §1/§12 | medium | fix + issue |
| L3+L3b | PortfolioDetail 無 edit 入口（setEditingPortfolio 死碼） | §1/§12 | medium | fix + issue |
| L3d | AccountList 編輯入口死碼 | §2 | low | record-only |
| L4 | RetirementPlanHeader 不走 PageHeader，Delete 位置 | §1/§12 | medium | fix |
| L5 | zh/en 兩層慣例 | — | — | record-only（合規） |
| L6 | Status 表達不一致（Debt 為標竿） | §16 | low | fix |
| L6b | RetirementPlanList Badge | — | low | record-only |

**下一步：** 開 GitHub issues 追蹤 L1 / L2+L3c / L3+L3b / L4 / L6；L3d 可併入 L2+L3c 或 L3 死碼清掃。
