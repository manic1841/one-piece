# RWD 斷點契約:單一 md 斷點與置中容器殼

## 狀態

已接受(2026-09);內容與實作一致化(2026-09-23)

## 背景與動機

#85 前的版面沒有明文的響應式契約:行動版與桌機共用同一組導航(桌機 sidebar 縮窄
或依賴瀏覽器縮放)、Vite 樣板的 `#root { max-width: 1280px }` 殘留樣式與實際的全寬
版面矛盾,斷點語意散落在各元件的 class 裡,無人能回答「768px 屬於手機還是桌機」。

實作 #86 與 #87 時收斂出可驗證的行為,本 ADR 將其定為契約,作為後續任何版面變更
的比對基準。本段描述初版決策成立時(#85 前)的世界,保留為歷史。

## 決策

1. **單一斷點切換**:`md`(768px)是行動殼與桌面殼的唯一切換點,禁止引入第二組
   「平板專用殼」。
2. **桌面殼是置中容器,不是側欄**:行動殼與桌面殼的差異只在 Pixel Pet 的呈現
   (bottom sheet vs floating panel);殼自身皆為 sticky header + 置中 `max-w-7xl`
   容器,無側欄、無內容補償 padding。曾評估保留固定側欄(本 ADR 初版)與為平板
   做摺疊側欄,因資料欄寬與雙殼複雜度改以置中容器統一。
3. **行動導航歸 Pixel Pet**:bottom nav 與 More sheet 已退場,由
   [ADR-0055](0055-pixel-pet-single-navigator-ownership.md) 承接;4+1 分組與
   `NAV_ITEMS` 的 `group` 欄位不再是契約。
4. **行動版表格不橫向捲動**:`< md` 的寬表格改用分組卡片／compact rows
   (`md:hidden`),`md`+ 才允許 `overflow-x-auto` 橫向捲動;不折行擠壓、不在手機
   砍欄位。此為本 ADR 初版政策之反轉,取代理由見 #138;規則全文以
   [`design-system.md`](../ui/design-system.md) 為準。

## 影響

- 版面寬度只有兩個合法值:行動(< 768)全寬、`md`+ 置中 `max-w-7xl` 容器。對應
  驗收清單見 [UI 架構文件](../ui/ui-layer-architecture.md)的「RWD 斷點契約」章節。
- 歷史註記:`App.css`(Vite 樣板殘留,`#root max-width: 1280px`)與本契約矛盾,已刪除。
- 歷史註記:初版曾記錄「交易列表日期篩選列在 768px 溢位約 124px」的已知偏差;已於
  #89 修復(篩選列自 `md` 起允許折行,輸入欄位改為內容寬度),四檔 QA 清單全檔
  無整頁水平捲軸。
- 側欄若重新納入考量,須同步修訂本 ADR 決策 2 與 [UI 架構文件](../ui/ui-layer-architecture.md) 的斷點與 QA 清單。
