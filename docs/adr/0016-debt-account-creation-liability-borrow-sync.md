# 建立 DebtAccount 時同步產生 LIABILITY_BORROW Transaction

DebtAccount 的 currentBalance 架構上是派生值(ADR-015),應可從 entries 完整重算。若只建立 DebtAccount 而不產生 LIABILITY_BORROW Transaction,currentBalance 就成為孤立數字,無法從 entries 回算,也無法出現在資產負債表的負債欄位。為維持「Transaction 是唯一真相」的原則,新貸款於撥款當下同時建立 DebtAccount 與 LIABILITY_BORROW(Firestore batch write,原子操作,失敗則一併 rollback)。本系統目前只處理新貸款情境(建立系統後才借的貸款),不處理期初餘額匯入的舊貸款;若未來有此需求,可用特殊標注的 LIABILITY_BORROW(date 填系統啟用日)處理。取捨是舊貸款匯入目前無標準流程,需要時再另外設計。
