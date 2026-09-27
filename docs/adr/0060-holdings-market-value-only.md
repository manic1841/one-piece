# Holdings 只記市值不記數量：market-value-only 持倉模型

**狀態：** 已接受（2026-09-22）
**規範來源：** [data-structure.md](../data-structure.md)（accounts snapshot holdings）；[CONTEXT.md](../../CONTEXT.md)（Holdings）

Monthly Close 的 Account Balance 重構前，證券持倉要求使用者輸入持有數量。規格明確表示使用者不想記錄數量，而數量欄位造成兩個問題：使用者被迫輸入一個不想紀錄的數字，不輸入則落 0（屬於靜默 fallback）；Portfolio 頁以市值除以數量推導單位價，數量為 0 時推導即失敗，或顯示誤導性的單位價。

因此持倉改以市值為記錄單位。市值由使用者輸入並凍結進快照，沒有獨立觀察來源，不構成對帳依據（ADR-0051 語意不變）。

## Consequences

- 持倉編輯不再出現 Qty 欄位；帳戶列表與詳情頁以市值呈現持倉，不再顯示「數量 @ 單位價」。
- 不做資料遷移：既有快照文件 holdings 內殘留的 `quantity` 由 schema 讀取時自動剝除，無行為影響；下次快照寫入時自然消失。
- 若未來需要單位價或股數分析，需另立資料來源，不從市值反推。
