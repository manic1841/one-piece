# 財務報表計算邏輯說明

One-Piece 結合了「管理會計 (Projects)」與「財務會計 (Accounts)」的概念。以下說明三大報表的具體來源。

本文件是三大報表計算邏輯的規範來源。手動產生的前置條件、資產負債表的混合制，以及現金流量表兩種餘額定義的取捨理由，分別見 [ADR-0018](adr/0018-manual-financial-report-generation.md)、[ADR-0019](adr/0019-balance-sheet-hybrid-equity-derived.md)、[ADR-0020](adr/0020-cash-flow-ending-vs-actual-balance.md)。

## 報表層符號原則

報表層**只做加總，永不 `Math.abs`**：科目方向由**正規邊（normal side）**決定，數值方向只表達沖銷。科目的正規邊是固定的——收入、負債、權益為 credit-normal（`credit − debit` 為正）；支出、資產為 debit-normal（`debit − credit` 為正）。借貸相抵後若為反向（沖銷、退款、提款／分紅），**保留負值**，不取絕對值、不靜默歸零（`rollUpTotals` 只濾零不濾負）。

- **損益表**：收入以 `credit − debit` 加總、支出以 `debit − credit` 加總；沖銷／退款（收入 debit、支出 credit）保留負值。
- **資產負債表**：資產、負債沿用以正規邊為正的累積；**資本為當月 `credit − debit`**（credit 為投入、debit 為提款／分紅），淨 debit 月（提款／分紅 > 投入）資本為**負（扣除）**，其明細科目同樣帶號。
- **現金流量表**：`categorizeLedgerEntry` 先取 signed `amount`（`debit − credit`）再依正規邊分派流入／流出桶；流入／流出是語意，符號只表達沖銷，行為不變。
- **負數呈現**：負值在 UI 以負號呈現（`formatCurrency` 先取絕對值做千分位、再依原始符號補負號）；「永不 `Math.abs`」約束的是**計算層**的方向，不是格式化時的位數處理。

資本符號規則的決策脈絡見 [ADR-0019](adr/0019-balance-sheet-hybrid-equity-derived.md)。

## 0. 報表產生前置檢查

- 正式報表的產生入口為「月度關帳」流程（FINANCIAL_REPORTS 階段，由 `monthlyCloseWorkflowUseCase` 呼叫 `generateFinancialReportsUseCase`）；財務結算中心僅顯示報表產生狀態，不再提供產生按鈕。
- 產生前檢查分兩層：
  - **就緒檢查（Step 7，Completeness Check 階段）**：報表產生前，把各類別月結算完成度、交易驗證與零活動警示彙整為整體就緒狀態，讓使用者先確認資料能否產生正確報表；缺漏項目以階段跳轉導回對應階段修正。只呈現就緒狀態，不呈現財務數字。
  - **產生階段（Step 8，Financial Reports 階段）**：預覽報表 → 確認 → 產生；產生按鈕在結算未就緒時保持 disabled 作為最後一道防線（就緒狀態跨讀 Step 7，不重複列出未結算類別名稱）。寫入路徑本身亦再檢查一次，未就緒時拒絕產生。
- **關帳畫面的顯示語意**：關帳畫面（Step 8 三張表與 Step 9 五個聚合數字）**永遠顯示即時重算的 Report Preview**，無論該期間是否已有已產生報表；Persisted Report 只當狀態旗標與比對基準。期間為 `IN_PROGRESS`／`NEEDS_REVIEW` 且 persisted 存在時逐欄標註 Report Drift；唯一例外是 `CLOSED`——唯讀回看改顯示 persisted（定案紀錄）、不做比對。顯示模式由期間狀態決定，不是單純的 `isPersisted` 旗標（reopen 後殘檔仍顯示 preview 並比對）。取捨理由見 [ADR-0071](adr/0071-close-shows-preview-with-drift.md)。
- 產生正式報表前，會先檢查以下「啟用中」資產負債來源是否都有該月份結算快照：
  - 專案 (`Project Snapshot`)
  - 帳戶 (`Account Snapshot`)
  - 投資組合 (`Portfolio Snapshot`)
  - 債務帳戶 (`Debt Snapshot`)
