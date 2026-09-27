# 舊版單次事件欄位向後相容

**狀態：** 已接受
**規範來源：** [retirement-system.md](../retirement-system.md) §2.4

舊版 year+amount 單次事件欄位仍可讀取,系統視為單段 FIXED phase(startYear=endYear=year),不強制既有資料遷移,新舊資料格式並存。取捨是讀取層需要一條相容路徑,但避免了一次不可回復的資料遷移。
