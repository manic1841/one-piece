# Preview channel 共用生產後端,僅供視覺確認

## 狀態

已接受(2026-09)

## 背景與動機

兩個 Hosting 部署 workflow 都以 `on: workflow_run` 觸發(見
[開發指南](../development-guide.md) 4.1 節),CI 綠燈後才部署。這帶來一個必須先承認
的事實:Firebase Hosting 的 preview channel 只隔離**前端靜態內容**,不隔離後端。

Firebase 文件原話:preview URL 下 "your web app interacts with your real backend
for all project resources"(唯一例外是 rewrites 中 pin tag 的 functions)。同時
preview URL 只是難猜(含隨機 hash),**並非私有**,任何知道 URL 的人都可存取。

本專案是家庭財務系統,交易寫入生產 Firestore。因此從 preview URL 登入並錄資料,
資料會真的進生產庫。Security Rules 照舊生效,所以這不是外洩風險,而是**髒資料
風險**,且資料一旦寫入只能靠備份/還原處理,屬於不可逆約束。

## 決策

1. **preview channel 只用於視覺確認**。不在 preview URL 上登入正式帳號、不錄入
   任何交易或帳戶資料。需要可寫入的資料環境時,使用本機 Firebase Emulator
   (見 [測試指南](../testing.md)),而非 preview URL。
2. **不為 preview 另開 Firebase project**。本專案為單一家庭使用,額外的 project
   帶來的設定同步成本高於其隔離效益。代價是接受上述第 1 點的紀律約束。若未來
   出現多位協作者或需要長期 QA 環境,重新評估此決定。
3. **channel 命名由 workflow 自行推導**。`workflow_run` 的 payload 不含
   `pull_request`,Firebase action 的自動命名因此回傳空字串,
   `hosting:channel:deploy ""` 會以 `HTTP 400` 失敗。workflow 一律明確傳入
   `channelId`:PR 用 `pr<N>-<branch>`,develop push 用固定的 `develop`。

## 影響

- PR 的 preview channel 存 7 天;develop 的固定 channel 每次 push 延長到 30 天
  (Firebase 上限為 deploy 起算 30 天),因此 develop 有一條長期穩定的 staging URL。
- Hosting 配額是 **project 層級**而非 channel 層級:免費額度為 10 GB 儲存與
  10 GB/月傳輸。channel 數量本身不計費,但每個 channel 的 release 會佔用儲存,
  必要時在 console 設定各 channel 的「releases to keep」上限。
- Firebase action 在 `workflow_run` 下永遠不會留言到 PR、也不會建立
  `Deploy Preview` check run(其判定為 `!!context.payload.pull_request`)。
  兩個 workflow 因此不再要求 `pull-requests: write` / `checks: write`,也不再傳
  `repoToken`;preview URL 改由 workflow 寫入 job summary。
- 若要真正隔離後端,唯一受支援的做法是另開測試 project;在本 ADR 第 2 點被推翻
  之前,不提供該選項。
