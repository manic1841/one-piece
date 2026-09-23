# Workflow-first 介面：Monthly Close、Portfolio Detail、Debt、Header（S10）

## 狀態

已接受(2026-09)

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

1. **Monthly Close 步驟列去 Card 化**：mobile 步驟列以 divider（`border-t`）與
   whitespace 建立層級，不用 Card（對齊 design-system 的 Workflow 表面規範）；
   desktop 維持水平 rail（ADR-0050 階段模型），rail 為進度總覽、加在階段動作清單
   （證據 + 輸入 + CONTINUE）之上，不取代動作面。9 個系統階段不變，schema 與
   workflow logic 不動。

   **2026-09-22 修訂（Pipeline = Navigation, Workspace = Content）**：步驟呈現
   收斂為單一響應式 `ClosePipeline` 元件（純 navigation/progress，不承載階段內
   容），desktop 水平、mobile 直式緊湊（40–48px 高，Status Icon + 編號 + 名稱）。
   階段內容只在下方 Current Step Workspace 呈現（單一 working area：一次只顯示
   一個階段的證據 + 輸入 + Primary Action）。當前步驟＝第一個未完成階段；已完成
   階段可點擊回看/編輯（輕量 `REVIEWING` 標記 + 重新確認按鈕），Waiting 不可跳過
   前置，NEEDS_REVIEW 可由 pipeline badge 直接定位。stale 標記為衍生式計算（上游
   confirmedAt 晚於下游完成時間 → `NEEDS RECONFIRM` badge，資訊性、可點擊跳轉、
   零新狀態），與 `NEEDS REVIEW`（工作流暫停）在 UI 上明確區分。CLOSE_PERIOD 唯一
   硬閘維持三張報表已產生；9 階段 schema、confirm API、ADR-0052 資料邊界不變。
   原 `CloseStageList` / `CloseStageRail` 雙元件移除。

   **2026-09-22 修訂二（Pipeline 預設收合 + 位置制進度）**：Pipeline 預設收合，
   只顯示單行狀態（狀態 glyph + `02 / 09`）與 SHOW WORKFLOW toggle；展開後才顯
   示 9 階段清單，互動模型不變（Completed 可回看、Current 高亮、Waiting 不可跳
   過、badge 可定位）。Pipeline 只負責 navigation / progress，Current Step
   Workspace 永遠展開；進度語意為「目前位於第 2 階段」的位置制（`02 / 09`），非
   完成計數。Desktop / Mobile 共用同一 Pipeline 元件，差異只在展開後 layout。
2. **確認動作文案為 `CONTINUE →`**：語意即現行階段的 confirm（冪等建立 + 標記完
   成，ADR-0052），不新增後端行為；`RESOLVE_REVIEW` 既有 label 沿用，NEEDS_REVIEW
   banner 與每階段證據列表保留。
3. **Portfolio Detail 移除快照管理入口**：正式 UI 移除「關帳快照」按鈕、快照
   dialog 與相關 state，移除 MONTHLY PERFORMANCE 每列刪除鈕；create/delete use
   cases 保留為 internal capability，不刪檔案。快照由 Monthly Close 確認冪等產生
   （ADR-0012）。六個 section（PORTFOLIO VALUE / VALUE BREAKDOWN / RETURN /
   12M PORTFOLIO VALUE / MONTHLY PERFORMANCE / RETURN CALCULATION）保留。
4. **Debt row action 移到詳情**：列表移除常駐 Edit / Delete / Disable 鈕與
   actions 欄（列保留 arrow affordance，點擊入詳情）；Edit 與 Disable（停用＝
   `isActive: false`，經既有 `updateDebtAccountUseCase`）移到 Debt Detail header
   actions；Delete 保留在詳情內低調 danger 區，後端 smart delete 行為不動
   （ADR-0016）。emoji 改為 lucide icon。
5. **Header Settings 收進 User Menu**：移除獨立 Settings 圖示鈕；Avatar 下拉加入
   Settings（navigate `/settings`）與 Log out（既有 confirm 流程）。`/settings`
   route 與 Quick Access 的 Settings 指令不受影響。

## Considered Options

- Monthly Close mobile 保留 Card：卡片權重高於 pipeline 本身，違反 workflow-first
  層級，改以 divider 分層，拒絕。
- 保留 Portfolio 快照手動入口：與 Monthly Close 確認產生路徑並存會造成兩條寫入路
  徑與快照覆蓋疑義（ADR-0052 單段式），改為單一產生路徑，拒絕。
- 列表列內保留 Edit：列表應可掃描與比較，列內常駐動作增加認知負擔；列點擊入詳情
  已提供路徑，動作集中到詳情 header，拒絕。
- 合併「停用/刪除」單鈕：兩者語意與後端行為不同（deactivate vs smart delete），
  拆為 header 的 Disable 與 danger 區的 Delete，拒絕合併。
- Header 保留獨立 Settings 鈕：低頻操作佔用常駐欄位，收進 User Menu，拒絕保留。

## 影響

- Monthly Close、Portfolio Detail、Debt、Layout 的 UI 元件行為以本 ADR 為比對基
  準；workflow logic、backend behavior、schema 皆不變。
- Debt Detail header actions 為 Edit / Disable（啟用中）或 Enable（已停用）；
  Delete 為詳情內 danger 區。
- design-system 的 Workflow 表面去 Card 規範由本次實作完成。