- 若上述任一類別存在未結算項目，報表發佈應被阻擋。
- 若某一類別在當月沒有任何啟用中資料，則該類別視為通過，不應單獨阻擋報表生成。
- 債務類別另有提示：若某些債務帳戶在當月沒有還款紀錄，系統會顯示「無還款警訊」供使用者檢查。
  此警訊屬於風險提醒，不會直接阻擋結算；使用者仍可在債務結算預覽中確認後繼續。

上述手動觸發與四類快照檢查的決策依據見 [ADR-0018](adr/0018-manual-financial-report-generation.md)。

---

## 1. 損益表 (Income Statement)

損益表主要展現特定期間內的收支狀況，其資料來源為**財務會計層 (General Ledger)**。

### 資料來源

- **分類帳分錄 (Journal Entries)**: 根據 `ledgerCode` 分類。
  - **收入 (Revenue)**: `income:*` 開頭的分錄。
  - **支出 (Expenses)**: `expense:*` 開頭的分錄。
- **專案核算 (Project Allocation)**: 雖然總額來自分類帳，但細項明細可連結至 `projectId` 進行專案維度的成本分析。

### 計算重點

- 報表由 `incomeStatementCalculator` 處理，遍歷當月所有經扁平化處理的分錄。
- **符號**：收入以 `credit − debit`、支出以 `debit − credit` 加總（正規邊為正）；沖銷／退款保留負值，只濾零不濾負（見「報表層符號原則」）。
- **Net Income (本期淨利)** = 總收入 - 總支出。
- **Roll-up**: 明細科目（`type:category:detail`）不獨立成列，父科目 `type:category` 成列並加總，明細科目巢狀為其 `subItems`；顯示標籤在產生報表時凍結進 persisted label（靜態目錄先解析、家庭自建科目覆蓋、明細退回原始明細段再組成「父標籤 › 明細標籤」）。理由與取捨見 [ADR-0069](adr/0069-report-layer-rollup-label-resolution.md)。
- **標籤解析的雙軌**：persisted 報表用產生當下凍結的標籤；關帳畫面的 Report Preview 則在每次重算時**即時解析**（家庭自建科目覆蓋靜態目錄）。因此 preview 與 persisted 同列標籤可能不同；Report Drift 只比數字、**不比標籤**。

---

## 2. 資產負債表 (Balance Sheet)

資產負債表反映特定時間點的財務存量，由**帳戶快照**與**當前分錄**共同構成。

帳戶快照與分錄的混合制，以及權益直接推算的規則，詳見 [ADR-0019](adr/0019-balance-sheet-hybrid-equity-derived.md)。

### 資料來源

- **帳戶快照 (Account Snapshots)**: 提供當月月底的實體帳戶餘額（銀行、證券、現金）。
- **分類帳分錄 (Journal Entries)**: 對於非帳戶類的資產負債項目進行累加。
  - **資產 (Assets)**: `asset:*` 開頭的分錄（除實體帳戶外）。
  - **負債 (Liabilities)**: `liability:*` 開頭的分錄。
  - **權益 (Equity)**: `equity:*` 開頭的分錄 + 本期淨利 (Retained Earnings)。

### 平衡機制

- **公式**：`資產 = 負債 + 權益`。權益不從分錄計算，而是用 `資產合計 − 負債合計` 直接推算，確保報表永遠平衡。
- 權益細項拆為五個來源：
  - **期初權益**：上期結轉。
  - **本期淨利**：從損益表結轉。
  - **資本**：`equity:capital*` 當月 `credit − debit`（`equity:capital` 本身與其明細科目加總）；credit 為投入、debit 為提款／分紅，淨 debit 月為**負（扣除）**，明細科目同樣帶號（見「報表層符號原則」）。
  - **股票報酬**：active portfolio snapshots 的累計損益（`gain` 加總）。
  - **調整項目**：其餘無法歸類於上述四項的部分；理論上應接近零。
