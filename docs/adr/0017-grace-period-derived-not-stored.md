# 寬限期狀態不存欄位,動態推算

寬限期狀態是時間的函數,任何時間點都可以從 graceEndDate 動態推算:isInGracePeriod = graceEndDate != null && today < graceEndDate。存一個會隨時間自動過期的 boolean 欄位,會造成資料與現實不同步的風險(例如忘記排程更新)。前端動態計算即可,不需要額外維護這個狀態欄位。取捨是每次讀取都要多一步計算,但避免了「資料庫存的值已經過期」這類更難排查的錯誤。
