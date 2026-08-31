# 財務報表由使用者手動觸發產生

月底結算需依序完成四個步驟才能產生正確報表:ProjectSnapshot(系統計算)→ AccountSnapshot(使用者手動對帳輸入)→ PortfolioSnapshot(使用者手動輸入市值)→ DebtSnapshot(系統計算)。其中 AccountSnapshot、PortfolioSnapshot 需要人工確認,自動產生可能在數字未確認前就存入錯誤快照。因此報表產生設計為手動觸發,結算頁面確認四步驟全部完成後才開放按鈕。取捨是使用者需要多一個手動操作步驟,無法完全自動化月結流程。
