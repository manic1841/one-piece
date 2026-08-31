# 採用 Firebase(Firestore + Auth)作為後端

使用者是家庭成員(2-4人),資料量小、不需複雜查詢,但需要跨裝置即時同步與內建認證。採用 Firebase(Firestore + Authentication)作為唯一後端服務,換取免費額度、即時同步、內建登入,不需自建或維護伺服器。取捨是 Firestore 複雜查詢(多條件聚合、join)能力較弱,但目前用不到。
