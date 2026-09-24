# Workflow-first 介面：Monthly Close、Portfolio Detail、Debt、Header（S10）

## 狀態

已接受(2026-09)

**規範來源：** [ui-layer-architecture.md](../ui/ui-layer-architecture.md) §6.1；[visual-standards.md](../ui/visual-standards.md) 工作流

## 背景與動機

#126（S10）收斂前，四個工作流視窗的視覺權重與操作位置不一致：Monthly Close 的
mobile 步驟列是 Card、確認鈕文案為「確認此階段」（語意不透明）；Portfolio Detail
在正式 UI 保留「關帳快照」建立入口與 MONTHLY PERFORMANCE 每列刪除鈕，而快照已由
Monthly Close 確認冪等產生（ADR-0012 recomputable cache、ADR-0052 單段式確認即建
立）；Debt 列表列內有常駐 Edit（emoji）與合併「停用/刪除」鈕，而列表列已可點入
詳情；Header 有獨立 Settings 圖示鈕，與 Avatar 下拉（僅 Logout）並存。

workflow-first surfaces 的方向（對齊 `docs/ui/design-system.md` 的表面規範）：pipeline
是頁面的主要層級，工作區集中，破壞性與低頻操作移到詳情。本 ADR 將四個視窗的收斂
結果定為契約。

## 決策

收斂的方向是 workflow-first：pipeline 是頁面的主要層級，工作區集中，破壞性與低頻操作移到詳情。

Monthly Close 的步驟呈現收斂為單一響應式元件，只負責 navigation 與 progress，階段內容只在單一的 current step workspace 呈現；9 個系統階段、schema 與 confirm API 皆不變。Portfolio Detail 移除快照管理入口與每列刪除鈕——快照由 Monthly Close 的確認動作冪等產生，保留手動入口會造成兩條寫入路徑。Debt 的列內常駐動作移到詳情，列表只保留導覽 affordance。Header 的獨立 Settings 鈕收進 User Menu，低頻操作不佔用常駐欄位。

## Considered Options

- **Monthly Close mobile 保留 Card**：卡片權重高於 pipeline 本身，違反 workflow-first 層級。拒絕。
- **保留 Portfolio 快照手動入口**：與 Monthly Close 的確認產生路徑並存，會造成兩條寫入路徑與快照覆蓋疑義。拒絕。
- **列表列內保留 Edit**：列表應可掃描與比較，列內常駐動作增加認知負擔；列點擊入詳情已提供路徑。拒絕。
- **合併「停用/刪除」單鈕**：兩者語意與後端行為不同（deactivate vs smart delete）。拒絕合併。
- **Header 保留獨立 Settings 鈕**：低頻操作佔用常駐欄位。拒絕。

## Consequences

- Monthly Close、Portfolio Detail、Debt、Layout 的 UI 元件行為以本 ADR 為比對基準；workflow logic、backend behavior、schema 皆不變。
- Debt Detail header actions 為 Edit / Disable（啟用中）或 Enable（已停用）；Delete 為詳情內 danger 區。
- 快照的 create/delete use cases 保留為 internal capability，不刪檔案。
- 原步驟列表與 rail 雙元件移除，改由單一 pipeline 元件承接。
- design-system 的 Workflow 表面去 Card 規範由本次實作完成。
