# Pixel Pet 單一 Navigator 所有權

**狀態：** 已接受（2026-09）
**規範來源：** [ui-layer-architecture.md](../ui/ui-layer-architecture.md) §6.1、§6.2

#119 收斂前，行動殼與桌面殼的導航所有權不一致：行動版同時存在 bottom nav（4+1 分組）與 Pixel Pet Navigator，桌面殼則只有 Pixel Pet Navigator（header 無導航連結），無人能回答「手機的主導航是誰」。

因此定案：**主導航在所有斷點由 Pixel Pet 獨家擁有**，行動 bottom nav 與 More sheet 收編移除。`NAV_ITEMS` 是全站路由清單（含 Dashboard 與 Settings），Navigator 與 Ctrl/Cmd+K 的 Quick Access 取用的是**同一份清單的不同子集**——Navigator 扣除 Dashboard 與 Settings，Quick Access 涵蓋全部路由。Dashboard 是 home context 不是 Navigator 項目，由 header 品牌承擔；Settings 由 Avatar menu 承擔。寵物反應為全域資料驅動，不做情境式 context 管線。

取捨是「Navigator 渲染全部 `NAV_ITEMS`」這類字面解讀會與「Dashboard 不是 Navigator 項目」矛盾，必須以「同一來源、不同子集」表述；換取導航變更只需比對一份契約。

## Consequences

- 超越 [ADR-0044](0044-rwd-breakpoint-contract.md) 的決策 3（行動導航 4+1 分組）：bottom nav 移除後 4+1 分組不再是契約，`NAV_ITEMS` 昔日供 bottom nav 使用的 `group` 欄位已移除。
- ADR-0044 的單一 `md` 斷點與桌面殼、表格捲動政策不受影響。
- 2026-09-23 的修訂只釐清「同一來源、不同子集」的取用範圍，本 ADR 的決策不變，因此不另開 ADR。
