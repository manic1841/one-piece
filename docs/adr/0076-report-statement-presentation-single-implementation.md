# 報表語意階層的呈現只保留一份實作，由月度關帳與報表檢視共用

**日期：** 2026-10-05
**狀態：** 已實作
**規範來源：** [component-catalog.md](../ui/component-catalog.md)「statement」、[visual-standards.md](../ui/visual-standards.md)「財務報表語意階層」

月度關帳（顯示即時預覽並逐欄標註漂移）與報表檢視（顯示已產生報表、不做漂移比對）需要同一套報表語意階層（section / group / detail / deepDetail / subtotal / terminus）的排版，只有金額來源不同。決定把角色樣式、縮排、chevron 收合與兩欄表格抽成單一 drift-agnostic 實作：呼叫端預先解析金額文字後傳入，漂移比較留在關帳側的轉接層。理由是同一角色在全站必須長得一樣，兩份實作必然漂移。

## Considered Options

- 兩個畫面各留一份呈現：否決，角色樣式重複正是本次要消除的漂移來源，且新報表檢視會再度偏離 design-system。

## Consequences

- 「元件只排版、不比對」是硬邊界：金額文字（含漂移的 `A -> B`）與警示色都由呼叫端決定，元件不感知 drift，也不感知任何比較邏輯。
- 新增第三張表或新角色時要同時滿足兩個消費端的輸入形狀，不能只為單一畫面加參數。

## Revisit When

出現第三個消費端，且其需求與現有輸入形狀（已解析金額欄 + 收合狀態）衝突時。
