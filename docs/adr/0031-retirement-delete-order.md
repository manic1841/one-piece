# deletePlan 先刪子集合再刪主文件

避免留下孤兒子集合文件(主文件刪除後,incomeStreams/expenseCategories 若未清除將無法再被查詢到但仍佔用儲存空間且無法追蹤)。刪除順序固定:先刪 incomeStreams、expenseCategories 子集合文件,再刪主文件。
