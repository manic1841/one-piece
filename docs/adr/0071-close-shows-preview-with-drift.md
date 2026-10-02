# 關帳畫面永遠顯示即時 Report Preview，並在有 Persisted Report 時標註 Report Drift

**日期：** 2026-09-29
**狀態：** 已接受
**規範來源：** [monthly-close.md](../monthly-close.md) §3（Report Drift、Financial Reports 的確認即產生）；[financial_report.md](../financial_report.md) §0（顯示語意）、[CONTEXT.md](../../CONTEXT.md)（Report Preview／Persisted Report／Report Drift）

關帳畫面（Step 7 三張報表與 Step 8 五個聚合數字）永遠顯示從現行分錄、當月快照與上月報表**即時重算**的 Report Preview，Persisted Report 只當狀態旗標與比對基準；兩者在 `IN_PROGRESS`／`NEEDS_REVIEW` 期間逐欄比對並標註 Report Drift，唯一例外是 `CLOSED`（唯讀回看顯示 persisted 定案紀錄、不比對）。理由是 persisted 只是產生當下的快照，報表產生後分錄或快照仍可能被修正；若直接顯示 persisted，使用者看到的不是現況，而 drift 標註同時提示「已產生報表已過時」。顯示模式由**期間狀態**決定，不是 `isPersisted` 旗標——reopen 後階段回 `PENDING` 但 persisted 檔案殘留，旗標無法表達「期間已重開」。比對與標註的規則（比對哪些節點、格式、警示色）屬主題文件，見 `規範來源`。

## 階段完成語意

畫面的顯示來源既然是即時 preview，FINANCIAL_REPORTS 的確認就必須產生它所顯示的內容，否則 drift 時使用者等於「看著 preview 確認一份沒看到的 persisted」。因此確認一律以現行 preview 重算並覆寫 persisted，而 persisted 在階段 `PENDING` 時（monthly close 上線前的 legacy 期間，或 reopen 後保留的檔案）僅是比對基準，不代表階段已定案；畫面的完成狀態由**階段完成度**驅動。規則細節見 `規範來源`。

## Considered Options

- **只顯示 persisted**：否決。產生後的分錄修正不會反映，畫面與現況脫節，且無法察覺報表已過時。
- **只顯示 preview、不做 drift 標註**：否決。使用者無從得知已產生報表與現況的落差，關帳定案形同被靜默覆蓋。
- **偵測到 drift 就自動重產報表**：否決。報表產生是使用者確認的關帳動作，自動覆寫破壞「產生＝定案」的語意。
- **以 `isPersisted` 決定顯示模式**：否決。reopen 後檔案殘留使旗標失真；改由期間狀態（`IN_PROGRESS`／`NEEDS_REVIEW` 比對、`CLOSED` 顯示 persisted）決定。
- **以 persisted 存在決定 Step 7 的完成狀態（確認既有 persisted、不重產）**：否決。畫面依本 ADR 顯示的是 preview，若確認定案的卻是畫面上未顯示的 persisted，drift 時等於「看著 preview 確認 persisted」；確認即產生讓看到的數字＝定案的數字，且讓 persisted 在階段 `PENDING` 時單純回歸比對基準（見「階段完成語意」）。
- **比對所有節點、含標籤**：否決。標籤在 persisted 產生時凍結、preview 即時解析（見 [ADR-0069](0069-report-layer-rollup-label-resolution.md)），兩者本就可能不同；父列若因總額變動就整樹亮起也會淹沒訊號。改為葉節點直接比對、父列只在子列集合增減時警示、標籤不比對（規則見 [monthly-close.md](../monthly-close.md) §3）。

## Revisit When

報表改為串流／增量重算（不再整份 preview），或 persisted 報表改為可變（產生後就地更新、不再凍結）時，preview 與 drift 的前提不再成立，需重新設計顯示來源。
