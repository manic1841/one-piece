# deletePlan 先刪子集合再刪主文件

避免留下孤兒子集合文件(主文件刪除後,incomeStreams/expenseCategories 若未清除將無法再被查詢到但仍佔用儲存空間且無法追蹤)。刪除順序固定:先刪 incomeStreams、expenseCategories 子集合文件,再刪主文件。

子集合與主文件刪除已由 [ADR-0040](0040-retirement-plan-atomic-writes.md) 收斂為單一 transaction;原子性成立後,刪除順序不再是安全機制,本順序僅保留為歷史決策。
