# Portfolio 列表拖曳排序（dnd-kit shared sortable pattern）

**日期：** 2026-09-22
**狀態：** 已實作（issue #152）
**對應 issue：** #148（List/Detail responsibility split spec）、#152

## Context

PortfolioList 的既有「排序」模式沒有任何移動列的機制：按排序進入 reorder
mode，header 換成 儲存順序/取消，但使用者無法改變列順序，儲存的永遠是原本的
order。排序是使用者主動編輯清單的動作，需要真實的拖曳（與鍵盤/觸控）輸入。
專案內 Account / Project 列表也各有排序需求，若各 feature 自行實作拖曳會產生
三份重複的 sensor / drop 計算 / row style 邏輯。

## Decision

1. **引入 @dnd-kit/core + @dnd-kit/sortable 作為拖曳排序基礎**：這是僅有的兩個
   新依賴；modifiers / utilities 不引入——垂直軸限制以 row style
   （translate3d 限 Y 軸）表達，避免為單一用途多帶套件。
2. **共用 sortable 模式集中在 `src/ui/components/sortable/`**：
   `useSortableListSensors`（Pointer distance 8px / Touch delay 180ms +
   tolerance 6px / Keyboard + sortableKeyboardCoordinates）、
   `reorderFromDragEnd`（缺漏/同 id/找不到項目一律回 null，不猜測）、
   `getSortableRowStyle` / `useSortableRow`。任何清單可重用，Account / Project
   拖曳排序（#153 / #154）直接套用。
3. **僅 grip handle 可拖曳，整列不可**：`GripHandle` 為
   `setActivatorNodeRef` 的 activator button（aria-label、focus ring、
   `touch-none`、`active:scale-[0.97]`），row 本身不掛 listeners——保護 row
   click 導覽不被拖曳手勢干擾，grip click stopPropagation 防止誤觸導覽。
4. **drop 後以 desired-state 契約持久化**：拖放結果映射為 `[{id, order}]`
   完整序列，走既有 `reorderPortfolios`（ADR-0041 的 atomic desired-state
   契約），成功後 reload；不做 partial update。
5. **移除損壞的 reorder mode**：排序 button、儲存順序/取消 header swap、
   reorder-mode state 全數刪除，不保留相容層。
6. **DndContext 放在 Table 外層**：dnd-kit 會 render aria-live div，包在
   `<tbody>` 內會產生無效 HTML（div 不是 tbody 的合法子元素）；DndContext
   只要求 sortable 節點在其子樹內，故 scope 包住整個 Table / mobile list。

## Consequences

- 拖曳、鍵盤（Space 開始、方向鍵移動、Space 放下、Escape 取消）、長按觸控
  （180ms 啟動、不阻斷捲動）三種輸入路徑由同一組 sensor 提供。
- Account / Project 列表的拖曳排序不需要再寫 dnd-kit 膠水碼。
- 列表頁測試需 mock `getBoundingClientRect` 才能在 jsdom 驅動鍵盤排序（
  `sortableKeyboardCoordinates` 依賴真實 droppable rect）。

## 影響

- `src/ui/components/sortable/`（useSortableList、SortableListScope、
  GripHandle）為全站唯一拖曳排序實作；`PortfolioList` / 
  `SortablePortfolioRows` 以本 ADR 為比對基準。backend、schema、reorder use
  case 契約皆不變。
