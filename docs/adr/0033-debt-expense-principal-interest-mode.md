# debt_payment 支出的本金/利息計算規則

**狀態：** 已接受
**規範來源：** [debt-accounts.md](../debt-accounts.md) §6

退休試算的債務支出有「含本金」與「僅利息」兩種年支出計算方式。僅利息時必須取自 DebtSnapshot 的利息金額，不可混用本金金額，避免試算時把本金當作費用重複計算。
