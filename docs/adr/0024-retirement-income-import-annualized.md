# 收入匯入固定採最近 12 個月年化計算

匯入步驟:查詢最近 12 個月 transactions → 展開 entries → 篩選 income: 開頭的 ledgerCode → 依 ledgerCode 分組加總 (credit - debit) → 年化。只統計 income:\* 科目,避免資產/負債分錄誤算成收入;用 credit − debit 避免方向顛倒。
