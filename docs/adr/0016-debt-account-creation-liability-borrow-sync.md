# 建立 DebtAccount 時同步產生 LIABILITY_BORROW Transaction

**狀態：** 已接受
**規範來源：** [debt-accounts.md](../debt-accounts.md) §5

DebtAccount 的 `currentBalance` 架構上是派生值，應可從 entries 完整重算。若只建立 DebtAccount 而不產生 LIABILITY_BORROW Transaction，`currentBalance` 就成為孤立數字，無法從 entries 回算，也無法出現在資產負債表的負債欄位。為維持「Transaction 是唯一真相」，新貸款於撥款當下同時建立兩者。目前只處理新貸款情境，不處理期初餘額匯入的舊貸款。取捨是舊貸款匯入目前無標準流程，需要時再另外設計。
