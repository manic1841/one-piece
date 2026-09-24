# 退休收入流以 transactions.entries 為唯一來源

**狀態：** 已接受
**規範來源：** [retirement-system.md](../retirement-system.md) §3

避免重複維護平行收入資料。不建立獨立的收入集合，退休收入流一律由掃描 `Transaction.entries` 中的收入分錄推導。
