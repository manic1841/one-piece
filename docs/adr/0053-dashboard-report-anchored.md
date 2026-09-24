# Dashboard 整頁錨定最新已關帳月份，捨棄 live 計算路徑

**日期：** 2026-09-17
**狀態：** 已實作
**規範來源：** [financial_report.md](../financial_report.md) §4

Dashboard v1 需要呈現家庭財務狀態，而系統中存在兩條互相矛盾的觀察路徑：已關帳期間的
persisted reports（月度關帳工作流產出，代表已定案的會計結果），以及 live 計算路徑（最新
account snapshots 加總、即時債務餘額、即時投資槓桿）。兩者的「淨值」定義不同，時間點也
不同；混用會讓同一畫面出現兩個互相矛盾的數字。因此決定 Dashboard 整頁錨定**最新已關帳
期間的 report 月份**，不另建 live 淨值路徑。

Dashboard 整頁錨定**最新已關帳期間的 report 月份**：淨資產只有一條計算路徑（該月資產負債表 equity），Financial Pulse 四指標全部跟著同一月份，缺月或缺指標顯示「—」佔位而不顯示 0。指標定義與計算公式見 [financial_report.md](../financial_report.md) §4。

錨定契約只約束「錨定型」數值；Dashboard 的數值依來源另分「前瞻型」（如 `下月應付`，由債務排程確定性推導）與「衍生型」（任何能由既有紀錄確定性推導的值優先直接推導，而非要求使用者重複輸入）。**具名例外只有兩項**，皆獨立於 hero 與 Financial Pulse 的錨定基準之外：**近期交易**（最新 N 筆的即時事件流——交易是事件流，不是狀態指標）與**下月應付**。例外只能以獨立、具名、標示前瞻的形式存在，不得混入錨定區塊。

舊三卡（資產趨勢、live 債務摘要、live 槓桿）自 Dashboard 退役，pulse 指標由新的期間版組裝推導，不重用舊卡 mapper。

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
