# Portfolio 詳情頁 header 與編輯入口（S1/S12）

**狀態：** 已接受（2026-09）
**規範來源：** [ui-layer-architecture.md](../ui/ui-layer-architecture.md) §7.3/§7.4/§7.6

#137（ONE PIECE Visual Consistency 標準 S1/S12）收斂後，Portfolio 是唯一把 detail header 內建在元件裡的頁面：Account / Debt / Project 詳情頁皆已在 page 層使用共用 `PageHeader`。它的寫入入口也錯置——編輯 dialog 住在列表頁卻沒有任何觸發入口（死代碼），詳情頁則完全沒有 actions。

因此**詳情 header 遷移到 page 層**：`PortfolioDetailPage` 擁有共用 `PageHeader`，detail 元件只渲染資料 sections。寫入入口依資訊層級重新分配——**名稱**走 `InlineEditableTitle`、**啟用／停用**（lifecycle toggle）放 header actions、**刪除**下放頁尾 Danger Zone；`PortfolioForm` 收斂為 create-only（列表頁「新增組合」專用），證券帳戶／銀行帳戶等建立後即不變更的 metadata 不再提供編輯路徑。快照管理入口維持移除（沿用 ADR-0056）。

## Considered Options

- 詳情 header 保留 edit form 以編輯證券／銀行帳戶：名稱以外的 metadata 建立後不應變更，維持一個沒人用的欄位只增加維護成本，拒絕。
- 詳情 header actions 留空：Account 詳情亦無 actions，但 Portfolio 需要 lifecycle toggle 與刪除入口，留空會讓寫入路徑懸空，拒絕。
- 列表頁保留 edit dialog 以備未來使用：無入口的死代碼誤導讀者以為編輯可從列表觸發，刪除，拒絕保留。
- 重新加入關帳快照入口：與 Monthly Close 冪等產生路徑並存會造成兩條寫入路徑（ADR-0056 Considered Options 已拒絕），拒絕。

## Consequences

- Portfolio 寫入入口 = 詳情頁 header（rename + lifecycle toggle）與頁尾 Danger Zone（delete）；列表頁只提供 create / 排序 / 詳情導覽。backend behavior、schema 與快照產生路徑皆不變。
- 詳情頁 header 結構與 Account / Debt / Project 詳情頁一致（S1/S12 合規）。
