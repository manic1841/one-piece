# 全站表單一律以 react-hook-form 管理狀態

**日期：** 2026-09-24
**狀態：** 已接受
**規範來源：** [ui-layer-architecture.md](../ui/ui-layer-architecture.md) §4（RHF Form Controller recipe）

repo 內表單實作原本是分裂的：10 個表單中只有 `AccountForm` 用 `react-hook-form`，其餘全部是手刻 `useState` + 提交時 `Schema.parse`。兩種寫法都能運作，也都符合既有的提交路徑規則，但「同一個 repo 兩套表單心智模型」讓 review、元件重用與表單生命週期（dirty/touched/field error）無所適從。選擇點因此是：把表單慣例統一，還是維持並存。

## Considered Options

- **不表態，RHF 屬表面自由**：只補「`useForm` 收進 hook」的最小修正，不強制全站一種寫法。拒絕——這等於把「同一個 repo 兩套心智模型」制度化，未來每個新表單都要重複一次「這次用哪套」的判斷，共用元件也無法假設統一的表單狀態模型。
- **統一為手刻 hook，刪掉 RHF 與 `components/ui/form.tsx`**：依賴最少、無額外抽象。拒絕——手刻 hook 需要自行重建 field-level 驗證時機、dirty/touched、巢狀欄位與 array 欄位狀態，而這些正是 RHF 已解決的問題；重複造輪子的維護成本高於保留兩個成熟的相依套件。
- **統一為 RHF（採用）**：以 RHF 為唯一表單狀態機制，手刻表單逐一遷移。RHF 提供 field-state 生命週期與 `zodResolver` 整合，且既有提交路徑（`Schema.parse → Mapper → UseCase`）不需改變——RHF 只接管 interaction/state，資料邊界仍由 schema 把守。

## Consequences

- 全站表單共用同一套狀態模型；新的表單一律以 RHF 起步，不再有「手刻 vs RHF」的個案判斷。
- 手刻表單遷移是漸進的（feature-by-feature），過渡期間兩種寫法並存，直到遷移完成。
- 表單的 UI 元件必須與 RHF 解耦，否則「統一為 RHF」會把 RHF 的相依擴散到每一個輸入元件——這是 ADR-0065 處理的取捨。
- `CONTEXT.md` 不動——表單慣例是 UI 工程概念，不是財務領域術語。
