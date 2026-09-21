# Retirement v1 平坦金額欄位：currentAnnual / retirementAnnual / 固定支出

## Status

Accepted (2026-09-20)

Supersedes [ADR-0027](0027-income-calculation-mode-three-tier.md) 與 [ADR-0028](0028-derived-income-no-independent-growth.md)。

## Context

Retirement v1 規格（issue #127）實作前，退休計畫的輸入以「計算模式」描述：

- 收入流三態 `incomeCalculationMode`：FIXED / IMPORTED / DERIVED（ADR-0027）。
- DERIVED 收入由基礎收入 × 倍數推導，不設獨立成長率（ADR-0028）。
- 支出類別雙模式 `calculationMode`：FIXED 或 SALARY_PERCENTAGE（依連動收入乘以
  百分比，另有 MANUAL_FALLBACK / INFLATION_BASED 退休後推導模式）。
- 事件 phase 各自宣告 FIXED 或 SALARY_PERCENTAGE。
- 期初餘額存在 `currentSavings`，另有 `salaryGrowthRate`、`importSettings`
  （含 projectMappings）與 `retirementTransition`（IMMEDIATE / GRADUAL）。

模式堆疊造成三個問題：

1. 同一筆資料有兩套金額語意（baseAmount 的意義隨模式改變），UI 需要為每個模式
   維護專屬編輯區，使用者無法一眼看出「退休後到底領多少、花多少」。
2. DERIVED 依賴圖與 SALARY_PERCENTAGE 的收入連結讓計算順序互相牽制（先收入後
   支出，先基礎後派生），投影期初餘額又有 `currentSavings` 與 live 推導兩條路徑。
3. 舊文件在新 schema 下讀取即失敗（`currentAnnual` 必填），需要一次性遷移。

## Decision

- 收入流以兩個金額欄位描述：`currentAnnual`（今日水準，觀察值）與
  `retirementAnnual`（使用者假設的退休後水準）。工作年複利錨定 sampleYear，
  退休年（或 stream 起始晚於退休時的 startYear）錨定退休金額。收入不再有
  計算模式；`retirementAnnual` 缺省時以 `currentAnnual` 調整後的水準沿用。
- DERIVED 收入攤平：匯入或遷移時以「基礎收入 × 倍數」算成固定 `currentAnnual`
  寫入，不再存依賴關係。倍數關係的維護責任回到使用者（修改基礎收入不會自動
  帶動獎金）。
- 支出類別攤平為固定 `currentAnnual`：SALARY_PERCENTAGE 攤平時以「基準薪資 ×
  百分比」（或 fallbackAmount）為今日水準；`retirementMultiplier`（stored as
  factor）描述退休後水準，IMMEDIATE 適用。`expenseCategory` 為「Import from
  Ledger」的對齊鍵（既有類別更新保留 id）。
- 事件 phase 為固定金額 + 選擇性成長率；移除 phase 模式與百分比。
- 成長率缺省回落計畫通膨率（resolveGrowthRate 單一引擎 helper）。
- 期初餘額移除 `currentSavings`：投影期初取自最近已關帳期間的
  BALANCE_SHEET 報表淨資產（單一計算路徑，與 Dashboard 錨定一致，ADR-0053）；
  無已關帳期間時無法重算。`salaryGrowthRate`、`importSettings`（含
  projectMappings）與 `retirementTransition` 一併移除（GRADUAL 不保留）。
- 一次性遷移（`scripts/admin/migrate-retirement-v1.ts`）攤平嵌入式主文件與
  incomeStreams / expenseCategories 子集合文件：DERIVED income、
  SALARY_PERCENTAGE expense、事件 phase mode、`currentSavings`、backfill
  `currentAnnual` / `expenseCategory`。

## Alternatives Considered

- 保留三態收入模式並只改 UI：計算路徑與依賴圖的複雜度不變，模式之間的金額語意
  差異仍需使用者理解。拒絕；v1 規格明定兩個金額欄位。
- DERIVED 收入保留依賴關係、只把倍數套用在讀取時：投影仍需先解析基礎收入，刪除
  基礎收入的完整性問題（ADR-0028 取捨）繼續存在。拒絕；攤平把關係變成一次性
  計算，維護責任明確。
- GRADUAL 退休轉換保留為讀取相容：轉換曲線讓同一支出項目的退休後水準隨年漂移，
  UI 無法呈現單一「退休後金額」。拒絕；IMMEDIATE 為 v1 唯一行為。
- 分批遷移（讀取時 lazy normalize）：新 schema 要求 `currentAnnual` 必填，
  lazy 路徑會讓每次讀取都攜帶轉換分支。拒絕；一次性遷移 + dry-run。

## Consequences

- 收入與支出的編輯 UI 各只有一組金額欄位；模式專屬編輯區（Salary %、Linked
  Income、Mode select、fallback 設定）退役。
- 「Import from Ledger」匯入支出以 `expenseCategory` merge；債務還款不映射
  ledger 費用科目，維持 `sourceDebtAccountId` 對齊。
- 退休詳情頁投影與重算需要已關帳期間；期初淨資產與錨定月份存入 summary
  （`startingNetWorth` / `anchorYearMonth`），讓輸出可標注來源期間。
- 舊 ADR-0027 / 0028 的模式邊界與 DERIVED 完整性檢查不再適用；相關計算流程
  （派生收入、模式切換）自 retirement-system.md 移除。
