# 保留 ProjectSnapshot 作為可重算快照

理論上可以從所有 Transaction + Allocation 即時計算專案餘額,但 Firestore 不擅長大量 aggregate,資料越多越慢。保留 Snapshot 作為加速用的 cache,分錄才是唯一真相,快照可隨時從原始資料重算,程式碼層面永遠不直接寫快照,只寫 Transaction / Allocation。取捨是多一份衍生資料需要維護,若計算邏輯與快照產生邏輯不同步,會出現快照與實際不一致的風險。
