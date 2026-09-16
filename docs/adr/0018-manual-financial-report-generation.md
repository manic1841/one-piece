# 財務報表由使用者手動觸發產生

月底結算需依序完成四個步驟才能產生正確報表:ProjectSnapshot(系統計算)→ AccountSnapshot(使用者手動對帳輸入)→ PortfolioSnapshot(使用者手動輸入市值)→ DebtSnapshot(系統計算)。其中 AccountSnapshot、PortfolioSnapshot 需要人工確認,自動產生可能在數字未確認前就存入錯誤快照。因此報表產生設計為手動觸發,結算頁面確認四步驟全部完成後才開放按鈕。取捨是使用者需要多一個手動操作步驟,無法完全自動化月結流程。

結算準備度判斷由 `GetSettlementReadinessUseCase` 統一提供,回傳 `isReady: boolean` 作為標準決策欄位。`isReady` 仅檢查四種實體快照是否全部存在(存在性檢查),不檢查步驟順序——順序由使用者手動流程保證。所有四種實體(accounts、portfolios、debts、projects)一律以 `isActive` 過濾,非作用中實體不影響準備度判斷。

> 2026-09 修訂:導入財務期間關帳工作流,新增極簡的期間狀態紀錄(OPEN/IN_PROGRESS/NEEDS_REVIEW/CLOSED,見 ADR-0050)。本 ADR 的快照架構、就緒判定(衍生、存在性檢查、isActive 過濾)與手動輸入設計維持原樣;工作流狀態只描述關帳進度,不取代 isReady。關帳工作流的階段模型見 ADR-0052(八階段,含 Completeness Check 與 Financial Reports,無獨立的 Ledger Validation 階段);階段順序依賴僅為 UI 引導,系統不強制。
