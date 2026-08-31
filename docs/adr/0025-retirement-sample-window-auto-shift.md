# autoUpdate 收入流樣本年度過期後提示批次更新

當收入流的 `importedFrom=transactionEntries`、`incomeCalculationMode=IMPORTED`、`autoUpdate=true`，且 `calculatedFrom.sampleYear < lastFullYear` 時，系統在開啟退休規劃頁面時將其視為過期資料。

系統顯示過期筆數與目標年度的提示，使用者確認後才批次重新計算所有過期收入流，更新 `baseAmount`、`totalAmount`、`monthlyAverage`、`sampleCount`、`sampleYear` 與 `importedAt`。若目標年度沒有該科目的分錄，保留原 `baseAmount` 並記錄警告；`autoUpdate=false` 的收入流不自動納入批次更新。

樣本年度以 `sampleYear` 表示，不使用 `calculatedFrom.startDate/endDate` 作為自動更新判斷。這保留使用者對重大金額變動的確認權，也避免資料在未察覺的情況下靜默改變。
