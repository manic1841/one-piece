# 寬限期狀態不存欄位,動態推算

寬限期狀態是日期的函數，不存一個會自行過期的 boolean。對付款、試算與 UI
狀態使用同一個嚴格規則：

```text
startDate <= paymentDate && paymentDate < graceEndDate
```

`graceEndDate` 為 null/未設定表示無寬限期；起始日包含，結束日不包含，所以付款
日等於 `graceEndDate` 時必須走正常還款。寬限期內的 ordinary `DEBT_PAYMENT`
只能記錄 interest-only，principal 必須為 0；若付款高於適用利息則拒絕，不得
默認提前償還本金。低於適用利息的正付款可以記錄為利息並附 warning，但分錄仍
須以實際付款金額平衡。完整的 command 原子性與 cache 同步政策見
[ADR-0038](0038-command-atomicity-and-retry-policy.md)。

取捨是每次讀取或建立付款都要多一步計算，但避免了資料庫狀態過期與寬限期
邊界不一致的風險。
