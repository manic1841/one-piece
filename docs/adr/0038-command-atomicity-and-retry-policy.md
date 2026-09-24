# Command 原子性與重試政策

**狀態：** 已接受
**規範來源：** [ddd-design-principles.md](../ddd-design-principles.md) §4

應用層 command 可能被網路重試，也可能一次更新多個 durable records。若沒有一致的分類，重試可能建立重複財務事件，或留下 source record 與快取不一致的狀態。因此把所有 command 分成四類（idempotent、deterministically retry-safe、atomic desired-state、explicitly non-repeatable），每類有固定的重試規則，並以 household operation record 把 key、payload 與結果綁在同一個原子操作中。取捨是需要為每個新 command 判定分類並維護 operation record；換取重試語意不再靠個別實作自行拿捏。

`DEBT_PAYMENT` 屬第四類，其 fingerprint v1 的欄位範圍、三種 identity（idempotency key / Firestore document ID / deterministic snapshot identity）的界線與 operation record 的欄位與行為見 [ddd-design-principles.md](../ddd-design-principles.md) §4。寬限期判斷式屬債務領域，見 [debt-accounts.md](../debt-accounts.md) §5.5。

## Revisit When

本 ADR 只建立政策，不在本票實作其他 domain。後續新增或修改以下 command 家族時，必須先標註分類並檢查是否需要 key、operation record 與同一 transaction：

- Debt payment、debt account 建立/結清與其他會新增 financial source 的債務操作
- Transaction、allocation 與 project settlement 的新增或批次更新
- Account、portfolio、project 與 retirement snapshot 的寫入/取代
- Financial report 生成、匯入/同步與備份還原等跨多集合操作

## Consequences

這個政策把「重試同一意圖」與「建立新的財務事件」分開，並將 source、快取與 operation result 的一致性責任放在同一個 application command transaction 內。