- 調整項目偏大代表資料有誤，但系統無法自動定位是哪一筆，須人工追查。
- 儲存端不寫入任何「權益」餘額；`equity:*` 僅是歸屬用的科目。

---

## 3. 現金流量表 (Cash Flow)

現金流量表反映現金的實際流動情況，主要由**現金類帳戶的交易分錄**驅動。

`endingBalance` 與 `actualBalance` 的分工及差異處理，詳見 [ADR-0020](adr/0020-cash-flow-ending-vs-actual-balance.md)。

### 資料來源

- **分類帳分錄 (Journal Entries)**: 篩選 `ledgerCode` 為現金類資產 (`asset:cash:*`) 的分錄。
- **分類規則**:
  - **營業活動 (Operating)**: 與一般損益相關的現金對價。
  - **投資活動 (Investing)**: 與資產購置、出售、證券買賣相關的現金流。
  - **融資活動 (Financing)**: 與貸款、股本變動相關的現金流。

### 核對機制 (Reconciliation)

- 系統會比對「現金流量表算出的期末現金」與「資產負債表的現金類帳戶總額」。
- 若兩者不符，表示有交易未正確標記科目或快照數據不一致。

### 計算重點

- **符號**：`categorizeLedgerEntry` 先取 signed `amount`（`debit − credit`）再依正規邊分派流入／流出桶；流入／流出是語意，符號只表達沖銷（見「報表層符號原則」）。
- 現金流明細科目採與損益表相同的 roll-up：父科目 `type:category` 成列並加總，明細科目巢狀為其 `subItems`，標籤組成「父標籤 › 明細標籤」。
- `CashFlowItemSchema` 與損益表 `IncomeStatementItemSchema` 一樣帶可選的 `subItems`，persisted 現金流明細層與 preview 一致、讀寫往返不丟失（詳見 [ADR-0069](adr/0069-report-layer-rollup-label-resolution.md)）。

---

## 4. Dashboard 指標錨定

Dashboard 整頁錨定**最新已關帳月份**（依 `yearMonth` 排序 persisted reports，取最新且期間狀態為 CLOSED 者；reports 無排序保證，由消費端自行排序）。

- **淨資產**只有一條計算路徑：錨定月份的資產負債表 equity（資產總計 − 負債總計）。不另建 live 淨值路徑。
- **Financial Pulse 四指標全部錨定同一月份**：
  - `Net Cash Flow`：現金流量表的 `netCashChange`（營業 + 投資 + 融資淨變化），**不是** income − expense。
  - `Investment Return`：該月 portfolio snapshots 推導的月報酬率（gain / opening value）。
  - `Investment Leverage`：`exposure = Σ holding marketValue × leverage`；`net value = Σ holding marketValue`。
  - `Monthly Debt Payment`：該月實際 `DEBT_PAYMENT` 交易總和，不是排定應繳。
- **缺月或缺指標顯示「—」佔位，不顯示 0**（0 是假資料）。
- **兩個具名例外**，獨立於 hero 與 Financial Pulse 的錨定基準之外，且必須以獨立、具名、標示前瞻的形式存在，不得混入錨定區塊：
  - **近期交易**：維持最新 N 筆的即時事件流（交易是事件流，不是狀態指標）。
  - **下月應付**：由債務定義與下月還款排程確定性推導（`getNextMonthDebtDueUseCase`，grace-aware），屬債務模組職責；Dashboard 只 read-only 呈現於關帳區塊。

取捨理由見 [ADR-0053](adr/0053-dashboard-report-anchored.md)。
