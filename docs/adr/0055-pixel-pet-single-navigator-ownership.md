# Pixel Pet 單一 Navigator 所有權

## 狀態

已接受(2026-09)

## 背景與動機

#119 收斂前，行動殼與桌面殼的導航所有權不一致:行動版同時存在 bottom nav（4+1
分組）與 Pixel Pet Navigator（Navigator sheet 8 項），桌面殼則只有 Pixel Pet
Navigator（header 無導航連結）。spec 08 的元件清單明言元件 37「Mobile Bottom
Navigation/More Sheet — superseded by Pixel Pet main navigator」，但實作與 spec
矛盾，無人能回答「手機的主導航是誰」。

實作 #118 期間收斂出方向，#119 grilling（2026-09-18）將其定案，本 ADR 將其定為
契約，作為後續任何導航變更的比對基準。

## 決策

1. **單一 Navigator 所有權**:主導航在所有斷點由 Pixel Pet 獨家擁有。header 不含
   主導航（spec 01）;Dashboard 是 home context，不是 Navigator 項目。
2. **收編既有入口**:刪除行動 bottom nav 與 More sheet;行動版經 Pixel Pet 現有
   的 Navigator sheet 導航（同 spec 01 的 Mobile bottom sheet 行為）。目的地清單
   繼續以 `navigation.ts` 的單一 `NAV_ITEMS` 為來源。
3. **Quick Access 不受 Navigator 限制**:Ctrl/Cmd+K 指令面板條目為全部 10 條路由
   指令（含 Dashboard 與 Settings），與 Navigator 的 8 項清單互相獨立。
4. **Pet 反應是全域資料驅動**:Layout 層 hook 讀最近財務期間狀態，映射 CLOSED ->
   happy、NEEDS_REVIEW -> alert、IN_PROGRESS -> nod、其他 -> idle;不做情境式
   context 管線。Navigator 內目前的頁面以 accent 態高亮（spec 08 的 current page
   uses accent state）。

## 影響

- 超越 ADR-0044 的決策 3（行動導航 4+1 分組）:bottom nav 移除後，4+1 分組不再是
  契約;`NAV_ITEMS` 的 `group` 欄位對 Navigator 不再有意義，Quick Access 與
  Navigator 各自取用。
- ADR-0044 的其他決策（單一 md 斷點、平板沿用桌面殼、表格橫向捲動政策）不受影響。
- 驗收清單對應 [UI 架構文件](../ui-layer-architecture.md) 的「導航所有權」章節。
