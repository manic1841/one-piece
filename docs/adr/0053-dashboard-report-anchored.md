# Dashboard 整頁錨定最新已關帳月份，捨棄 live 計算路徑

**日期：** 2026-09-17
**狀態：** 已實作

Dashboard v1 需要呈現家庭財務狀態，而系統中存在兩條互相矛盾的觀察路徑：已關帳期間的
persisted reports（月度關帳工作流產出，代表已定案的會計結果），以及 live 計算路徑（最新
account snapshots 加總、即時債務餘額、即時投資槓桿）。兩者的「淨值」定義不同，時間點也
不同；混用會讓同一畫面出現兩個互相矛盾的數字。因此決定 Dashboard 整頁錨定**最新已關帳
期間的 report 月份**，不另建 live 淨值路徑。

## Decision

- **錨點解析**：依 `yearMonth` 排序 persisted reports，取最新且期間狀態為 CLOSED 的月份；
  reports 無排序保證，由消費端自行排序。
- **淨資產單一計算路徑**：錨定月份的資產負債表 equity（資產總計 − 負債總計）。
- **Financial Pulse 四指標全部錨定同一月份**：
  - Net Cash Flow：現金流量表的 `netCashChange`（營業 + 投資 + 融資淨變化），非
    income − expense。
  - Investment Return：該月 portfolio snapshots 推導的月報酬率（gain / opening value），
    與既有趨勢 use case 同源。
  - Investment Leverage：該月 portfolio snapshots 推導（exposure = Σ holding
    marketValue × leverage；net value = Σ holding marketValue），取代此頁面上的 live 版本。
  - Monthly Debt Payment：該月實際 `DEBT_PAYMENT` 交易總和，非排定應繳。
- **缺月或缺指標顯示「—」佔位，不顯示 0**（零是假資料）。
- **舊三卡（資產趨勢、live 債務摘要、live 槓桿）自 Dashboard 退役**，pulse 指標由新的
  期間版組裝推導，不重用舊卡 mapper（`mapLeverageStatsToCardVM`、
  `mapDebtSummaryToCardVM` 已隨其最後的引用一併刪除）。

### 資料三分（錨定／前瞻／衍生）

Dashboard 的數值依來源分為三類，上述錨定契約只約束第一類：

- **錨定（snapshot）**：Net Worth 與 Financial Pulse 等核心指標代表最新已關帳期間的財務
  狀態，整組跟隨同一 report 月份。
- **前瞻（forward-looking）**：`下月應付` 由債務定義與下月還款排程確定性推導
  （`getNextMonthDebtDueUseCase`，grace-aware），屬債務模組職責；Dashboard 只 read-only
  呈現於關帳區塊，不進入 hero 或 Financial Pulse。
- **衍生（derived）**：任何能由既有財務紀錄確定性推導的值，優先直接推導，而非要求使用者
  重複輸入（例如債務帳戶餘額由交易推導，不另存手動值；ADR-0015）。

**具名例外只有兩項**，皆獨立於 hero 與 Financial Pulse 的錨定基準之外：**近期交易**
（維持最新 N 筆的即時事件流——交易是事件流，不是狀態指標）與**下月應付**（前瞻，見上）。
例外只能以獨立、具名、標示前瞻的形式存在，不得混入錨定區塊。

## Considered Options

- **Live 錨點**（即時計算淨資產）：永遠是「現在」，但數字隨未對帳分錄漂動、與趨勢線斷源，
  且會產生第二條淨值路徑。拒絕；以已定案報表為基準，hero 標注來源期間。
- **Pulse 混合基準**（報表指標錨定月、槓桿／還款用 live 值）：同一區塊混合時間點，使用者
  無法一眼判讀。拒絕。
- **固定「上一日曆月」為錨點**：與 hero 的最新已關帳月份可能不同，形成混合錨點。拒絕；
  Pulse 跟隨 hero 月份。
- **Monthly Debt Payment 顯示排定應繳或下月預測**：前瞻值混進報表錨定區塊會混基準。拒絕。
- **另開 ADR 記錄前瞻例外**：另開會產生兩份描述同一錨定契約的文件。拒絕。

## Consequences

- 未關帳的最新月份不會出現在 Dashboard 的狀態數字上（hero 標注來源期間讓行為可見）；
  關帳推進時整頁一起前進。
- 月度槓桿與實際還款需要 read-only 的期間版資料組裝（dashboard overview use case）；
  live use cases（`GetLeverageStatsUseCase`、`GetDebtSummaryUseCase`）保持原樣供其他消費者
  使用。兩者目前皆已無 Dashboard 側的消費者，但退役屬 application 層決策，不由此 ADR
  處理。
- 淨資產詞條已寫入 `CONTEXT.md`（資產負債表單一基準，避免詞：淨值）。
