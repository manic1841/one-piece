# 月度關帳 (Monthly Close)

本文件說明月度關帳工作流的現況：期間狀態、階段模型、每個階段的資料建立邊界，以及關帳的完成條件。

本文件亦**擁有月度關帳工作流的呈現決定**——單一階段專屬的版面與互動選擇住在對應階段的小節。跨頁可複用的視覺契約屬 [`ui/visual-standards.md`](ui/visual-standards.md)，設計 token 與元件表面屬 [`ui/design-system.md`](ui/design-system.md)；三者權威不重疊。

詞彙定義見 [`CONTEXT.md`](../CONTEXT.md)（Monthly Close、Financial Period、Transaction Validation、Completeness Check、Watch List）；決策理由見 ADR-0050、ADR-0052、ADR-0053、ADR-0066、ADR-0070、ADR-0072、ADR-0073。

## 1. 入口

關帳有兩條路由，都在受保護的 Layout 內：

| 路徑                | 畫面                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `/close`            | 選擇關帳期間：選擇 `YYYY-MM`，按「開始關帳」寫入期間狀態後進入工作區 |
| `/close/:yearMonth` | 該期間的關帳工作區（pipeline + 階段）                                |

URL 有效 ⟺ 該期間已有狀態紀錄。`yearMonth` 形狀不合法、或該期間尚未開始關帳，一律回 `/close`；期間讀取失敗不是「尚未開始」，顯示錯誤而非回覆原路徑。切換期間不殘留前一期間的已載入值、草稿與階段檢視。重新開啟只作用在已關帳（含連鎖降級）期間，且只有工作區提供入口。

當月的債務還款集中到關帳的債務還款階段，交易表單不再提供獨立的還款分頁。

## 2. 期間狀態

財務期間狀態是**唯一持久化的關帳工作流狀態**，鍵為既有的 `YYYY-MM` 財務期間。它只描述關帳進度，不複製任何快照資料。

