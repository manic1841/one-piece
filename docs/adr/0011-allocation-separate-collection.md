# Allocation 獨立成一張表

**狀態：** 已接受
**規範來源：** [data-structure.md](../data-structure.md) §allocations；[transaction-flow.md](../transaction-flow.md)

月初收入分配屬於管理會計操作，不是真實財務事件：沒有錢真正移動，不影響資產負債表，屬於內部預算決策。實務上會計事務所也將預算分配與總帳分錄分開處理。獨立成表換取分配明細清楚、可修改比例或重新分配而不影響財務分錄、Transaction 保持乾淨只記會計事件。取捨是多一張表要維護，查詢時多一層概念上的關聯。
