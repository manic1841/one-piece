# 關帳階段自渲染自己的內容，registry 不再帶 evidence builder

**日期：** 2026-10-06
**狀態：** 已接受
**規範來源：** [monthly-close.md](../monthly-close.md) §3「UI 組構：大一統步驟 registry」、§4「專案結算的顯示與重新確認」

`CloseStepDefinition` 曾同時帶 `control`、`render(ctx)` 與 `evidence()`：evidence 是一個零參數閉包，由 registry 從擁有資料的 stage hook 建構一個判別聯合（`CloseStageEvidence`），交給共用的 `CloseStageEvidenceList` 元件渲染。實際上八個階段裡只有 `PROJECT_SETTLEMENT` 用到它，其餘四個帶輸入的階段一律傳 `NO_EVIDENCE`、另外三個的 builder（zero-activity／adjustment／persistence）在任何畫面都到不了——`CloseStageEvidenceList` 從未渲染過這三種形狀。整個 evidence 通道因此是**只有一個消費者的第二條呈現路徑**：同一份資料既要餵輸入元件、又要被 registry 轉成另一種形狀再畫一次，於是改一次結算顯示要同時改 builder、聯合型別與共用元件三處。

因此刪除 evidence 通道：`CloseStepDefinition` 只留 control 與 content factory，每個階段自行渲染它要給使用者看的內容。專案結算的表格直接長在 `CloseProjectSettlementStage` 內，四個金額保持原始 `number`、由呈現層的 `NumberCell` 格式化；判別聯合與 `NO_EVIDENCE` 一併移除。判準是：**資料形狀的轉換若只為單一消費者服務，就沒有理由活在 registry 層。**

## Considered Options

- 保留 evidence 通道、只把 `CloseStageEvidenceList` 併入 PROJECT_SETTLEMENT：否決——留下一個 field 與聯合型別只為一個階段服務，等同把「第二條呈現路徑」變成永久結構；下次新增階段會再被誘導去走它。
- 把 evidence 通道推廣給其餘階段（讓 input 階段也顯示唯讀證據摘要）：否決——輸入階段畫面上已經就是那些數字，唯讀摘要只是同一份資料的第二次呈現，是重複而非資訊。

## Consequences

- `CloseStageEvidenceList`、`CloseEvidenceOnlyStage` 與 `closeEvidence.vm`（含其測試）刪除；`PROJECT_SETTLEMENT` 改渲染自己的 stage 元件。evidence 不再是一個可跨階段重用的呈現契約，因此新增階段沒有「證據該長什麼樣」的共用答案——每個階段自己決定。
- 四個原本傳 `NO_EVIDENCE` 的階段不再多渲染一行「無資料」；它們的空狀態早就由各自的內容區塊表達（例如「沒有專案」），那一行只是 evidence 元件的佔位輸出。
- `CONTEXT.md` 的「證據 (Evidence)」一詞保留：證據作為**概念**（系統推斷、供確認前參考、非財務事件）不變，死的只是它當時的唯一配送管道。
- 專案結算的顯示改為真正的表格（桌機五欄、行動版單欄），因此 `docs/monthly-close.md` §4 的「桌機四欄、行動版兩欄」描述同步改寫。

## Revisit When

出現第二個需要同一種證據形狀的階段時——那時才值得把共用呈現抽回來，且抽的地方是 `src/ui/components/` 的呈現元件，不是 registry 的欄位。
