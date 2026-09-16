# 關帳工作流階段確認建立該階段資料，工作流本身不是財務事件

Monthly Close 的階段模型（M1）定為八個階段：銀行帳戶餘額 → 證券買入／賣出 → Portfolio 金流 → 專案結算 → 債務還款 → Completeness Check → Financial Reports → Close Period。每個階段完成由使用者確認；確認動作＝執行該階段的資料建立（冪等，已存在不重複）＋標記階段完成，不做跨階段的一鍵全部快照。工作流內建立的是既有合法事件（快照與交易），關帳工作流與期間狀態本身不是財務事件（ADR-0050）。NEEDS_REVIEW 的唯一觸發來源是 Completeness Check 的零活動異常；解除＝完成該階段確認後自動回 IN_PROGRESS。現金差異維持 ADR-0020 的報表層級警告，不暫停工作流。Close Period 的唯一硬性條件是三張報表已產生（isPersisted），其餘階段順序僅為 UI 引導。UI 為專屬 `/close` 路由的單一關帳入口；月度還款集中到債務還款階段，共用 `createDebtPaymentUseCase` 的原子邊界（Transaction + DebtSnapshot + currentBalance 同一 Firestore transaction），Transaction form 的 DEBT_PAYMENT 分頁移除。

## Considered Options

- 一鍵建立全部快照：跨階段建立資料會掩蓋單一階段的輸入錯誤，改為逐階段確認、該階段建立該階段資料，拒絕。
- 獨立 Account Reconciliation 階段：財務報表已顯示現金是否一致（ADR-0020 adjustment），獨立階段重複同一檢查，移除。
- 帳戶→LedgerCode 映射以做逐帳戶對帳：違反 ADR-0007 語意分離，且市值由使用者手動輸入的標的沒有獨立觀察來源，不構成對帳依據（見 ADR-0051），拒絕。
- 還款保留在 Transaction form 作為平行路徑：月度還款集中到關帳工作流以維持單一入口，月中臨時還款於關帳時一次輸入。
