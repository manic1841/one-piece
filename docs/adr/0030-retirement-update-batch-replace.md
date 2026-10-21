# updatePlan 對 incomes/expenses 採整批替換

**日期：** 2026-08-31
**狀態：** 已被 [ADR-0083](0083-projection-is-frozen-plan-is-template.md) 取代
**規範來源：** 無（本決策已由 ADR-0083 取代，原規則已移除）

若 payload 含收入或支出，以整批替換方式同步到子集合，而非逐筆 diff/patch，簡化前端表單邏輯（整份陣列送出即可）。取捨是每次更新即使只改一筆也會重寫整個子集合。

整批替換與主文件更新的原子邊界、寫入上限與併發行為見 ADR-0040。
