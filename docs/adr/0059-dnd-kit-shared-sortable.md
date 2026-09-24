# Portfolio 列表拖曳排序（dnd-kit shared sortable pattern）

**日期：** 2026-09-22
**狀態：** 已實作（issue #152）
**對應 issue：** #148（List/Detail responsibility split spec）、#152

**規範來源：** [design-system.md](../ui/design-system.md) §sortable-list
**對應 issue：** #148（List/Detail responsibility split spec）、#152

PortfolioList 的既有「排序」模式沒有任何移動列的機制：按排序進入 reorder
mode，header 換成 儲存順序/取消，但使用者無法改變列順序，儲存的永遠是原本的
order。排序是使用者主動編輯清單的動作，需要真實的拖曳（與鍵盤/觸控）輸入。
專案內 Account / Project 列表也各有排序需求，若各 feature 自行實作拖曳會產生
三份重複的 sensor / drop 計算 / row style 邏輯。因此引入 dnd-kit 的 core +
sortable，並把共用的 sortable 模式集中在單一 module。

## Considered Options

- **一併引入 modifiers / utilities**：垂直軸限制以 row style 表達即可，不為單一
  用途多帶套件。拒絕。
- **整列可拖曳**：會干擾 row click 導覽。改為僅 grip handle 可拖曳。拒絕。
- **各 feature 自行實作拖曳**：三份重複的 sensor 與 drop 邏輯。拒絕。
- **保留損壞的 reorder mode 作為相容層**：沒有任何機制可移動列，保留只會誤導。
  拒絕。

## Consequences

- 拖曳、鍵盤（Space 開始、方向鍵移動、Space 放下、Escape 取消）、長按觸控
  （180ms 啟動、不阻斷捲動）三種輸入路徑由同一組 sensor 提供。
- Account / Project 列表的拖曳排序不需要再寫 dnd-kit 膠水碼。
- 列表頁測試需 mock `getBoundingClientRect` 才能在 jsdom 驅動鍵盤排序（
  `sortableKeyboardCoordinates` 依賴真實 droppable rect）。
- backend、schema、reorder use case 契約皆不變。
