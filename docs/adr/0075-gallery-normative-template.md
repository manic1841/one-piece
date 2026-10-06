# Gallery 場景為全站畫面的規範樣板，契約與 token 權威留在 docs/ui/

**日期：** 2026-10-02
**狀態：** 已實作
**規範來源：** [component-catalog.md](../ui/component-catalog.md)「規則」節

Dev-only 的 `/gallery` 路由以真實共用元件渲染全部 catalog 場景，升格為全站畫面的規範樣板：新畫面開發一律先照 gallery 對應 section 的組合方式實作，可呈現的表面以場景為準；`docs/ui/` 仍是設計 token、元件契約與分層規則的唯一來源。這樣分工讓樣板由真實元件渲染、不會與實作漂移，文件保留可 review、可 diff 的契約面；代價是元件變更必須在同一個 task 內同步 gallery section，靠 catalog 規則節的紀律而非機制保證。

## Considered Options

- 維持過渡定位（gallery 僅 dev 檢視面，design-system.md 為唯一規範）：否決——規範與真實渲染分岔，元件契約變更不會改變任何已驗證的畫面，feature 的漂移也不被樣板擋下（#261 的 19 個零 production 消費端元件即症狀）。

## Consequences

- 元件契約變更的驗收從「更新文件」變成「文件與 gallery section 同步」；兩處各自是所屬面向的唯一權威（契約 vs 場景），同一事實不得各寫一份完整規格。
- gallery 內部 scaffold（`GalleryScaffold` 的 re-export）是 dev 工具，不屬於規範樣板的內容。

## Revisit When

gallery 不再是 dev-only 路由，或場景數量讓同步維護成本高於文件單一來源時，重新檢視此分工。
