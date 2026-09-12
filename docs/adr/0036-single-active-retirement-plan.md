# 同一 household 僅允許一筆 active 退休計畫

避免多筆計畫同時作為「當前試算基準」造成混淆。當任一計畫被建立或更新為 isActive=true,系統自動將同 household 其他計畫的 isActive 設為 false(setOnlyActivePlan 批次更新)。

啟用的原子維護、併發行為與「至多一筆 active、零筆合法」的精確語意見 [ADR-0040](0040-retirement-plan-atomic-writes.md)。
