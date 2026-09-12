# Account 與 LedgerCode 命名區別

兩個概念容易混淆,系統中需要明確區分。Account 是真實金融帳戶(玉山銀行、永豐證券),對應現實世界的帳戶;LedgerCode 是會計科目代碼(asset:cash、income:salary),屬於會計分類標籤。LedgerCode 分兩層維護:系統預設 hardcode 在前端,使用者自建的存 Firestore,格式為 {type}:{category}:{subcategory?},type 前綴不可修改。取捨是使用者需要理解兩套不同語意的識別碼,增加一點學習成本,但換取財務會計與實體帳戶對帳邏輯的清晰分離。
