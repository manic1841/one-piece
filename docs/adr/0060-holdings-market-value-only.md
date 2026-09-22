# Holdings 只記市值不記數量：market-value-only 持倉模型

## Status

Accepted (2026-09-22)

## Context

Monthly Close 的 Account Balance 重構（issue #100 UI/UX 規格）前，證券持倉以
`HoldingSchema { symbol, name, quantity, cost, marketValue, leverage }` 記錄，
UI 要求使用者輸入持有數量（Qty）。規格明確表示使用者不想記錄數量：持倉的欄位
只有 Symbol / Name / Cost / Value / Leverage。

`quantity` 造成兩個問題：

1. 使用者被迫輸入一個不想紀錄的數字；不輸入則落 0，屬於靜默 fallback（工程標準
   禁止）。
2. Portfolio 頁的持倉清單以 `marketValue / quantity` 推導單位價，Qty 為 0 時推導
   即失敗，或顯示誤導性的單位價。

## Decision

1. **從 `HoldingSchema` 移除 `quantity`**：持倉以市值為記錄單位，欄位為
   `symbol / name / cost / marketValue / leverage?`。市值由使用者輸入並凍結進
   快照，沒有獨立觀察來源，不構成對帳依據（ADR-0051 語意不變）。
2. **不做資料遷移**：既有快照文件 holdings 內殘留的 `quantity` 由 zod 讀取時
   自動剝除，無行為影響；下次快照寫入時自然消失。乾淨度不值一次遷移的風險。
3. **波及面一次收斂**：兩處 schema 定義、snapshotForm 型別、toSnapshot /
   toSnapshotForm mappers、帳戶編輯器 VM、Account 頁持倉輸入欄與快照表格顯示、
   Portfolio 頁持倉清單（單位價計算改為純市值顯示）、測試 fixtures 與 QA seed
   data 一次同步。`ledger` 的 quantity 是另一個 domain（investmentDetail），
   不動。

## Consequences

- 持倉編輯不再出現 Qty 欄位；新增持倉列不需要數量輸入。
- 帳戶列表與詳情頁以市值呈現持倉，不再顯示「數量 @ 單位價」。
- 舊資料殘留欄位被 schema strip，讀取與寫入路徑一致。
- 若未來需要單位價或股數分析，需另立資料來源，不從市值反推。
