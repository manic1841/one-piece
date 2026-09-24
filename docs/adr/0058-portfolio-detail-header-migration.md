# Portfolio 詳情 header 遷移與編輯入口集中（S1/S12）

**狀態：** 已接受（2026-09）
**規範來源：** [ui-layer-architecture.md](../ui/ui-layer-architecture.md) §7.3

#137（ONE PIECE Visual Consistency 標準 S1/S12）收斂前，Portfolio 詳情頁是唯一不使用共用 `PageHeader` 的 detail 頁面：header 內建在元件裡，Account / Debt / Project 詳情頁皆已在 page 層使用共用 header。同時 Portfolio 的編輯功能住在列表頁，但該 dialog 沒有任何觸發入口（死代碼）；詳情頁則完全沒有 actions。

因此**把詳情 header 遷移到 page 層**（`PortfolioDetailPage` 擁有共用 `PageHeader`，detail 元件只渲染資料 sections），並**把編輯入口集中到詳情 header**；列表頁的 edit dialog 死代碼移除，編輯路徑由詳情頁唯一提供。快照管理入口維持移除（沿用 ADR-0056），詳情 header 不放快照建立或刪除動作。

## Considered Options

- 詳情 header actions 留空：Account 詳情亦無 actions，但 Portfolio 的編輯功能存在且無入口（死代碼），留空會讓唯一的寫入路徑懸空，改為集中到詳情 header，拒絕留空。
- 重新加入關帳快照入口：與 Monthly Close 冪等產生路徑並存會造成兩條寫入路徑（ADR-0056 Considered Options 已拒絕），拒絕。
- 列表頁保留 edit dialog 以備未來使用：無入口的死代碼增加維護成本且誤導讀者以為編輯可從列表觸發，刪除，拒絕保留。

## Consequences

- Portfolio 編輯入口 = 詳情頁 header actions（唯一路徑）；列表頁只提供 create / 排序 / 詳情導覽。backend behavior、schema 與快照產生路徑皆不變。
- 詳情頁 header 結構與 Account / Debt / Project 詳情頁一致（S1/S12 合規）。
