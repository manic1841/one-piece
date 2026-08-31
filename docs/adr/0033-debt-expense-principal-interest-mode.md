# debt_payment 支出的本金/利息計算規則

includesPrincipal=true 時年支出用 monthlyPayment × 12;interestOnly=true 時年支出用 DebtSnapshot 的 interestPaid 年化值,且必須來自 DebtSnapshot,不可混用本金金額,避免試算時把本金當作费用重複計算。
