# 退休收入流以 transactions.entries 為唯一來源

避免重複維護平行收入資料。不建立獨立 plannedIncome 集合,收入流一律由掃描 Transaction.entries 中 income:\* 前綴的分錄推導。
