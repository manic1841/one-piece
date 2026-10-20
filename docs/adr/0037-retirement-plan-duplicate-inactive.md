# 複製退休計畫預設為非啟用

**狀態：** 已被 [ADR-0083](0083-projection-is-frozen-plan-is-template.md) 取代
**規範來源：** 無（本決策已由 ADR-0083 取代，原規則已移除）

Duplicate 建立完整副本(含 incomes/expenses/events/summary),新計畫預設 isActive=false,避免複製動作意外覆蓋使用者當前正在使用的啟用計畫(需使用者明確再手動啟用)。
