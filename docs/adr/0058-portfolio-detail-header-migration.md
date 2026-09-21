# Portfolio 詳情 header 遷移與編輯入口集中（S1/S12）

## 狀態

已接受(2026-09)

## 背景與動機

#137（ONE PIECE Visual Consistency 標準 S1/S12）收斂前，Portfolio 詳情頁是唯一
不使用共用 `PageHeader` 的 detail 頁面：header 內建在 `PortfolioDetail` 元件裡，
Account / Debt / Project 詳情頁皆已在 page 層使用共用 header（back 鈕 + header
actions）。同時 Portfolio 的編輯功能住在列表頁（PortfolioList 的 edit dialog），
但該 dialog 沒有任何觸發入口（`setEditingPortfolio` 無 setter 呼叫路徑），屬於
死代碼；詳情頁則完全沒有 actions。

ADR-0056 已將「Portfolio Detail 移除快照管理入口」定為契約（快照由 Monthly
Close 確認冪等產生），本 ADR 不改變該決策。

## 決策

1. **Portfolio 詳情 header 遷移至 page 層**：`PortfolioDetailPage` 擁有共用
   `PageHeader`（title + 描述 + crumb PORTFOLIOS + 年月 badge + back 鈕 +
   header actions），`PortfolioDetail` 只渲染六個資料 sections（PORTFOLIO
   VALUE / VALUE BREAKDOWN / RETURN / 12M PORTFOLIO VALUE / MONTHLY
   PERFORMANCE / RETURN CALCULATION），以 props 接收 portfolio，資料單一載入
   （usePortfolios 在 page 層呼叫一次，sections 的快照查詢維持在元件層）。
2. **編輯入口集中在詳情 header**：header actions 放「編輯組合」（lucide
   Pencil icon），開啟既有 `PortfolioForm` edit dialog（帳戶連結不可變更的
   既有約束不變，ADR-0054）。提交走既有 `updatePortfolioUseCase`，成功後關閉
   dialog 並 reload。
3. **移除列表頁死代碼 edit dialog**：PortfolioList 的 `editingPortfolio`
   state、`handleEditSubmit` 與第二個 `PortfolioForm` instance 刪除；列表保留
   create、排序與列點擊入詳情的既有路徑。編輯路徑由詳情頁唯一提供。
4. **快照管理入口維持移除**：沿用 ADR-0056 item 3，詳情 header 不放快照建立
   或刪除動作。

## Considered Options

- 詳情 header actions 留空：Account 詳情亦無 actions，但 Portfolio 的編輯功能
  存在且無入口（死代碼），留空會讓唯一的寫入路徑懸空，改為集中到詳情 header，
  拒絕留空。
- 重新加入關帳快照入口：與 Monthly Close 冪等產生路徑並存會造成兩條寫入路徑
  （ADR-0056 Considered Options 已拒絕），拒絕。
- 列表頁保留 edit dialog 以備未來使用：無入口的死代碼增加維護成本且誤導讀者
  以為編輯可從列表觸發，刪除，拒絕保留。

## 影響

- `PortfolioDetailPage` / `PortfolioDetail` 的元件行為以本 ADR 為比對基準；
  backend behavior、schema、快照產生路徑皆不變。
- Portfolio 編輯入口 = 詳情頁 header actions（唯一路徑）；列表頁只提供 create
  / 排序 / 詳情導覽。
- 詳情頁 header 結構與 Account / Debt / Project 詳情頁一致（S1/S12 合規）。
