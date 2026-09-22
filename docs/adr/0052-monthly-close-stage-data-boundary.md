# 關帳工作流階段資料建立邊界：階段確認冪等建立該階段資料

Monthly Close 的階段模型（M1）定為八個階段：銀行帳戶餘額 → 證券買入／賣出 → Portfolio 金流 → 專案結算 → 債務還款 → Completeness Check → Financial Reports → Close Period。每個階段完成由使用者確認；確認動作＝冪等執行該階段的資料建立（已存在不重複）＋標記階段完成，輸入隨確認一次提交，不做跨階段的一鍵全部快照。具體映射：

- 銀行帳戶餘額：確認時為有輸入的帳戶建立快照（使用者輸入觀察餘額；不為未輸入的帳戶偽造零值）。
- 證券買賣：確認時批次建立全部 INVESTMENT-intent 交易（逐筆皆為獨立合法事件）。
- Portfolio 金流：確認時為有輸入的 portfolio 建立快照（帶 deposits/withdrawals），為未輸入的 portfolio 補零金流快照；補零前先查該月快照是否已存在，已存在不覆蓋。
- 專案結算：確認時執行既有 settle 流程建立專案快照。
- 債務還款：確認時逐筆走 createDebtPaymentUseCase 原子邊界（Transaction + DebtSnapshot + currentBalance 同一 Firestore transaction，ADR-0014/0015），批次內不包跨筆交易，並為當月無還款的貸款補零還款快照（零還款為推導，非事件）。冪等鍵由期間、帳戶、金額、日期衍生，重複確認不重複入帳。已建立的還款不可編輯或刪除（改金額＝新冪等鍵＝新交易，M1 不做沖銷）。

## S1 修訂（2026-09-18，engineering spec v1 對照）

階段模型由八個擴為九個：新增 `TRANSACTION_VALIDATION`（交易驗證）階段，置於銀行帳戶餘額之後。該階段是關帳時的批次驗證步驟（檢查當月交易的 intent mapping 存在、金額有效、allocation 100%、project link 有效、借貸科目有效），僅產生驗證證據、不建立任何資料；既有的寫入時驗證（ledger 邊界）維持不變。階段名不用「Ledger」（CONTEXT.md 避免詞），canonical 為交易（Transaction）。

證券買賣階段擴充為「投資與融資」輸入：除 SECURITY_BUY/SELL 外，新增 SHAREHOLDER_FINANCING（Dr asset:cash / Cr equity:capital）與 DIVIDEND_PAYOUT（Dr equity:capital / Cr asset:cash）交易建立；兩個 intent 的 mapping 與專案金流方向已在實作中，本次補關帳工作流輸入區塊。

債務還款確認粒度：UI 內完成 system calculation → user review → edit 的過程不寫入，寫入維持單一 confirm 提交 repayments 陣列（冪等鍵）。UI 預覽必須呼叫與寫入路徑相同的 domain calculator（debtPaymentCalculator.ts），不得在 UI 層自建第二條計算路徑。這不是被拒絕的兩段式寫入：資料仍只在單一 confirm 誕生，無「階段 PENDING 但資料已存在」的中間狀態。

單段式（確認即建立）優於兩段式（輸入提交與階段確認分離）：兩段式會產生「階段 PENDING 但資料已存在」的中間狀態、確認補齊邏輯可能覆蓋已提交資料、且 UI 需多處理一個子狀態；輸入驗證提前由 UI 表單 inline 檢查承擔，不需提前建資料。工作流內建立的是既有合法事件（快照與交易），關帳工作流與期間狀態本身不是財務事件（ADR-0050）。NEEDS_REVIEW 的唯一觸發來源是 Completeness Check 的零活動異常；解除＝完成該階段確認後自動回 IN_PROGRESS。現金差異維持 ADR-0020 的報表層級警告，不暫停工作流。Close Period 的唯一硬性條件是三張報表已產生（isPersisted），其餘階段順序僅為 UI 引導。UI 為專屬 `/close` 路由的單一關帳入口；月度還款集中到債務還款階段，共用 `createDebtPaymentUseCase` 的原子邊界，Transaction form 的 DEBT_PAYMENT 分頁移除。

## Considered Options

- 一鍵建立全部快照：跨階段建立資料會掩蓋單一階段的輸入錯誤，改為逐階段確認、該階段建立該階段資料，拒絕。
- 兩段式（輸入提交先建立、階段確認補齊快照）：產生「階段 PENDING 但資料已存在」的中間狀態，補齊邏輯可能覆蓋已提交資料（如 portfolio 補零覆蓋 deposits/withdrawals），UI 需多處理一個「已提交未確認」子狀態，改為單段式冪等建立，拒絕。
- 獨立 Account Reconciliation 階段：財務報表已顯示現金是否一致（ADR-0020 adjustment），獨立階段重複同一檢查，移除。
- 帳戶→LedgerCode 映射以做逐帳戶對帳：違反 ADR-0007 語意分離，且市值由使用者手動輸入的標的沒有獨立觀察來源，不構成對帳依據（見 ADR-0051），拒絕。
- 還款保留在 Transaction form 作為平行路徑：月度還款集中到關帳工作流以維持單一入口，月中臨時還款於關帳時一次輸入。

