# 資產負債表欄位項直接記錄明細科目，不設第二層父列

**日期：** 2026-10-01
**狀態：** 已實作
**規範來源：** [financial_report.md](../financial_report.md) §2「呈現結構」

資產負債表的 group（`assets.groups.property`、`equity.groups.capital`）本身就是 roll-up 層：group 名即類別、`total` 已加總，`items` 直接記錄明細科目（如 `asset:property:taipei`），不再巢狀出 `asset:property` 父列——那列與 group 同名同金額，是純冗餘的第二層。直接記在 bare 科目（`asset:property`、`equity:capital` 本身）的餘額是真實流程（REAL_ESTATE_BUY 預設借 `asset:property`、資本注入記 `equity:capital`），以獨立平列呈現。此規則與 ADR-0069 的 roll-up（損益／現金流的父科目成列、明細巢狀）不衝突：那裡的父科目層承擔加總語意，這裡的 group 層已承擔。

## Considered Options

- 維持父列 + subItems：否決，group 已是 roll-up，父列重複呈現同一金額，且 Report 頁面（平列渲染）根本看不到 subItems。

## Consequences

- Report Drift 對 roll-up 時期 persisted 報表（父列 + subItems）先還原成平列（父列金額減明細加總的餘額還原為 bare 科目列）再比對，切換期間不出現假警示。
- 既有 persisted 報表不需遷移：schema 的 `subItems` 欄位保留（損益／現金流仍用），舊資產負債表靠 drift 正規化讀取。

## Revisit When

不動產需要第三層（`asset:property:<house>:<room>`）時，此規則與標籤組成需要重新設計。
