# updatePlan 對 incomes/expenses 採整批替換

若 payload 含 incomes 或 expenses,以整批替換方式同步到子集合,而非逐筆 diff/patch,簡化前端表單邏輯(整份陣列送出即可),取捨是每次更新即使只改一筆也會重寫整個子集合。
