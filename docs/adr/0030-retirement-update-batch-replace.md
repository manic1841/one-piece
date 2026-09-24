# updatePlan 對 incomes/expenses 採整批替換

**狀態：** 已接受
**規範來源：** [retirement-system.md](../retirement-system.md) §5

若 payload 含收入或支出，以整批替換方式同步到子集合，而非逐筆 diff/patch，簡化前端表單邏輯（整份陣列送出即可）。取捨是每次更新即使只改一筆也會重寫整個子集合。

整批替換與主文件更新的原子邊界、寫入上限與併發行為見 ADR-0040。
