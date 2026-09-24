# DebtAccount.currentBalance 為派生值

**狀態：** 已接受
**規範來源：** [debt-accounts.md](../debt-accounts.md) §5.7；[ddd-design-principles.md](../ddd-design-principles.md) §4

與 ProjectSnapshot(ADR-0012) 設計一致：Transaction 與 entries 才是唯一真相，`currentBalance` 只是加速讀取的 denormalized cache，可從原始資料完整重算。程式碼層面不可脱離對應的 financial source record 單獨寫入 `currentBalance` 或 `DebtSnapshot`；讀取可以使用 cache，但 cache 不得取代 source，也不得成為另一個不受 source 保護的真相。原子更新政策依 [ADR-0038](0038-command-atomicity-and-retry-policy.md)。
