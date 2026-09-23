# Pixel Pet 單一 Navigator 所有權

## 狀態

已接受(2026-09)

## 背景與動機

#119 收斂前，行動殼與桌面殼的導航所有權不一致:行動版同時存在 bottom nav（4+1
分組）與 Pixel Pet Navigator（Navigator sheet 8 項），桌面殼則只有 Pixel Pet
Navigator（header 無導航連結）。元件的既定結論是「Mobile Bottom
Navigation/More Sheet — superseded by Pixel Pet main navigator」，但實作未反映
該結論，無人能回答「手機的主導航是誰」（現行契約見
[UI 架構文件](../ui/ui-layer-architecture.md) 的導航所有權契約）。

實作 #118 期間收斂出方向，#119 grilling（2026-09-18）將其定案，本 ADR 將其定為
契約，作為後續任何導航變更的比對基準。

## 決策

1. **單一 Navigator 所有權**:主導航在所有斷點由 Pixel Pet 獨家擁有。header 不含
   主導航（詳見 [UI 架構文件](../ui/ui-layer-architecture.md) 的導航所有權章節）;
   Dashboard 是 home context，不是 Navigator 項目。
2. **收編既有入口**:刪除行動 bottom nav 與 More sheet;行動版經 Pixel Pet 現有
   的 Navigator sheet 導航（Mobile bottom sheet 行為，詳見
   [UI 架構文件](../ui/ui-layer-architecture.md)）。Navigator 清單為 **8 項**——
   `NAV_ITEMS` 扣除 Dashboard 與 Settings（見下方修訂）；路由清單仍以
   `navigation.ts` 為單一來源，但 Navigator 與 Quick Access 取用的**集合不同**。
3. **Quick Access 不受 Navigator 限制**:Ctrl/Cmd+K 指令面板條目為全部 10 條路由
   指令（含 Dashboard 與 Settings），與 Navigator 的 8 項清單互相獨立。
4. **Pet 反應是全域資料驅動**:Layout 層 hook 讀最近財務期間狀態，映射 CLOSED ->
   happy、NEEDS_REVIEW -> alert、IN_PROGRESS -> nod、其他 -> idle;不做情境式
   context 管線。Navigator 內目前的頁面以 accent 態高亮（current page
   uses accent state）。

## 影響

- 超越 ADR-0044 的決策 3（行動導航 4+1 分組）:bottom nav 移除後，4+1 分組不再是
  契約;`NAV_ITEMS` 昔日供 bottom nav 使用的 `group` 欄位已移除，Quick Access 與
  Navigator 取用同一份路由清單的不同子集。
- ADR-0044 的單一 `md` 斷點決策不受影響;其桌面殼與表格捲動政策已於 2026-09-23
  與實作一致化(見 [ADR-0044](0044-rwd-breakpoint-contract.md))。
- 驗收清單對應 [UI 架構文件](../ui/ui-layer-architecture.md) 的「導航所有權」章節。

## 修訂（2026-09-23，釐清 Navigator 取用範圍）

決策 2 原先寫「目的地清單繼續以 `navigation.ts` 的單一 `NAV_ITEMS` 為來源」。但
`NAV_ITEMS` 是**全站路由清單**（現為 10 項，含 Dashboard 與 Settings），這句與決策
1「Dashboard 不是 Navigator 項目」及決策 3「Navigator 的 8 項清單」互相矛盾。實作
依決策 2 的字面渲染全部 `NAV_ITEMS`，Navigator 因此出現 10 項。

**本 ADR 的決策不變**（Navigator 8 項、Dashboard 為 home context）；本次只釐清取用
範圍，非新決策:

- **Navigator＝8 項**:`NAV_ITEMS` 扣除 `/`（Dashboard）與 `/settings`（Settings）。
  Dashboard 由 header 品牌 ONE PIECE 承擔、Settings 由 Avatar menu 承擔，兩者皆非
  Navigator 項目（決策 1）。
- **Quick Access＝全部路由指令**:Ctrl/Cmd+K 涵蓋含 Dashboard 與 Settings 在內的全部
  路由，與 Navigator 清單互相獨立（決策 3）。
- **非同一集合**:兩表面共用 `navigation.ts` 作路由的單一來源，但取用不同子集;「以
  `NAV_ITEMS` 為來源」不得解讀為「Navigator 渲染全部 `NAV_ITEMS`」。
- **實作與文件一致化**:依本契約修正實作（Navigator 8 項、Quick Access 10 條，含
  對應測試），見 issue #175;呈現層描述以
  [UI 架構文件](../ui/ui-layer-architecture.md) 的導航所有權契約為準。
- **未新開 ADR**:這是同一份導航所有權契約的範圍釐清，另開 ADR 會產生兩份描述同一
  契約的文件。
