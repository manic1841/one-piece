# autoUpdate 收入流樣本窗過期後自動平移

當 autoUpdate=true 且來源為 IMPORTED,系統在打開退休規劃頁時檢查 calculatedFrom.startDate/endDate;若目前日期已跨過樣本窗結束日,自動將樣本窗平移到最新完整窗口並重新計算 baseAmount/totalAmount/monthlyAverage。取捨是使用者可能沒注意到數字已被靜默更新,需要 UI 明確提示。