## S1 Considered Options（2026-09-18）

- 「02 Ledger」（spec v1 原案階段標籤；現行 stage 02 為 TRANSACTION_VALIDATION）改為寫入時驗證涵蓋、不新增關帳階段：驗證已在寫入邊界強制，但 UI/UX 規格要求關帳中有明確的驗證步驟與證據呈現（unresolved exceptions 路由），採用新增 TRANSACTION_VALIDATION 階段（僅驗證、不建資料），拒絕維持現狀。
- 階段命名用「Ledger」：撞 CONTEXT.md 避免詞（Transaction 為 canonical），改用 TRANSACTION_VALIDATION，拒絕。
- 股東往來標記為後續擴充、不加關帳入口：家庭場景罕見，但 UI/UX 規格明確要求關帳時能建立 FINANCING intent 交易，採用擴充投資與融資輸入，拒絕維持現狀。
- 債務還款改為每筆逐一確認寫入：動 workflow API 與 UI，且冪等鍵已保證批次安全；採用 UI 內審核 + 單一 confirm 寫入（同 calculator 預覽），拒絕。

## S2 修訂（2026-09-22，Account Balance UI/UX 對照）

銀行帳戶餘額階段（顯示名改為帳戶餘額，涵蓋現金／銀行／外幣／證券）重構為依
Account Type 分區的資料確認工作區：

- TWD 現金／銀行：前期餘額（read-only，取上月快照）＋期末餘額（editable）。
- 外幣：外幣金額＋匯率（皆 editable）＋取得匯率按鈕（共用 useExchangeRate，
  失敗時 inline 錯誤訊息、手動輸入為 fallback），TWD 價值由系統計算
  （外幣金額 × 匯率），不可做成 input。
- 證券：Holdings 表作為輸入（inline 新增／刪除／修改），市值由系統計算
  （Σ holding marketValue）；匯入上月持倉按鈕複製上月 holdings 為當月起始資料
  （無上月持倉時 disabled）。非 TWD 證券帳戶加匯率（editable）＋TWD 價值列，
  `amount = Σ holding marketValue × 匯率`（TWD 價值由 computeSectionInput 衍生）。
- 每帳戶 ○ WAITING / ✓ VERIFIED 為純 UI 衍生狀態，由階段完成狀態推導，不持久化。
- 所有必要輸入直接呈現在 Page 內（單一 Current Step 工作區），不使用 Dialog。

申請層 DTO 放寬：`AccountBalanceInput` 由 `{ accountId, amount }` 擴為加
`originalAmount?` / `exchangeRate?` / `holdings?` optional 欄位。Firestore schema、
domain schema 與既有計算語意全部不動：非 TWD `amount = 原幣金額 × 匯率`、有持倉
`amount = Σ holding marketValue`（既有 accountSnapshotEditor.vm 語意），persisted
`amount` 仍為折合 TWD 數字。UI 預覽與提交走同一條計算路徑（accountBalance.vm 的
computeSectionInput），不在 UI 層自建第二條計算。確認動作維持單段式冪等（輸入隨
確認一次提交）；inline 驗證：TWD 需期末餘額、外幣需金額＋匯率、證券允許空持倉
（未完成階段 inline 提示、完成後不顯示）。數值輸入以 `Number.parseFloat` 轉型
（同 accountSnapshotEditor.vm 的 toNumber 模式），字串不得直接寫入 number 欄位。

持倉模型修訂：從 `HoldingSchema` 移除 `quantity`，持倉以市值為記錄單位，詳見
[ADR-0060](0060-holdings-market-value-only.md)。

## S2 Considered Options（2026-09-22）

- 維持只送 `amount`：外幣換算與 Holdings 只在畫面上算給看不落庫，下個月證券沒有
  上月持倉可匯入、同一批快照因寫入來源不同而完整度不一致，拒絕。
- 另開新的確認路徑攜帶外幣／持倉資料：多一條寫入路徑寫同一批快照，拒絕。
- 持久化 per-account 狀態：動 schema 且階段級 PENDING/COMPLETED 已足夠，採用
  UI 衍生狀態，拒絕。
- 外幣與證券必要欄位放 Dialog：欄位本身是 Account Balance 階段的必要輸入資料，
  放 Dialog 會讓使用者無法在同一個 Current Step 完成確認，拒絕。
- Market Value 讓使用者另外輸入：會造成 Holdings Value ≠ Market Value 的資料
  不一致，採用系統計算，拒絕。
