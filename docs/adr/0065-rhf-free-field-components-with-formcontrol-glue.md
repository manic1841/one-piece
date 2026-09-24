# 表單欄位元件與 RHF 解耦，接線集中於 FormControl

**日期：** 2026-09-24
**狀態：** 已接受
**規範來源：** [design-system.md](../ui/design-system.md) §7（`form` 段）

ADR-0064 決定以 RHF 統一表單狀態後，下一個問題是 RHF 的接線要長在哪裡。最直接的做法是讓每個輸入元件（`NumberInput`、`CurrencyInput`…）自行讀取 RHF context，或由呼叫端在每個欄位手動綁 `value/onChange`。前者讓每個元件都依賴 RHF，「統一為 RHF」於是變成「UI 層全面綁死 RHF」；後者則讓接線契約散在每個呼叫點，欄位一多就分歧。選擇點因此是：RHF 的接線知識住在哪裡。

## Considered Options

- **輸入元件內部以 `useFormField()` 讀 context**：元件 API 最短，但每個輸入元件都知道 RHF 存在，無法在非 RHF 情境（或未來的其他表單機制）獨立使用。拒絕——這正是要避免的耦合。
- **保留 shadcn 的 `FormControl`（`Slot`）作為接線層**：可行，但 `Slot` 只是把 props 轉發給唯一子元素，語意上不明示「這裡注入的是 RHF 的 field binding」；且原實作把 RHF glue 與視覺 primitive 混在同一個 barrel。拒絕——接線契約不夠顯式。
- **`FormControl` 以 `useController()` 取得 field，再顯式注入給子元素（採用）**：輸入元件維持 RHF-free（唯一 value contract 是 string），RHF 的接線知識全部集中在 `FormControl` 一處。代價是 `FormControl` 必須以受控方式把 `value/onChange/onBlur/ref` 與 a11y 屬性注入子元素，這條注入契約需要明文規範（住在 `design-system.md`）。

## Consequences

- 輸入元件（`NumberInput`、`TextInput`…）是純 UI 元件：`<NumberInput value={value} onChange={setValue} />` 即可獨立使用，不知道 RHF 存在；這讓它們可被非表單情境（例如表格內的 inline 編輯）重用。
- RHF 的相依集中在表單套件一處；要替換或升級表單狀態機制時，衝擊面被限制在 `FormControl`。
- 欄位的 value contract 統一為 string（native input 的自然型態），數字轉換由 schema 邊界的 coercion 負責——避免同一個元件因 props 而有兩種 value contract。
- `CONTEXT.md` 不動——欄位元件接線是 UI 呈現概念，不是財務領域術語。
