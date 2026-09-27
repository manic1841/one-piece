# Preview channel 共用生產後端,僅供視覺確認

**狀態：** 已接受（2026-09）
**規範來源：** [development-guide.md](../development-guide.md) §7.1

Firebase Hosting 的 preview channel 只隔離**前端靜態內容**,不隔離後端;preview URL 只是難猜(含隨機 hash),**並非私有**。本專案是家庭財務系統,交易寫入生產 Firestore,因此從 preview URL 登入並錄資料,資料會真的進生產庫。Security Rules 照舊生效,這不是外洩風險,而是**髒資料風險**,且資料一旦寫入只能靠備份/還原處理,屬於不可逆約束。

因此:preview channel 只用於視覺確認,不在 preview URL 上登入正式帳號或錄入任何交易;需要可寫入的資料環境時使用本機 Firebase Emulator。**不為 preview 另開 Firebase project**——本專案為單一家庭使用,額外的 project 帶來的設定同步成本高於其隔離效益。代價是接受上述紀律約束;若要真正隔離後端,唯一受支援的做法是另開測試 project,在此決定被推翻之前不提供該選項。

`workflow_run` 的 payload 不含 `pull_request`,Firebase action 的自動命名的 channel id 會是空字串而使部署以 `HTTP 400` 失敗,因此 workflow 一律明確傳入 `channelId`。

## Consequences

- Hosting 配額是 **project 層級**而非 channel 層級(免費額度為 10 GB 儲存與 10 GB/月傳輸)。channel 數量本身不計費,但每個 channel 的 release 會佔用儲存,必要時在 console 設定各 channel 的「releases to keep」上限。
- Firebase action 在 `workflow_run` 下永遠不會留言到 PR、也不會建立 `Deploy Preview` check run,因此兩個部署 workflow 不再要求 `pull-requests: write` / `checks: write`,preview URL 改由 workflow 寫入 job summary。
