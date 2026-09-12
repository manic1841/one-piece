# 專案轉帳功能暫停實作

## 狀態

已接受（2026-09）

## 背景與動機

專案轉帳（`IntentType.TRANSFER`，`fromProjectId` → `toProjectId`）自上線以來幾乎未被使用，且使用者從未要求補齊相關流程。同時，專案餘額讀取路徑（`getProjectBalanceUseCase`）對轉帳方向的判斷有誤：轉帳交易的 `projectId` 恆為 null，導致轉出也被計為收入。此 bug 只影餘額顯示，不影響結算快照（settlement calculator 一直以來都正確使用 `toProjectId`/`fromProjectId` 判向）。

## 決策

1. **功能暫停，非刪除**：移除所有 UI 入口與寫入路徑，領域模型（schema、`IntentType.TRANSFER`、`fromProjectId`/`toProjectId` 欄位）完整保留，未來需要時可恢復開發。
2. **歷史資料照常計算**：餘額與結算計算仍將歷史轉帳計入，方向一律以 `toProjectId === projectId` 為流入、`fromProjectId === projectId` 為流出判斷，與 `listProjectRecordsUseCase` 及 settlement calculator 的既有語意一致。
3. **移除範圍**：`ProjectTransfer` 對話框、`ProjectTransferPanel` 表單分頁、`transferBetweenProjectsUseCase`、表單 VM 的轉帳欄位與驗證。
4. **保留範圍**：`IntentType.TRANSFER` 常數、`TRANSFER_GENERIC` intent mapping、ledger schema 欄位、fingerprint、`transactionRepository.getProjectTransfers`/`listTransfersByProject`、`projectSettlementCalculator` 轉帳邏輯、歷史交易列表與圖示顯示。

## 影響

- 交易表單不再提供「專案轉帳」分頁；進階意圖選項只剩 `MANUAL`。
- 已存在的轉帳交易仍顯示於交易列表（唯讀、不可編輯），餘額與結算照常計入。
- 專案餘額推導抽成 `calculateProjectBalance`（`src/domains/project/calculators/`），轉帳方向判斷同時修正為正確語意。

## 後果

- 若未來恢復此功能，需重新加入 UI 入口與寫入 use case；領域與基礎設施層無須變更。
- 歷史資料不需要遷移。
