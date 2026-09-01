# DebtAccount.currentBalance 為派生值

與 ProjectSnapshot(ADR-0012)設計一致：Transaction 與 entries 才是唯一真相，
`currentBalance` 只是加速讀取的 denormalized cache。currentBalance 可從原始資料
完整重算：初始本金（`LIABILITY_BORROW` 的 credit 金額）減去所有
`DEBT_PAYMENT` entries 中 liability code 的 debit 加總；`DebtSnapshot` 同理可由
`DEBT_PAYMENT` 記錄重建。

程式碼層面不可脫離對應的 financial source record 單獨寫入
`currentBalance` 或 `DebtSnapshot`。建立一筆 `DEBT_PAYMENT` 時，Transaction、
該月份 DebtSnapshot 與 DebtAccount.currentBalance 必須在同一個 Firestore
transaction 內提交；任一步驟失敗或 optimistic-concurrency conflict，全部寫入
一起 rollback。讀取可以使用 cache，但 cache 不得取代 source，也不得成為另一個
不受 source 保護的真相。這個原子更新政策依 [ADR-0038](0038-command-atomicity-and-retry-policy.md)。
