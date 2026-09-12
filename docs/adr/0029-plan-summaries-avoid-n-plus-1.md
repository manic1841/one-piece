# getPlanSummaries 與 getPlan 分離

清單頁只需顯示計畫摘要,若每筆都載入完整 incomeStreams/expenseCategories 子集合會造成 N+1 查詢。getPlanSummaries 僅讀主文件供清單頁使用,getPlan/getPlans 才完整組裝子集合資料。
