# Data Table 套件疊在 structural primitives 之上

**日期：** 2026-09-23
**狀態：** 已實作
**對應 spec：** `docs/design-system.md`（`data-table` 段）

## Context

全站表格共用兩套寫法：16 個檔案直接消費 `src/ui/components/ui/table.tsx`（shadcn
骨架，僅結構無樣式），monthly close 的 account step 則完全不用它，改在
feature 內以 module-local class 常數手寫原生 `<table>`。後者才是已定案的
`data-table` 規格（54px 列高、header 10px/uppercase/0.08em、數字欄右對齊 mono、
首尾欄 padding、hover 僅可點擊列）的「合格實作」，但這些規則散在
`CloseAccountBalanceInputs.tsx` 與 `SecuritiesAccountRow.tsx` 兩個檔案裡，且已
經分歧：`sectionLabelClass` 兩份值不同（`tracking-[0.08em]` vs
`tracking-widest`）、`numberInputClass` 逐字重複。規格要求「同頁多表格共用欄寬
常數以保持跨表同軸」，散落的常數讓這件事做不到。

同時規格要求「僅整列可點擊的列有 hover」，但 `TableRow` 對所有列強制
`hover:bg-muted/50`，導致兩個消費端必須用 `hover:bg-transparent` 硬覆寫
（`AccountSnapshotTable.tsx:150`、`TransactionItem.tsx:155`）。規則以慣例而非
機制存在，就一定會被違反。

選擇點：建一套共用 data table 套件時，既有的 `ui/table.tsx` 是要被取代刪除，
還是在其上再加一層。

## Decision

1. **`ui/table.tsx` 保留為 structural primitive 層，不刪除**。它與新套件不是同層
   競品：套件的 parts 就是由這組 primitive 組成。刪掉只會讓套件自己重寫一份或被迫
   再輸出，且會立刻破壞尚未遷移的 16 個消費端與 3 個原生 `<table>`——等於強制一次
   全改，與「逐一遷移」的節奏衝突。分層遵循 `ui-layer-architecture.md` 規則 6
   （先擴充既有共用元件）。唯一改動 primitive 的地方：**移除 `TableRow` 預設
   hover**。
2. **樣式與契約層集中在 `src/ui/components/data-table/`**（比照 `sortable/`，
   ADR-0059 先例）：`DataTable`、`DataTableColGroup`、`DataTableHeadCell`、
   `DataTableCell`、`NumberCell`、`NumberInput`、`MobileDataRow`，外加
   `styles.ts`（class 常數逃生口，供無法用通用 cell 表達的內容，如「帳戶名 + 幣別
   標籤」）與 `index.ts` barrel 再輸出 primitive。命名用 `data-table` 而非
   `table`，避免與 `ui/table` 在 import 路徑上語意重疊。
3. **公開 API 為可組合 parts，不做宣告式 `columns` API**。首個合格實作是輸入密集、
   分區塊（現金/外幣/證券）、含巢狀子表與 status glyph 的表格；宣告式 API 會立刻
   需要自訂 cell render、群組列、巢狀表三種逃生口，等於糖衣底下仍是 parts，卻多一
   層契約要維護。等第 3、4 個消費端遷移、樣式收斂後再評估是否加宣告式外層。
4. **`interactive` 為 `TableRow` 的明示 boolean prop，不自動偵測 `onClick`**。
   明示可 grep、可斷言、可型別強制；隱式會讓「這列可不可點擊」變成要讀 JS 才知道
   的事，而這正是 hover 契約要回答的問題。
5. **數字輸入框納入套件**（34px、右對齊 mono、`tabular-nums`、無原生 spinner）。
   規格已明文定義，且已是複製貼上的受害者。
6. **mobile grouped card 共用元件**。桌表與行動卡是同一份資料的兩種表示，欄位順序
   必須一致，這是唯一能保證的方法。
7. **row height 以 54px 為準**（prototype 實測），`visual-consistency.md` §11 與
   `08_Component_Design.md` 的 48px 為無原型依據的概述句，已修正。§11 不再另立
   標準，改指向 `design-system.md` 的 `data-table` 段。
8. **垂直內距納入列高預算**：`h-[54px]` 只是最小列高，而列內最高的內容是 34px
   數字輸入框，所以 cell 垂直內距由 prototype 的 13px 降為 9px（34 + 9×2 + 1px
   分隔線 = 53px，仍由最小列高補滿 54px）。13px 會讓輸入列實測撐到 61px，與
   54px 契約矛盾；因為純文字列本來就由最小列高撐滿，降低內距對它們沒有視覺影響，
   改動只落在輸入密集的列。此契約由 `data-table.test.tsx` 的 row height contract
   守住（以 `numberInputClass` 的實際高度計算預算）。

## Consequences

- 新程式碼只有一個 import 入口（`@/ui/components/data-table`），primitive 由 barrel
  再輸出；既有 16 個消費端維持原 import 路徑，遷移節奏不受影響。
- 「僅可點擊列有 hover」由 `interactive` prop 強制，`hover:bg-transparent` 覆寫
  消失；`AccountSnapshotTable` / `TransactionItem` 的硬覆寫可移除。
- **Pointer event priority 成為明文契約**：整列導覽與 grip 拖曳並存時，grip 的互動
  必須 stop propagation 並抑制拖曳結束後的一次 click，但不得關閉整列導覽；reorder
  mode 期間導覽維持有效（與 ADR-0059 決策 3、5 一致）。禁制三種缺陷：點 grip 同時
  開 Detail、drag 結束才觸發 row click、reorder mode 直接停用 row click。
- `DataTableColGroup` 在 dev 時斷言欄寬總和 ≈ 100，守住規格裡「瀏覽器會等比壓縮
  超寬表格、破壞跨表對齊」的坑；欄寬本身仍是頁面專屬事實，不塞進套件。
- 本次只把 monthly close account step 改成套件驅動（作為套件驗證），其餘 16 個消費
  端由使用者自行逐一遷移。
- `CONTEXT.md` 不動——Data Table 是 UI 呈現概念，不是財務領域術語。

## 影響

- 新增 `src/ui/components/data-table/`（parts + `styles.ts` + barrel +
  `data-table.test.tsx`）。
- 修改 `src/ui/components/ui/table.tsx`（移除 `TableRow` 預設 hover，新增
  `interactive`）。
- 修改 `src/ui/features/monthly_close/components/CloseAccountBalanceInputs.tsx`、
  `SecuritiesAccountRow.tsx`（改由套件驅動）。
- cell 垂直內距 13px → 9px（決策 8），`design-system.md` 同步。
