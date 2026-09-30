---
description: Point UI work at the presentation-layer contracts before editing anything under src/ui.
applyTo: 'src/ui/**'
---

# UI 變更

改動或新增 `src/ui/**` 前，先讀呈現層契約。契約內容不在此重述——以文件為準：

- [`docs/ui/visual-standards.md`](../../docs/ui/visual-standards.md)：頁面層級的佈局與互動標準，含**最終視覺 Review Checklist**——完成前逐條掃過。
- [`docs/ui/design-system.md`](../../docs/ui/design-system.md)：設計 token 與元件表面（色彩、材質、動態、字體排印、元件尺寸與狀態契約）。
- [`docs/ui/states-and-a11y.md`](../../docs/ui/states-and-a11y.md)：空／載入／錯誤三態的義務，以及無障礙契約（ARIA 歸屬、焦點、鍵盤、`prefers-*`）。改到互動元素或輸入欄位時必讀。
- [`docs/ui/ui-layer-architecture.md`](../../docs/ui/ui-layer-architecture.md)：UI 分層與依賴方向、導航契約、RWD 斷點、動作位置。
- [`docs/ui/ui-labeling-guideline.md`](../../docs/ui/ui-labeling-guideline.md)：顯示標籤的唯一來源。

既有元件優先：`src/ui/components/` 有能擴充的元件就不要新建。

文件未涵蓋時，依 `visual-standards.md`「核心設計原則」的優先序取捨；仍不明確、或要引入新模式（新元件、新視覺樣式、新互動）時，走 `development-guide` §4 的設計變更流程——六個提問，並在動手前取得同意。
