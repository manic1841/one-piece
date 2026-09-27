# 債務還款匯入保留 N+1 快照查詢

**狀態：** 已接受
**規範來源：** [retirement-system.md](../retirement-system.md) §4

退休債務還款匯入對每個 active DebtAccount 各執行一次 `DebtSnapshot` 查詢（N+1 pattern）。這是刻意的：家庭 active 債務帳戶數量預期為個位數（房貸、車貸等），N+1 在 N<10 時效能成本可忽略，而改為分組查詢會增加程式複雜度且無實際收益。若未來出現兩位數 active 帳戶的家庭，應重新評估是否改為 grouped query。
