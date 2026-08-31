# DebtAccount.currentBalance 為派生值

與 ProjectSnapshot(ADR-012)設計一致:分錄才是唯一真相,balance 只是加速用的 cache。currentBalance 可從原始資料完整重算——初始本金(LIABILITY_BORROW 的 credit 金額)減去所有 DEBT_PAYMENT entries 中 liability:\* 的 debit 加總。程式碼層面永遠不直接寫 currentBalance,只透過 Transaction 觸發重算,DebtSnapshot 同理可隨時從 DEBT_PAYMENT 記錄重建。取捨是每次讀取都需重算或依賴快照同步機制,與 ADR-012 面臨相同的一致性風險。
