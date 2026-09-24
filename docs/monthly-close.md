# 月度關帳 (Monthly Close)

本文件說明月度關帳工作流的現況：期間狀態、階段模型、每個階段的資料建立邊界，以及關帳的完成條件。

詞彙定義見 [`CONTEXT.md`](../CONTEXT.md)（Monthly Close、Financial Period、Transaction Validation、Completeness Check、Watch List）；決策理由見 ADR-0050、ADR-0052、ADR-0053。

## 1. 入口

關帳有專屬的 `/close` 路由，是唯一的關帳入口。當月的債務還款集中到關帳的債務還款階段，交易表單不再提供獨立的還款分頁。

## 2. 期間狀態

財務期間狀態是**唯一持久化的關帳工作流狀態**，鍵為既有的 `YYYY-MM` 財務期間。它只描述關帳進度，不複製任何快照資料。

| 狀態 | 意義 |
| --- | --- |
| `OPEN` | 關帳已開啟，尚未完成任何階段 |
| `IN_PROGRESS` | 階段推進中 |
| `NEEDS_REVIEW` | 待使用者確認，工作流暫停 |
| `CLOSED` | 該期間的報表已產生且狀態已定案 |

- 沒有狀態紀錄代表該期間**尚未開始關帳**，不代表期間不存在。
- 狀態紀錄在開始關帳時誕生。
- 就緒判定（`isReady`）仍是衍生計算，只檢查四種實體快照是否全部存在；工作流狀態與它並存、不互斥，也不取代它。
- `NEEDS_REVIEW` 的唯一觸發來源是 Completeness Check 的零活動異常；使用者完成該階段確認後自動回到 `IN_PROGRESS`。
- 現金差異維持報表層級的警告（見 [`financial_report.md`](financial_report.md)），**不暫停**工作流。

## 3. 階段模型

九個階段，依顯示名稱與順序：

1. 帳戶餘額
2. 交易驗證
3. 證券買入／賣出
4. Portfolio 金流
5. 專案結算
6. 債務還款
7. Completeness Check
8. Financial Reports
9. Close Period

規則：

- 每個階段完成由**使用者確認**；系統的檢查結果只是證據。
- **確認動作 = 冪等執行該階段的資料建立（已存在則不重複）+ 標記階段完成**。輸入隨確認一次提交，不做跨階段的一鍵全部快照。
- 階段順序依賴**僅為 UI 引導**，系統不強制。唯一的硬性條件是 **Close Period 需要三張報表已產生**。
- 建立的是既有合法事件（快照與交易）；關帳工作流與期間狀態本身不是財務事件。

## 4. 各階段的資料邊界

| 階段 | 確認時建立什麼 |
| --- | --- |
| 帳戶餘額 | 為**有輸入**的帳戶建立快照（使用者的觀察餘額）；不為未輸入的帳戶偽造零值 |
| 交易驗證 | 不建立任何資料。只對當月交易批次檢查會計正確性並產生證據：意圖映射存在、金額有效、分配總和 100%、專案連結有效、借貸科目有效 |
| 證券買入／賣出 | 批次建立全部投資與融資 intent 的交易；逐筆皆為獨立合法事件 |
| Portfolio 金流 | 為有輸入的 portfolio 建立快照（帶入金與出金）；為未輸入的補一筆零金流快照，補零前先查該月快照是否已存在，**已存在不覆蓋** |
| 專案結算 | 執行結算流程建立專案快照 |
| 債務還款 | 逐筆走 `createDebtPaymentUseCase` 的原子邊界（Transaction + DebtSnapshot + 餘額同一筆 Firestore transaction），批次內不包跨筆交易；為當月無還款的貸款補一筆零還款快照（零還款是推導，不是事件） |
| Completeness Check | 不建立任何資料。依監看清單推斷各對象在目標月份的活動狀態，只讀不寫 |
| Financial Reports | 產生三張報表 |
| Close Period | 將期間標記為 `CLOSED` |

債務還款的冪等鍵由期間、帳戶、金額、日期衍生，重複確認不重複入帳；**已建立的還款不可編輯或刪除**（改金額等於新冪等鍵、等於新交易）。UI 預覽必須呼叫與寫入路徑相同的 domain calculator，不得在 UI 層自建第二條計算路徑。

## 5. 帳戶餘額階段的輸入

該階段依 Account Type 分區，所有必要輸入直接呈現在頁面內（單一 current step 工作區），不使用 Dialog。

- **現金／銀行**：前期餘額（唯讀，取上月快照）＋期末餘額（可編輯）。
- **外幣**：外幣金額＋匯率（皆可編輯）＋取得匯率按鈕，台幣價值由系統計算，不可做成 input。
- **證券**：Holdings 表作為輸入（可 inline 新增／刪除／修改），市值由系統計算；可匯入上月持倉作為當月起始資料（無上月持倉時停用）；非台幣證券帳戶另加匯率，台幣價值由系統計算。

計算語意：非台幣帳戶 `amount = 原幣金額 × 匯率`；有持倉的帳戶 `amount = Σ holding marketValue`（非台幣再乘匯率）。持久化的 `amount` 一律是折合台幣的數字。UI 預覽與提交走同一條計算路徑，不在 UI 層自建第二條計算。

每個帳戶的 `○ WAITING` / `✓ VERIFIED` 是**由階段完成狀態推導的純 UI 狀態，不持久化**。

申請層的 `AccountBalanceInput` 由 `{ accountId, amount }` 擴充為加上 `originalAmount?` / `exchangeRate?` / `holdings?` 三個選填欄位；Firestore schema、domain schema 與既有計算語意不變。

排版契約（欄寬、列高、字級層級）見 [`ui/visual-standards.md`](ui/visual-standards.md) 與 [`ui/design-system.md`](ui/design-system.md)。

## 6. 相關文件

- 資料結構：`data-structure.md` 的 `financialPeriods` 章節
- 報表計算與 Dashboard 錨定：`financial_report.md`
- 呈現層契約：`ui/visual-standards.md`、`ui/design-system.md`、`ui/ui-layer-architecture.md`
- 決策理由：ADR-0050（狀態持久化）、ADR-0052（階段資料邊界）、ADR-0053（Dashboard 錨定）
