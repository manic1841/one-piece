# 固定資產與收入科目採用子科目,而非 Snapshot

不動產、薪資、獎金等需要細分來源的科目,適用情境是價格不頻繁變動、以帳面成本為準、需要按來源細分報表,因此採用 LedgerCode 子科目方式處理(如 asset:property:taipei、income:salary:charles),不需要每月建立 Snapshot,買入/賣出或收入各記一筆 entry 即可,損益表的 subItems 可自動按子科目分組顯示。此設計與 Snapshot 制(銀行帳戶、投資市值)互補,兩者不衝突,分別對應「以帳面成本為準」與「需人工對帳確認市值」兩種不同性質的資產。
