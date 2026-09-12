# 收入匯入固定採上一個完整年度年化計算

退休收入匯入固定使用上一個完整年度：`lastFullYear = 當前年份 - 1`。系統查詢該年度的 transactions，展開 entries，篩選 `income:` 開頭的 `ledgerCode`，再依科目分組加總 `(credit - debit)`，產生年化收入資料。

匯入結果以 `sampleYear` 記錄來源年度，並以 `totalAmount / 12` 計算 `monthlyAverage`。只統計 `income:*` 科目，避免將資產或負債分錄誤算為收入；使用 `credit - debit` 則可維持收入方向正確。
