# 關帳工作流階段資料建立邊界：階段確認冪等建立該階段資料

**狀態：** 已接受
**規範來源：** [monthly-close.md](../monthly-close.md)；[ui/visual-standards.md](../ui/visual-standards.md) §帳戶餘額階段排版

Monthly Close 以階段表達關帳進度，每個階段完成由使用者確認；確認動作＝冪等執行該階段的資料建立（已存在不重複）＋標記階段完成，輸入隨確認一次提交，不做跨階段的一鍵全部快照。取捨是使用者在每個階段都要按一次確認，比一鍵慢；但單一階段的輸入錯誤不會被跨階段的大量寫入掩蓋，且每個階段的冪等鍵讓重複確認安全。

單段式（確認即建立）優於兩段式（輸入提交與階段確認分離）：兩段式會產生「階段 PENDING 但資料已存在」的中間狀態，確認補齊邏輯可能覆蓋已提交資料（如 portfolio 補零覆蓋 deposits/withdrawals），且 UI 需多處理一個子狀態。輸入驗證提前由 UI 表單 inline 檢查承擔，不需提前建資料。工作流內建立的是既有合法事件（快照與交易），關帳工作流與期間狀態本身不是財務事件（[ADR-0050](0050-financial-period-workflow-state.md)）。

## Considered Options

- 一鍵建立全部快照：跨階段建立資料會掩蓋單一階段的輸入錯誤，改為逐階段確認、該階段建立該階段資料，拒絕。
- 兩段式（輸入提交先建立、階段確認補齊快照）：產生「階段 PENDING 但資料已存在」的中間狀態，補齊邏輯可能覆蓋已提交資料（如 portfolio 補零覆蓋 deposits/withdrawals），UI 需多處理一個「已提交未確認」子狀態，改為單段式冪等建立，拒絕。
- 獨立 Account Reconciliation 階段：財務報表已顯示現金是否一致（ADR-0020 adjustment），獨立階段重複同一檢查，移除。
- 帳戶→LedgerCode 映射以做逐帳戶對帳：違反 ADR-0007 語意分離，且市值由使用者手動輸入的標的沒有獨立觀察來源，不構成對帳依據（見 ADR-0051），拒絕。
- 還款保留在 Transaction form 作為平行路徑：月度還款集中到關帳工作流以維持單一入口，月中臨時還款於關帳時一次輸入。

### S1（2026-09-18）

- 「02 Ledger」（原案階段標籤；現行 stage 02 為 TRANSACTION_VALIDATION）改為寫入時驗證涵蓋、不新增關帳階段：驗證已在寫入邊界強制，但 UI/UX 要求關帳中有明確的驗證步驟與證據呈現（unresolved exceptions 路由），採用新增 TRANSACTION_VALIDATION 階段（僅驗證、不建資料），拒絕維持現狀。
- 階段命名用「Ledger」：撞 CONTEXT.md 避免詞（Transaction 為 canonical），改用 TRANSACTION_VALIDATION，拒絕。
- 股東往來標記為後續擴充、不加關帳入口：家庭場景罕見，但 UI/UX 規格明確要求關帳時能建立 FINANCING intent 交易，採用擴充投資與融資輸入，拒絕維持現狀。
- 債務還款改為每筆逐一確認寫入：動 workflow API 與 UI，且冪等鍵已保證批次安全；採用 UI 內審核 + 單一 confirm 寫入（同 calculator 預覽），拒絕。

### S2 與 S3 Considered Options（2026-09-22 ~ 09-23）

Account Balance 階段重構為依 Account Type 分區的資料確認工作區（現金／銀行／外幣／證券），所有必要輸入直接呈現在 Page 內，不使用 Dialog；缺漏輸入不做 inline 必填提示而由 WAITING glyph 承擔；「取得匯率」按鈕移入 Account 欄。排版與文字層級見 [ui/visual-standards.md](../ui/visual-standards.md) §帳戶餘額階段排版。

- 保留 inline 必填提示：WAITING glyph 已表達缺漏狀態，雙重提示多餘，且與本階段
  的安靜排版方向相違，移除，拒絕保留。
- 缺漏輸入時阻擋確認按鈕：違反單段式冪等確認的提交邊界（確認時不為未輸入帳戶
  偽造零值，但不阻擋使用者對已輸入部分先行確認），拒絕。
- 現金／銀行維持 grid＋每列重複欄位標籤：共用表頭才是 thead 底線貫穿效果的唯一
  重現方式（grid 做不到），拒絕。
- 期間顯示合併進 `YearMonthPicker`（readonly mode）：picker 為全站共用元件
  （9 個呼叫點），行為已寫入 design-system；只為月度關帳加展示模式會讓全部呼叫點
  共同承擔單一頁面需求，改以獨立 `PeriodBadge` 展示元件承擔，拒絕合併。
- 維持只送 `amount`：外幣換算與 Holdings 只在畫面上算給看不落庫，下個月證券沒有
  上月持倉可匯入、同一批快照因寫入來源不同而完整度不一致，拒絕。
- 另開新的確認路徑攜帶外幣／持倉資料：多一條寫入路徑寫同一批快照，拒絕。
- 持久化 per-account 狀態：動 schema 且階段級 PENDING/COMPLETED 已足夠，採用
  UI 衍生狀態，拒絕。
- 外幣與證券必要欄位放 Dialog：欄位本身是 Account Balance 階段的必要輸入資料，
  放 Dialog 會讓使用者無法在同一個 Current Step 完成確認，拒絕。
- Market Value 讓使用者另外輸入：會造成 Holdings Value ≠ Market Value 的資料
  不一致，採用系統計算，拒絕。

持倉模型修訂：從 `HoldingSchema` 移除 `quantity`，持倉以市值為記錄單位，詳見
[ADR-0060](0060-holdings-market-value-only.md)。
