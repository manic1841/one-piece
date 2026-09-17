# Dashboard 資料錨定：淨資產與 Financial Pulse 以已關帳報表為單一基準

## Status

Accepted (2026-09-17)

## Context

Dashboard v1（Phase 4）需要呈現家庭財務狀態：淨資產總覽、月度變化指標（Financial Pulse）、關帳狀態與近期交易。系統中存在兩類觀察來源：

- 已關帳期間的 persisted reports（資產負債表、損益表、現金流量表），由月度關帳工作流（ADR-0050/0052）產生，代表已定案的會計結果。
- Live 計算路徑：最新 account snapshots 的資產加總、即時債務餘額、即時投資部位槓桿。

兩者經常不一致：live 資產加總只含 account snapshot 金額（不含投資市值與財產），與資產負債表的淨資產定義（資產總計 − 負債總計）不同；live 債務與槓桿反映「現在」而非已定案月份。若 Dashboard 同時混用，同一畫面會出現兩個互相矛盾的「淨值」與混合時間點。

## Decision

- Dashboard 整頁錨定**最新已關帳期間的 report 月份**（單一時間點）。錨點解析：依 `yearMonth` 排序 persisted reports，取最新且期間狀態為 CLOSED 的月份；reports 無排序保證，由消費端自行排序。
- 淨資產單一計算路徑：錨定月份的資產負債表 equity（資產總計 − 負債總計）。不另建 live 淨值路徑。
- Financial Pulse 四指標全部錨定同一月份：
  - Net Cash Flow：現金流量表的 netCashChange（營業 + 投資 + 融資淨變化），非 income − expense。
  - Investment Return：該月 portfolio snapshots 推導的月報酬率（gain / opening value），與既有趨勢 use case 同源。
  - Investment Leverage：該月 portfolio snapshots 推導（exposure = Σ holding marketValue × leverage；net value = Σ holding marketValue），取代此頁面上的 live 版本。
  - Monthly Debt Payment：該月實際 DEBT_PAYMENT 交易總和，非排定應繳（合約值屬 Debt 模組職責）。
- 缺月或缺指標顯示「—」佔位，不顯示 0（零是假資料）。
- 近期交易為例外：維持最新 N 筆的即時事件流，不跟隨錨定月（交易是事件流，不是狀態指標）。
- 舊三卡（資產趨勢、live 債務摘要、live 槓桿）自 Dashboard 退役；pulse 指標由新的期間版組裝推導，不重用舊卡 mapper（`mapLeverageStatsToCardVM`、`mapDebtSummaryToCardVM` 僅留存供 Debt 模組等其他消費者使用）。

## Alternatives Considered

- Live 錨點（PreviewBalanceSheet 即時計算淨資產）：永遠是「現在」，但數字隨未對帳分錄漂動、與趨勢線斷源，且會產生第二條淨值路徑。拒絕；v1 以已定案報表為基準，hero 標注來源期間。
- Pulse 混合基準（報表指標錨定月、槓桿/還款用 live 值）：同一區塊混合時間點，使用者無法一眼判讀。拒絕。
- 固定「上一日曆月」為錨點：與 hero 的最新已關帳月份可能不同，形成混合錨點。拒絕；Pulse 跟隨 hero 月份。
- Monthly Debt Payment 顯示排定應繳或下月預測：前瞻值放進 report 錨定的區塊會混基準。拒絕；實際還款（月變化）為準，預測留待 post-v1 討論。

## Consequences

- 未關帳的最新月份不會出現在 Dashboard 的狀態數字上（hero 標注來源期間讓行為可見）；關帳推進時整頁一起前進。
- 月度槓桿與實際還款需要 read-only 的期間版資料組裝（dashboard overview use case），live use cases（GetLeverageStatsUseCase、GetDebtSummaryUseCase）保持原樣供其他消費者使用。
- 淨資產詞條已寫入 CONTEXT.md（資產負債表單一基準，避免詞：淨值）。
