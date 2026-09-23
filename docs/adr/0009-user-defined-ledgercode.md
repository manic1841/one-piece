# 開放使用者自建 LedgerCode

**狀態：** 二層自建已定案;三層碼(type:category:detail)是否開放使用者自建,目前未決。

家庭財務會隨人生階段改變,系統預設科目無法覆蓋所有情境(買房後需要 asset:property:taipei、生小孩後需要 expense:child、接案收入需要 income:freelance)。開放使用者在既有 type 下新增 category、修改 label,但 type 前綴不可變更,已有 entries 引用的 code 不可刪除或修改。取捨是需要額外規則校驗自建科目,防止使用者破壞既有分類結構。

三層碼的 domain 契約現況見 CONTEXT.md 的 LedgerCode 條目。開放自建需要額外校驗(parent 必須存在、不可與既有 code 衝突、type 前綴不可變更);不開放則預設科目加上二層自建已覆蓋目前情境,三層契約留在 domain 層不撤。此取捨的歸屬在本 ADR,討論脈絡見 issue #159。