| 狀態           | 意義                                                                                                                                                                                                                                                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IN_PROGRESS`  | 階段推進中                                                                                                                                                                                                                                                                                                                                               |
| `NEEDS_REVIEW` | 待使用者確認，工作流暫停。兩種來源：Completeness Check 的零活動異常（`reviewSourceStageId = COMPLETENESS_CHECK`），或前期關帳被重新開啟的連鎖降級（`reviewSourceStageId = null`）                                                                                                                                                                        |
| `CLOSED`       | 該期間的報表已產生且狀態已定案。工作區以**唯讀模式**呈現（spec [#207](https://github.com/manic1841/one-piece/issues/207)）：預設渲染 Close Period 的關帳總結（定案紀錄），pipeline 的每個階段皆可點擊回看，所有輸入停用、確認／新增／刪除等動作鈕隱藏，證券買入／賣出的 add-edit drawer 入口（新增按鈕與整列點擊）完全隱藏；只有重開（reopen）能解除唯讀 |

- 沒有狀態紀錄代表該期間**尚未開始關帳**，不代表期間不存在。
- 狀態紀錄在開始關帳時誕生。
- 就緒判定（`isReady`）仍是衍生計算，只檢查四種實體快照是否全部存在；工作流狀態與它並存、不互斥，也不取代它。
- Completeness Check 的零活動異常會暫停工作流；使用者按行走順序逐階段確認，確認 review 來源階段（Completeness Check）時暫停清除，回到 `IN_PROGRESS`，Financial Reports 與 Close Period 重設為 `PENDING`（報表需重新產生）。
- **暫停即強制順序恢復（ADR-0070）**：`NEEDS_REVIEW` 期間瀏覽自由（pipeline 點擊、階段跳轉皆可用），但**確認**只能作用在行走位置——`CLOSE_STAGE_IDS` 順序中第一個非 `COMPLETED` 的階段；對其他階段確認拋 `STAGE_NOT_WALK_POSITION`。暫停只在行走終點清除：Completeness Check 暫停以確認 review 來源階段清除；連鎖降級維持 `NEEDS_REVIEW` 直到重新關帳（`CLOSED`）。
- **重新開啟（reopen）**：已關帳期間可透過確認視窗重新開啟，狀態改回 `IN_PROGRESS`，Financial Reports 與 Close Period 重設為 `PENDING`（報表重新產生、重新關帳），其他已完成階段保留；連鎖降級的期間走同一條重開路徑，但重開後**全部八個階段**重設為 `PENDING` 且狀態維持 `NEEDS_REVIEW`（恢復是完整的順序行走）。重開後 Dashboard 錨定的「最近已關帳月份」暫時退回上一個已關帳月份。
- **連鎖降級（reopen cascade）**：重開某期間時，該期間之後所有 `CLOSED` 期間自動改為 `NEEDS_REVIEW`（`reviewSourceStageId = null`），因為它們的定案可能基於修正前的歷史；`IN_PROGRESS` 與尚未開始關帳的期間不受影響。被降級的期間**不會**在前月重新關帳後自動回復，恢復必須由使用者逐期手動重開。辨識記號是 `reviewSourceStageId = null`（Completeness Check 的暫停一定帶 `COMPLETENESS_CHECK`），不需要新 schema 值。
- 現金差異維持報表層級的警告（見 [`financial_report.md`](financial_report.md)），**不暫停**工作流。

## 3. 階段模型

八個階段，依顯示名稱與順序：

1. 帳戶餘額
2. 證券買入／賣出
3. Portfolio 金流
4. 專案結算
5. 債務還款
6. Completeness Check
7. Financial Reports
8. Close Period

交易驗證（[CONTEXT.md](../CONTEXT.md)）不是獨立階段：批次檢查的結果由 Completeness Check 階段載入，併入該階段（Completeness Check）的就緒狀態與例外清單（見下）。

規則：

- 每個階段完成由**使用者確認**；系統的檢查結果只是證據。
- **確認動作 = 冪等執行該階段的資料建立（已存在則不重複）+ 標記階段完成**。輸入隨確認一次提交，不做跨階段的一鍵全部快照。可重確認的階段（帳戶餘額、證券買入／賣出、Portfolio 金流、債務還款）重複確認走同鍵冪等覆蓋，不產生重複文件。
- **證券買入／賣出允許空紀錄確認**：兩個 table 皆為空時，UI 在提交前跳出警告（可仍選擇確認），系統不阻擋——空確認即冪等寫入零列，階段照常完成。
- **專案結算是無輸入、僅證據的工作區階段**：證據區列出每個 active 專案的結算狀態；確認動作 = 執行結算流程建立專案快照。
- **Completeness Check 是報表產生前的就緒檢查**：呈現五類檢查（帳戶餘額、證券買入／賣出、Portfolio 金流、專案結算、債務還款）的完成度與例外清單，交易驗證問題一併列入就緒狀態與例外清單；**只呈現就緒狀態，不呈現任何財務數字**（財務結果屬 Close Period，報表內容屬 Financial Reports）。就緒與否由確認按鈕的 disabled 狀態硬性表達，例外項目附「GO TO ○○ →」階段跳轉導回對應階段修正——交易驗證問題沒有工作區內的落點，僅列文字不附跳轉。零活動警示列為例外但不阻擋——暫停機制（NEEDS REVIEW）才是它的處理路徑。
- **暫停期間的 GO TO 是重設語意（ADR-0070）**：`NEEDS_REVIEW` 期間點擊 GO TO 階段跳轉會先跳出確認對話框（該步驟之後重新進入待確認、報表需重新產生），確認後該階段（含）之後全部重設為 `PENDING`，前期完成階段保留，狀態維持 `NEEDS_REVIEW`。
- **Financial Reports 預覽後產生**：預覽報表 → 確認 → 產生；**Generate 按鈕在結算未就緒時 disabled 作為第二道防線**（就緒狀態跨讀 COMPLETENESS_CHECK stage hook，不自行重載；未就緒的類別名稱不在此重複列出，那屬 Completeness Check 的呈現）。三張表是**沒有欄名標題列的單表**，列樣式依**財務報表語意階層**（Section → Group → Detail → Deep detail → Subtotal → Terminus；見 [`ui/visual-standards.md`](ui/visual-standards.md) 的同名節）：Section 是各表一級區塊（損益表：收入／支出；資產負債表：資產／負債／權益；現金流量表：營業活動／投資活動／融資活動），資料縮排、可摺疊、預設展開、chevron 在標籤左側、金額一律靠表格最右。每個 Section 有自己的 Subtotal，整表最後一列為 **Terminus**，作為頁面的視覺終點；現金流量的「實際餘額」為表下的 muted 註腳，不與現金淨變動等重。摺疊狀態跨分頁切換不保留（切回一律重置為展開）。
- **Financial Reports 的確認即產生（#222）**：確認一律以現行 preview 重算並覆寫三張 persisted 報表，階段轉 `COMPLETED`。persisted 已存在但階段仍 `PENDING` 時（monthly close 上線前的 legacy 期間，或 reopen 後保留的檔案）Generate 按鈕照常提供，畫面以警告標示既有報表與其產生時間；「已產生」狀態與確認鈕的可見性由**階段完成度**驅動，不是 persisted 是否存在。`COMPLETED` 時隱藏確認鈕（FINANCIAL_REPORTS 非可重確認階段），`CLOSED` 期間所有階段皆 `COMPLETED`，唯讀回看不因此出現確認操作。
- **關帳前把關 Report Drift（ADR-0073）**：Financial Reports 三張報表只要有任何 drift（涵蓋畫面所有警示列與警示 cell，含僅子列增減的 `RESTRUCTURED` 列），關帳確認鈕即 disabled；同一位置以警示區塊說明報表與已產生報表不一致並提供「回到 Financial Reports」捷徑，漂移未清除前關不掉帳。警示**只表達有漂移、不報項數**（判定涵蓋推導值與畫面未繪製的項，任何計數都對不上使用者能數到的警示，理由見 ADR-0073）。判定不依賴 Close Period 的五個聚合數字——聚合相等時子列仍可能漂移。後端關帳就緒檢查不變，仍只驗「Financial Reports 已確認 + 三張 persisted 存在」。
- **Close Period 總結後正式關帳**：呈現整個 Monthly Close 的關帳活動列、財務結果（完整數字，取自 FINANCIAL_REPORTS stage 自載的即時 preview bundle）與報表清單；關帳需經一個確認對話框，說明重開的後果（其後已關帳期間轉為 NEEDS REVIEW、恢復須逐期手動）。關帳後總結固定為唯讀的定案紀錄。
- **`CLOSED` 期間的瀏覽規則（spec [#207](https://github.com/manic1841/one-piece/issues/207)）**：已關帳期間沒有行走位置，`displayedStageId` 預設為 `CLOSE_PERIOD`（渲染 Close Period 唯讀總結），使用者可從 pipeline 點擊任一階段回看其定案內容。唯讀語意：輸入欄位 disabled（含證券持倉與匯率）、chrome 的確認 bar、readiness/close 的確認鈕、新增／刪除動作鈕全部**隱藏**（非 disabled），add-edit drawer 因此不可達。回看進度（pipeline 的 position text）跟隨使用者檢視的階段，而非固定在行走位置。
- 階段順序依賴在非暫停期間**僅為 UI 引導**，系統不強制；`NEEDS_REVIEW` 期間確認順序由行走規則強制（見 §2）。硬性條件有二：**Close Period 需要 Financial Reports 階段已確認且三張報表已產生**，以及**帳戶餘額階段不可空確認**（無任何輸入時以 `STAGE_INPUT_REQUIRED` 拒絕，見 §5）。
- 建立的是既有合法事件（快照與交易）；關帳工作流與期間狀態本身不是財務事件。

### UI 組構：大一統步驟 registry

- **`useCloseStepRegistry` 是唯一列出全部八個步驟定義的檔案，也是唯一允許跨階段讀取的地方**：八個 step hooks 在 hook 內無條件呼叫（rules of hooks 不依賴條件分派；載入受期間存在閘門，見 §「載入扇出與量測」），回傳 `Record<CloseStageId, CloseStepDefinition>`，TypeScript 強制每個階段都有條目。新增步驟 = 一個 step hook + 一個 registry 條目。
- **`CloseStepDefinition` 條目 = control + content factory + evidence builder**：`control` 是該階段的 stage controller（`closeStageControl` 契約，頁面只對契約分派：`buildRequest` / `confirmGate` / `afterConfirm` / `refresh` / `keepsViewOnConfirm`）；`render(ctx)` 是 content factory，從 registry 內的 stage hook 閉包直讀該階段資料（draft、prefill、drawer、summary VM），把頁面傳入的 chrome／navigation／entities context 映射到 step 元件的窄 props，資料未載入時回傳 `null`；`evidence()` 是零參數閉包，從擁有該資料的 stage hook 建構該階段證據。**證據是判別聯合**：一個階段只帶一種證據形狀，渲染端對形狀窮舉——新增一種證據而沒接上畫面是編譯錯誤，不是靜默遺漏。
- **每個階段自載 evidence**：證據型階段也擁有自己的載入——`COMPLETENESS_CHECK` stage hook 同時擁有 `checkSettlementCompletenessUseCase`（anomalies）、`getSettlementReadinessUseCase`（readiness）與 `validateMonthTransactionsUseCase`（交易驗證 issues，一次呼叫供給 Completeness Check 的呈現）。hook 以 `control.refresh` opt-in 重載，page 不再持有任何 evidence 載入或 `refreshStageEvidence`。載入走 `useStageLoader`（組合 `useLoadingTask`，見下）：失敗時該階段顯示自己的罐頭錯誤訊息（`CloseStageLoadError`），不靜默留白——留白與「本月乾淨」在畫面上無法區分。
- **registry 為唯一跨階段讀取點**：`CLOSE_PERIOD` 的 evidence 與 `COMPLETENESS_CHECK`／`CLOSE_PERIOD` 的 summary VM 都在 registry 內跨讀其他 stage hook（`useCloseSummaryVM` 在八個 stage hooks 之後呼叫）；**報表資料（即時 preview bundle、persisted bundle）與持久化旗標全由 `FINANCIAL_REPORTS` stage 擁有**（#228）——三者出自同一次載入，不會先後落地而互相矛盾；`CLOSE_PERIOD` 沒有自己的 stage hook（無草稿階段走 no-op control），它的 evidence 讀 `FINANCIAL_REPORTS` 的持久化旗標，Close Period 的五個財務數字與 Financial Reports 的調整項證據都讀同一份 preview bundle。`FINANCIAL_REPORTS` 的 Generate 守門另外跨讀 `COMPLETENESS_CHECK` 的 readiness。preview 不受持久化 gating：一律載入當前分錄重算的即時預覽，關帳畫面永遠顯示即時數字，persisted 只當狀態旗標（`CLOSED` 期間唯一例外，見 Report Drift）。step hook 之間不互相引用。
- **preview 只有一份（#228）**：`FINANCIAL_REPORTS` 載入的 preview **帶** household 自訂標籤（Financial Reports 表格的顯示標籤，且該 resolver 隨確認送進產生路徑凍結進 persisted），同一份 bundle 也供 Close Period 的五個財務數字與 Financial Reports 的調整項證據使用；早期由 `CLOSE_PERIOD` 另載一份不帶標籤的 preview 的做法已移除——兩份只是同一次載入的兩種包裝，合併後數字不可能分岐。
- **消費邊界**：page hook（`useMonthlyClosePage`）讀 registry 做「確認提交路徑」；page 元件只渲染 `registry[displayedStageId].render(stageContext)`，不再認得任何 step 的內部，也不出現任何 stage ID 或 stage control 存取。`CloseStepContext` 只帶三類資料：**chrome**（step/progress/confirmed 文字、confirming、isConfirmable/isReadOnly/isReviewing）、**導覽指令**（onConfirm/onGoToStage/onContinue/onBack；render 只為 `displayedStage` 執行，因此每個 stage 的確認都走同一個 `onConfirm`）、**共享實體**（accounts/portfolios；projects 只需要 `{id, name}`，由 `useCloseStepRegistry` 的 args 傳入，不經 context）。workflow 只把 page VM 與共享實體傳入 registry；單階段資料（draft、prefill、drawer、evidence、報表持久化與 bundle）留在 step hook 內、由 registry 閉包直讀。證券買入／賣出的 add-edit drawer 是 step 自有內容，由 SECURITIES_TRADE 條目的 content factory 呼叫 `securitiesTradeStage.drawer.open` 一併渲染，不從 page 掛載。
- **單一刷新入口**：`closeStageControl` 的選用方法 `refresh()`（由 `useStageLoader` 提供）是唯一的外部重載介面，page hook 提供單一 `refreshAll`（所有 opt-in 的 stage refresh），在 confirm、reopen、go-to-with-reset 後呼叫，因此沒有任何呼叫點需要知道哪個 stage 擁有哪份已載入資料（`start` 不呼叫 `refreshAll`：開始關帳後導向工作區，工作區是隨期間新掛載的元件樹，首次載入由掛載本身發出，見 §「載入扇出與量測」）。`refresh()` 不得 reject（錯誤由該 hook 自己的 `useStageLoader` 持有並以 `errorMessage` 呈現），`refreshAll` 因此可以單純 `Promise.all`。
- **兩個抽出的階段機制（#250）**：八個關帳階段重複的載入與草稿骨架收斂成 `src/ui/features/monthly_close/hooks/` 下的 `useStageLoader<T>`（載入、取代與失敗語意）與 `useSeededDraft<T>`（每期種一次的草稿），stage hook 只留自己的 payload 映射。兩個機制的 interface 與語意記於 [`ui-layer-architecture.md`](ui/ui-layer-architecture.md) §4，此處不重述；關帳層套用三條規則：
  - **所有前置條件都合成到單一 `enabled`**：`load` 內不再有守衛，「無事可讀」因此永遠不會變成一輪空跑而把空值寫回去。
  - `refresh` 是顯式重載、刻意繞過 `enabled`（reopen／reset 流程不被閘門擋掉），因此階段契約上仍有 `refresh`。
  - **兩個機制都不認期間**：換月的淘汰與重載由工作區隨期間重掛載提供，不由機制內的鍵變更提供。因此階段 hook 的期間參數只在掛載時決定，不預期在同一次掛載內改變。
- **確認回傳權威資料（#250）**：確認的結果除了被更新的財務期間，還帶回**產生它的那個階段**的權威切片（以 `stageId` 為判別欄位，型別上保持「stageId 與其切片」的相關性；目前只有 SECURITIES_TRADE 有切片，其餘階段為空）。頁面把切片交回該階段自身的 `afterConfirm`，不做逐階段特例；沒有切片的階段收到空值，`afterConfirm` 預設為 no-op。SECURITIES_TRADE 的切片是該次寫入實際落地的權威列（既有列帶文件 ID、新增列帶剛建立的 ID），該階段直接採納為草稿所有權（不需再靠重載把 ID 補回來，重載也不會清掉它），因此再次確認即以 ID 就地更新而非重複建立。`afterConfirm` 只在確認成功後呼叫（失敗回傳 `null`，什麼都不寫，也不刷新）。

### 載入失敗的語意（ADR-0072）

- **載入失敗代表資料 UNKNOWN，不是 EMPTY**：失敗的階段顯示自己的罐頭錯誤訊息（`CloseStageLoadError`，文案由消費該資料的 hook 擁有），不留白——留白與「本月乾淨」在畫面上無法區分。
- **把關讀法固定為「已知且未失敗」**：`data !== null && errorMessage === null`，`useStageLoader` 把這個讀法具名為 `isLoaded`（有別於就緒判定的 `isReady`）。目前有兩個把關讀 `isLoaded`：(1) **Completeness Check 的確認閘門**——`isConfirmable && COMPLETENESS_CHECK.isLoaded`（交易驗證問題與 readiness 同一份載入，任一失敗或尚未落地都視為未就緒；`errorMessage` 仍獨立供顯示）；(2) **Financial Reports 的 Generate 守門**——`!isSettlementReady || !isLoaded || !hasAnyData || reportsPersisted === null`，其中 `isSettlementReady` 讀的是 Completeness Check 聚合後的整體就緒（含交易驗證問題、排除非阻擋的零活動）。Close Period 的 **drift 把關不改**：`hasDrift` 是領域比對（即時 preview 與持久化報表是否分岔），不是載入狀態，因此不讀 `isLoaded`。
- **prefill 失敗不阻擋確認**：prefill 是便利，不是關卡——錯誤照常顯示，使用者手打的草稿仍可提交。
- **同月刷新失敗保留上一輪已載入的資料**（最後已知值，不是空白）並顯示錯誤；切月失敗沒有同月已知值可留，畫面顯示錯誤與空值。「有沒有資料」因此不是把關依據。
- **prefill 每個 `yearMonth` 只種一次**：草稿由 `useSeededDraft` 從當月載入結果種入——使用者一旦編輯（或在確認後採納權威列）當月的草稿即取得所有權，之後同月的重載不會覆蓋它；換月由工作區重掛載淘汰重種。草稿不持久化；整頁重載會重跑預填（草稿本來就不持久化，見 §4）。

### 載入扇出與量測

工作區的資料**在該期間確定存在之後**才開始載入：工作區只在路由閘門確認該期間已有狀態紀錄後才掛載（見 §1），掛載即讓八個 stage hook **同時**各自載入，與當前顯示哪個階段無關——這是 draft 跨 stage 保留與 summary 跨讀的設計代價。停留在期間選擇畫面、或被導向一個尚未開始的月份時，**不發出任何關帳相關讀取**（#240）：工作區根本不存在，不需要任何把關旗標為此而存在。`control.refresh`（顯式重載）是另一條路徑，不受階段自身載入前提影響，重開與重設等流程才不會被擋掉。

扇出與量測的結論（實測細節與方法論見 #240 的量測紀錄，QA seed 資料集規模見 [qa-seed-data.md](qa-seed-data.md)）：

- **進入工作區前為 0 個關帳讀取**（#240）：工作區不存在時不發出任何 Listen，閒置觀測不新增 target；進入工作區才開始載入。
- **組成**：帳戶餘額階段的快照讀取為 **2N**（每帳戶 current + previous，N = 帳戶數），是最大單項；其餘為專案結算（每 active 專案一筆月快照）、Completeness Check、Financial Reports（ledgerCodes + 三張 persisted + 持久化旗標），以及各階段的 prefill／evidence。
- **共享實體重複讀取**：`projects` 清單由 page 的 `loadEntities` 與專案結算 stage 各讀一次，`accounts`／`portfolios` 同理。量測上不顯著。

量測方法注意事項：

- **不要拿 DevTools Network 的 HTTP 請求數當讀取數**：Firestore web SDK 把多次讀取 multiplex 到同一條 WebChannel，且同一 target 會在 channel 重開時重送。應以 SDK 呼叫邊界或相異 target 為準。
- **dev 的 `StrictMode` 讓每個 stage 的載入跑兩次**（mount → cleanup → mount），網路讀取因此翻倍；這是 dev-only，不是 production 成本。量測需在 `StrictMode` 關閉下取得才有代表性。

**結論：延遲面不構成瓶頸，不為載入型 stage 加 walk-position `enabled`；以「期間存在」為單一閘門延後載入（#240），閘門由路由承擔。** 閘門是可逆的實作選擇（拿掉即回到現況），未達 ADR 門檻。扇出仍是有界的（隨帳戶／專案數線性）且彼此平行；若真實裝置上進入工作區後的首次可互動時間明顯變長，再回來評估更細的載入時機（例如 walk position 附近的階段先載）。

### Report Drift（報表漂移比對）

關帳畫面永遠顯示即時重算的 Report Preview；[Persisted Report](../CONTEXT.md) 只當狀態旗標兼比對基準。當期間為 `IN_PROGRESS`/`NEEDS_REVIEW` 且 persisted 報表存在時，Financial Reports 三張表與 Close Period 五個聚合數字會逐欄比對並標註 Report Drift：

- 同欄位數字不同：金額 cell 顯示 `<persisted> -> <preview>`。
- preview 欄位比 persisted 多／少：該列以警示色顯示 `0 -> <preview>` 或 `<persisted> -> 0`。
- 父列只在子列集合增減時警示（`RESTRUCTURED`），避免總額變動時整棵樹亮起；葉節點直接比對、加總行（群組 total 與整表總結行）直接比對、標籤變更不比對。
- 舊 persisted 現金流無 `subItems`（schema 修正前）時，只比對該層並抑制子列「缺席」警示。
- 舊 persisted 資產負債表的欄位項含父列 + subItems（ADR-0074 前格式）時，先還原成平列（父列金額減明細加總的餘額還原為 bare 科目列）再比對，不出現假警示。
- 警示色沿用既有 token `--warning`，且只套用在金額 cell，不整列變色。

比對邏輯是 `src/domains/report/reportDrift.ts` 的純函式（輸入 preview + persisted，輸出帶 status／delta 的標註列樹），不含 React。persisted bundle 由 `FINANCIAL_REPORTS` stage 與 preview bundle 一併載入並持有、由 registry 跨讀，讀取走 `getStoredReportUseCase` 既有的權限檢查。

**已關帳期間**改以 persisted 報表為顯示來源（定案紀錄），不做比對、不標 drift。**reopen 後**期間回到 `IN_PROGRESS`、階段重設為 `PENDING`，但保留的 persisted 檔案仍存在，因此畫面照常顯示 preview 並比對——顯示模式由期間狀態決定，不是單純的 `isPersisted` 旗標。**沒有關帳紀錄但已有 persisted 報表的 legacy 期間同理**——persisted 只當比對基準，畫面照常顯示 preview 並比對。

## 4. 各階段的資料邊界

| 階段               | 確認時建立什麼                                                                                                                                                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 帳戶餘額           | 為**有輸入**的帳戶建立快照（使用者的觀察餘額）；不為未輸入的帳戶偽造零值，且無任何輸入時以 `STAGE_INPUT_REQUIRED` 拒絕確認（見 §5）                                                                                                                                                                                                                                                                                                  |
| 證券買入／賣出     | Diff-merge 當月投資與融資交易：載入的既有列以**文件 ID 更新**（intent 隨買入／賣出側改變、可跨側搬移），新增列逐筆建立為獨立合法事件，移除的列以 ID 刪除；監看清單外的手動交易預設不受寫入影響，但**會被 prefill 載入為階段列**——使用者刪除或編輯後，刪除以 `removedTransactionIds` 落地，該文件即轉為階段管理                                                            |
| Portfolio 金流     | 為每個 portfolio 寫入快照（存入與領出金隨確認一次提交）；**已存在的月快照以提交內容同鍵覆蓋**，未輸入的 portfolio 補一筆零金流快照；階段**允許重新確認**（修正輸入後再次確認即覆蓋）                                                                                                                                                                                      |
| 專案結算           | 執行結算流程建立專案快照；證據區列出 active 專案與 N/M 結算狀態，確認後顯示各專案的快照結果（收入、支出、期末餘額）                                                                                                                                                                                                                                                       |
| 債務還款           | 逐筆走 `createDebtPaymentUseCase` 的原子邊界（Transaction + DebtSnapshot + 餘額同一筆 Firestore transaction），批次內不包跨筆交易；為當月無還款的貸款補一筆零還款快照（零還款是推導，不是事件）；**同鍵重新確認 = 覆蓋當月紀錄**：未變更 payload 冪等返回、變更 payload 刪除前筆交易並重算快照與餘額、清零（總繳款 0）覆蓋成無還款，全部在同一筆 Firestore transaction 內 |
| Completeness Check | 不建立任何資料。依監看清單推斷各對象在目標月份的活動狀態，只讀不寫                                                                                                                                                                                                                                                                                                        |
| Financial Reports  | 產生三張報表（顯示標籤隨報表凍結，見 ADR-0069）；確認以同鍵冪等 upsert 覆寫既有 persisted（已存在不重複建立文件）                                                                                                                                                                                                                                                         |
| Close Period       | 將期間標記為 `CLOSED`                                                                                                                                                                                                                                                                                                                                                     |

債務還款的冪等鍵由期間 × 帳戶衍生（不含金額與日期），重複確認即覆蓋當月紀錄；清零（總繳款 0）語意為「本月無還款」。UI 預覽必須呼叫與寫入路徑相同的 domain calculator，不得在 UI 層自建第二條計算路徑。

### 證券交易階段的表格與 Summary

兩個 table（證券交易紀錄、融資紀錄）整列可點擊開 Drawer 編輯，表格不放列內動作按鈕。Summary 由系統計算、不可輸入：BUY／SELL 各自合計，`NET INVESTMENT CASH FLOW = BUY − SELL`（證券表）、`NET FINANCING CASH FLOW = 股東融資 − 發放分紅`（融資表）。Drawer 欄位契約：Type 必選、Amount 必填（右對齊）、Description 左對齊（**選填**，不做任何限制）、Project 選填；表單狀態統一走 RHF + Zod（`TradeDrawerSchema`），驗證在 schema 邊界承擔。

### Portfolio 金流的顯示與重新確認

- **確認動作**：為每個 portfolio 寫入快照（存入與領出金隨確認一次提交）；**已存在的月快照以提交內容同鍵覆蓋**，未輸入的 portfolio 補一筆零金流快照；階段**允許重新確認**（修正輸入後再次確認即覆蓋），不產生重複文件。
- **顯示內容**：每個 portfolio 是一個獨立 section（桌面不包 Card，以 section + divider 區隔），依序呈現：該月證券帳戶與銀行帳戶的期末餘額（唯讀，讀自當月快照）、CASH IN／CASH OUT 金流輸入框、輸入框下方的當月報酬與報酬率（依賴金流輸入值，故置於其下）；最後一個 section 下方一條總計 divider，寫本期合計報酬與報酬率。
- **計算語意**：單期沿用 `calculatePortfolioSnapshot` 的 Modified-Dietz 路徑（報酬 = 期末 − 期初 − 淨金流，報酬率以 期初 + 淨金流/2 為分母）；總計把同一條路徑套在聚合層（總報酬 = Σ報酬，總報酬率 = Σ報酬 / Σ(期初 + 淨金流/2)）。快照缺席（首次關帳）時輸入即時預覽，呼叫與寫入路徑相同的領域函式；快照已存在時顯示快照儲存的 performance，修改輸入後重新確認即覆蓋。
- **行動版**：單欄堆疊；portfolio ≥ 4 個時改用 accordion，預設第一個展開。

### 債務還款的顯示與重新確認

- **確認動作**：提交所有 active 債務（含 0 的列），逐筆走 `createDebtPaymentUseCase` 的原子邊界；同鍵（期間 × 帳戶）重新確認即覆蓋當月紀錄，見 §4。
- **顯示內容**：每個債務帳戶是一個獨立 section（桌面不包 Card，以 section + divider 區隔；行動版單欄堆疊），依序呈現：唯讀年利率行與期初餘額（唯讀，來自 settlement preview：當月快照凍結值，fallback 前期快照 closingBalance 與帳戶 currentBalance）、總繳款輸入框（唯一可調整欄位，改動即時重算）、輸入框下方的利息／本金／應繳／期末餘額（系統計算、唯讀，本金超過期初餘額時該 section 顯示被擋原因而非崩潰）；最後一個 section 下方一條總計 divider，寫總本金／總利息／總應繳。
- **預填語意**：當月有還款紀錄 → 已入帳金額；當月無紀錄 → 系統計算應繳（`getEffectiveMonthlyDueForBalance`，以 preview 期初餘額為計算基準，寬限期自動切利息金額）。草稿不持久化。快照已建立（當月已入帳）後重新進入 → 顯示已入帳的 snapshot 資料；修改總繳款後重新確認即覆蓋。
- **計算語意**：單期沿用 `calculateDebtPayment` 的統一拆分（實繳 ≤ 應計利息 → 利息全額 + 警告；超出部分記本金）；同月多筆繳款時月份排程利息只收一次（後續繳款只補剩餘利息池、超出記本金）。不修改利率：利率是 Debt Master 的貸款條件，Monthly Close 只計算不編輯。

### 專案結算的顯示與重新確認

- **確認動作**：執行結算流程建立專案快照；確認前列出所有 active 專案與其 N/M 結
  算狀態（`listProjectsUseCase` + `listProjectSnapshotsUseCase`：該月快照存在即已結
  算），確認後顯示各專案的快照結果（收入、支出、期末餘額，來自專案快照）。專案
  結算的 N/M 與 Completeness Check 就緒狀態是兩份不同的讀取——就緒聚合由
  `COMPLETENESS_CHECK` stage hook 擁有。
- **顯示內容**：本階段沒有輸入表單，證據區列出每個 active 專案一列：結算狀態
  （已結算顯示期末餘額、未結算顯示「尚未結算」警示）。沒有 active 專案時顯示「沒
  有專案」。

### Completeness Check 的細節

- 檢查對象來自**監看清單**：使用者明確標記參與檢查的對象。對象類型為專案、會計科目（LedgerCode）與債務帳戶；未標記的對象不參與檢查。
- 檢查**只讀不寫**：依既有 repository 在記憶體中計數，不新增寫入路徑、不修改任何交易。
- 檢查是結算流程的**軟關卡**，且異常才出現；所有監看對象活動正常時直接進預覽，有異常才內嵌警示，需逐項確認無漏記才放行。`NEEDS_REVIEW` 唯一的觸發來源就是這裡的零活動異常。
- **就緒檢查（Completeness Check）的聚合語意**：該階段在 UI 層把零活動推斷與各類別的月結算完成度（`getSettlementReadinessUseCase`）、交易驗證問題彙整為單一就緒狀態。N/M 計數為顯示資訊；缺漏項目列為例外清單，不偽造數值、不阻擋未發生的事。零活動警示仍是例外來源之一，不改變其非阻擋語意。
- **確認狀態不持久化**：生命週期與單次結算對話框 session 吻合，已結算月份重新檢查是可接受的代價。
- 檢查只看監看清單，**不**對「家庭分類」等其他維度做交叉比對。
- 債務類別用自己的檢查語意（以 `DEBT_PAYMENT` 交易為準，不監看負債科目），見 [`debt-accounts.md`](debt-accounts.md) §5.5。
- 第一版只做零活動判定；歷史偏離（比對前 3-6 個月均值）等零活動上線累積體感後再評估。

## 5. 帳戶餘額階段的輸入

該階段依 Account Type 分區，所有必要輸入直接呈現在頁面內（單一 current step 工作區），不使用 Dialog。與證券買入／賣出不同，本階段**不可空確認**：沒有任何帳戶輸入時，確認以 `STAGE_INPUT_REQUIRED` 拒絕（零輸入不產生任何快照，就緒必然不成立）。

- **現金／銀行**：前期餘額（唯讀，取上月快照）＋期末餘額（可編輯）。
- **外幣**：外幣金額＋匯率（皆可編輯）＋取得匯率按鈕，台幣價值由系統計算，不可做成 input。取得匯率按鈕置於 Account 欄，全階段單一實體。
- **證券**：Holdings 表作為輸入（可 inline 新增／刪除／修改），市值由系統計算；可匯入上月持倉作為當月起始資料（無上月持倉時停用）；非台幣證券帳戶另加匯率，台幣價值由系統計算。

重新進入已開啟的期間時，期末餘額欄位從**當月快照 prefill**（該月快照存在時）：快照值帶入可編輯欄位作為初始值，使用者已輸入的值不被覆蓋。帳戶餘額階段**允許重新確認**：確認動作對快照是同鍵（期間 × 帳戶）冪等覆蓋，用於修正觀察值，不產生重複文件；重新確認只更新階段的確認時間戳，不回退工作流狀態。證券買入／賣出階段同樣**允許重新確認**（diff-merge：既有列以 ID 更新、新增列建立、移除列刪除，手動交易預設不受寫入影響但會被 prefill 載入為階段列）；債務還款階段同樣**允許重新確認**（同鍵覆蓋：未變更 payload 冪等返回、變更 payload 或清零即取代當月紀錄，見 §4）。帳戶列不顯示 per-account 狀態欄；階段完成與否由 pipeline 與確認時間戳表達。

計算語意：非台幣帳戶 `amount = 原幣金額 × 匯率`；有持倉的帳戶 `amount = Σ holding marketValue`（非台幣再乘匯率）。持久化的 `amount` 一律是折合台幣的數字。UI 預覽與提交走同一條計算路徑，不在 UI 層自建第二條計算。

每個帳戶的 `○ WAITING` / `✓ VERIFIED` per-account 狀態已移除，不呈現也不持久化；階段完成由 pipeline 表達。

申請層的 `AccountBalanceInput` 由 `{ accountId, amount }` 擴充為加上 `originalAmount?` / `exchangeRate?` / `holdings?` 三個選填欄位；Firestore schema、domain schema 與既有計算語意不變。

排版契約：元件表面（欄寬、列高、字級層級）見 [`ui/design-system.md`](ui/design-system.md) 的 `data-table`；頁面層級的版面標準見 [`ui/visual-standards.md`](ui/visual-standards.md)。

## 6. 相關文件

- 資料結構：`data-structure.md` 的 `financialPeriods` 章節
- 報表計算與 Dashboard 錨定：`financial_report.md`
- 呈現層契約：`ui/visual-standards.md`、`ui/design-system.md`、`ui/ui-layer-architecture.md`
- 決策理由：ADR-0050（狀態持久化）、ADR-0052（階段資料邊界）、ADR-0053（Dashboard 錨定）、ADR-0066（重開與連鎖降級）、ADR-0072（載入失敗不是證據）、ADR-0073（關帳前的 drift 把關）
