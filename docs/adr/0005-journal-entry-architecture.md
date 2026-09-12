# 改用分錄表(Journal Entry)架構

原本有三張分散的表(transactions、projectTransactions、plannedIncome),各自記錄不同類型的財務事件,邏輯分散、難以產生一致的報表。改用統一的分錄表架構,每筆 Transaction 底下的 entries 記錄借貸明細,報表統一從 entries 的 LedgerCode 計算,來源單一;IntentType 自動對應 entries,使用者不需手動填會計科目。取捨是單一 Transaction 結構需要涵蓋日常記帳到特殊財務事件(投資買賣、還款)的所有情境,設計複雜度集中在這一層。
