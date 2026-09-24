# Data Table 套件疊在 structural primitives 之上

**日期：** 2026-09-23
**狀態：** 已實作
**規範來源：** [design-system.md](../ui/design-system.md)（`data-table` 段）

全站表格共用兩套寫法：多數檔案直接消費結構性的 `ui/table.tsx`（shadcn 骨架，僅結構無樣式），monthly close 的 account step 則完全不用它，改在 feature 內以 module-local class 常數手寫原生 `<table>`。後者才是已定案的 `data-table` 規格的合格實作，但規則散在兩個檔案裡且已經分歧——同一份 class 常數出現兩個不同的值，另一份則逐字重複。規格要求「同頁多表格共用欄寬常數以保持跨表同軸」，散落的常數讓這件事做不到。

同時規格要求「僅整列可點擊的列有 hover」，但 primitive 的 row 對所有列強制 hover，導致兩個消費端必須硬覆寫。規則以慣例而非機制存在，就一定會被違反。選擇點因此是：建共用套件時，既有的 primitive table 要被取代刪除，還是在其上再加一層。

## Considered Options

- **刪除 `ui/table.tsx`，套件自成一層**：它與新套件不是同層競品，套件的 parts 就是由這組 primitive 組成；刪掉只會讓套件重寫一份，且立刻破壞尚未遷移的消費端，等於強制一次全改。拒絕。
- **宣告式 `columns` API**：首個合格實作是輸入密集、分區塊、含巢狀子表與 status glyph 的表格，宣告式 API 會立刻需要自訂 cell render、群組列與巢狀表三種逃生口，等於糖衣底下仍是 parts，卻多一層契約要維護。拒絕，等消費端遷移與樣式收斂後再評估。
- **自動偵測 `onClick` 決定列是否可互動**：會讓「這列可不可點擊」變成要讀 JS 才知道的事，而這正是 hover 契約要回答的問題。改為明示 boolean prop。拒絕。
- **列高標準另立一份**：既有文件中的較小數值為無量測依據的概述句，列高標準改指向設計系統，不另行定義。拒絕另立。

## Consequences

- 新程式碼只有一個 import 入口，primitive 由 barrel 再輸出；既有消費端維持原 import 路徑，遷移節奏不受影響。
- 「僅可點擊列有 hover」由明示 prop 強制，消費端的硬覆寫可移除。
- **Pointer event priority 成為明文契約**：整列導覽與 grip 拖曳並存時，grip 的互動必須 stop propagation 並抑制拖曳結束後的一次 click，但不得關閉整列導覽；reorder mode 期間導覽維持有效（與 ADR-0059 一致）。禁制三種缺陷：點 grip 同時開 Detail、drag 結束才觸發 row click、reorder mode 直接停用 row click。
- 欄寬總和在 dev 時被斷言，守住「瀏覽器會等比壓縮超寬表格、破壞跨表對齊」的坑；欄寬本身仍是頁面專屬事實，不塞進套件。
- cell 垂直內距納入列高預算，列高數值以設計系統為準；此契約由測試守住。
- 本次只把 monthly close account step 改成套件驅動（作為套件驗證），其餘消費端由使用者自行逐一遷移。
- `CONTEXT.md` 不動——Data Table 是 UI 呈現概念，不是財務領域術語。
