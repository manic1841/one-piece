# Intent 定義加入 userSelect flag

部分 intent 的借貸科目需要使用者在表單選擇具體子科目(REAL_ESTATE_BUY/SELL 選哪筆不動產、SALARY/BONUS 選哪個人的收入科目),而非 hardcode。在 intent map 加上 debitUserSelect/creditUserSelect/allowedDebitPrefix/allowedCreditPrefix,原本 hardcode 的 creditLedgerCode/debitLedgerCode 保留作為 fallback,使用者尚未建立子科目時仍可正常運作。
