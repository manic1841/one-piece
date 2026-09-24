# 專案轉帳功能暫停實作

**狀態：** 已接受（2026-09）
**規範來源：** [transaction-flow.md](../transaction-flow.md)

專案轉帳（`IntentType.TRANSFER`，`fromProjectId` → `toProjectId`）自上線以來幾乎未被使用，且使用者從未要求補齊相關流程。同時，專案餘額讀取路徑（`getProjectBalanceUseCase`）對轉帳方向的判斷有誤：轉帳交易的 `projectId` 恆為 null，導致轉出也被計為收入。此 bug 只影餘額顯示，不影響結算快照（settlement calculator 一直以來都正確使用 `toProjectId`/`fromProjectId` 判向）。

因此**暫停而非刪除**：移除所有 UI 入口與寫入路徑（`ProjectTransfer` 對話框、`ProjectTransferPanel` 表單分頁、`transferBetweenProjectsUseCase`、表單 VM 的轉帳欄位與驗證），但領域模型（`IntentType.TRANSFER`、`fromProjectId`/`toProjectId` 欄位與 intent mapping）與歷史交易計算完整保留。方向一律以 `toProjectId === projectId` 為流入、`fromProjectId === projectId` 為流出，與結算 calculator 的既有語意一致。取捨是留下一條沒有入口但仍需維護的讀取路徑；換取不必對既有歷史交易做資料遷移，也不會因刪除而在未來重做領域模型。

## Consequences

- 交易表單不再提供「專案轉帳」分頁；進階意圖選項只剩 `MANUAL`。
- 已存在的轉帳交易仍顯示於交易列表（唯讀、不可編輯），餘額與結算照常計入。
- 若未來恢復此功能，只需重新加入 UI 入口與寫入 use case；領域與基礎設施層無須變更，歷史資料不需遷移。
