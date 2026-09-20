# QA FAQ (除錯筆記)

本文件記錄測試與瀏覽器驗證時「不容易發現、容易導致錯誤結論」的實際踩坑案例。當一次除錯同時滿足兩個條件才記錄到這裡:(1) 症狀與根本原因距離很遠,靠直覺修不好;(2) 錯誤的解讀會把人導向錯誤的修復方向(例如去改程式碼,但程式碼其實沒錯)。一次性、症狀即原因的問題不記錄。

## 索引

1. [REST-seeded 文件缺 base 欄位 → 頁面靜默吞錯](#1-rest-seeded-文件缺-base-欄位--頁面靜默吞錯)
2. [Auth session 注入寫錯儲存層 → 一切正常卻看不到資料](#2-auth-session-注入寫錯儲存層--一切正常卻看不到資料)
3. [容器內 localhost 不通 → 誤判 emulator 掛了](#3-容器內-localhost-不通--誤判-emulator-掛了)
4. [Listen channel 400/ERR_ABORTED 是環境 quirk](#4-listen-channel-400err_aborted-是環境-quirk)
5. [種子資料掛錯家戶 → App 正確地查不到](#5-種子資料掛錯家戶--app-正確地查不到)
6. [pnpm 互動提示被 pipe 吞掉 → 看起來像 hang](#6-pnpm-互動提示被-pipe-吞掉--看起來像-hang)
7. [bash 腳本 CRLF 行尾 → pipefail 解析失敗](#7-bash-腳本-crlf-行尾--pipefail-解析失敗)
8. [Fetch 攔截裝太晚 → 抓不到 early request](#8-fetch-攔截裝太晚--抓不到-early-request)
9. [命名相近的標籤讓斷言誤判](#9-命名相近的標籤讓斷言誤判)

## 1. REST-seeded 文件缺 base 欄位 → 頁面靜默吞錯

**症狀**:資料確定寫進 emulator(REST GET 看得到),頁面卻顯示空狀態或「Account not found」,console 沒有明顯錯誤。

**根因**:App 讀取路徑對每份文件跑 Zod schema 驗證。REST 手工種子文件若缺 `id`/`createdBy`/`updatedBy`/`createdAt`/`updatedAt` 等 base 欄位(或型別不對,例如 REST 要 `integerValue: "123"` 字串形式),`parse` 拋錯後被 repository 層吞掉,UI 落入 fallback 狀態。真正的錯誤訊息不會浮上來。

**判別法**:先用 REST `runQuery`/`get` 確認資料存在,再逐一比對 App schema 的必填欄位與型別。懷疑時把文件修到 schema 完全相容再重載。

**記錄自**:#124(2026-09-20,Account Detail 12M 驗證)。

## 2. Auth session 注入寫錯儲存層 → 一切正常卻看不到資料

**症狀**:注入 session 後頁面顯示已登入、SYSTEM ONLINE,但怎麼都查不到種子資料;重複 reload 一樣。

**根因**:兩層錯位。第一層,Firebase JS SDK v12 的 session 以 **IndexedDB**(`firebaseLocalStorageDb` 的 `firebaseLocalStorage` store,`fbase_key` 為 `firebase:authUser:<apiKey>:[DEFAULT]`)為主要來源,localStorage 只是 fallback——只寫 localStorage 根本不會被讀。第二層,手工構造的 session 物件若缺 SDK v12 要求的欄位,reload 後 `_fromJSON` 拋 `auth/internal-error`,頁面空白,看起來像資料層壞了。

**判別法**:用 `indexedDB.databases()` + 直接讀 `firebaseLocalStorage` store 確認實際登入的 uid/email;比對種子資料所在 household 與該 user 的 household 是否一致。要取得合法 session 時,以 Identity Toolkit REST API 對 Auth emulator 呼叫 `signInWithPassword`(見 `scripts/admin/qa-identity.ts` 的 `QA_EMAIL` / `QA_PASSWORD`),不要手工拼 token。損毀的 entry 直接刪掉走正常登入流程。

**記錄自**:#120(2026-09-20,Scenario Workspace 瀏覽器驗證;「已登入卻看不到計畫」的實際原因是 IndexedDB 裡登入的是另一個測試帳號)。

## 3. 容器內 localhost 不通 → 誤判 emulator 掛了

**症狀**:從容器內對 `localhost:8080` 的 REST 探測全部 ECONNREFUSED,以為 emulator 掛了。

**根因**:Docker dev stack 內,容器只能透過 service hostname `firebase` 連 emulator(`firebase:8080` / `firebase:9099`);`localhost` 在容器內指容器自己。瀏覽器端(跑在 host)則一律用 `localhost:8080/9099`。同一個資源在兩個位置的正確位址不同。

**判別法**:在容器內用 `firebase:8080`,在瀏覽器/DevTools 用 `localhost:8080`。兩邊都失敗才懷疑 emulator 本身。整合測試的環境變數設定見 `docs/testing.md`。

**記錄自**:#124(2026-09-20)。

## 4. Listen channel 400/ERR_ABORTED 是環境 quirk

**症狀**:DevTools network 面板出現 Firestore listen(Watch)channel 請求回 400 或 `net::ERR_ABORTED`,像連線壞了。

**根因**:這是容器化環境的已知 quirk;SDK 會自行用長輪詢 fallback,資料仍正常送達。REST(一次性)與 REST `runQuery` 一直是好的。

**判別法**:看到 listen channel 異常時,先用 REST runQuery 驗證資料路徑;資料有到就不要順著 listen 錯誤去改連線程式碼。不要把這個症狀當成「查無資料」的原因。

**記錄自**:#124(2026-09-20)。

## 5. 種子資料掛錯家戶 → App 正確地查不到

**症狀**:種子文件存在、查詢語法正確、甚至直接 REST runQuery 拿得到資料,頁面仍顯示空列表。

**根因**:App 按「登入使用者的 householdId」做 parent-scoped 查詢(例如 `households/{householdId}/retirement_plans`)。種子資料寫在 `households/qa_household/...` 而登入者的 household 是 `hh-test` 時,查詢正確地回空——不是 bug。整條鏈路只有一個 Firestore database(`(default)`),看起來像「資料在不同 database」時,通常是 household scoping 或 auth 身分錯位(見 §2),不是 database 不一致。

**判別法**:先確認「實際登入的 user 的 householdId」再決定種子路徑;`qa:seed` 之所以用固定 doc ID + 固定 `qa_household`,就是為了讓種子資料與登入身分對齊。

**記錄自**:#120(2026-09-20)。

## 6. pnpm 互動提示被 pipe 吞掉 → 看起來像 hang

**症狀**:`pnpm install` / `pnpm add` 沒有輸出也不結束。

**根因**:pnpm 10 會問互動確認(如 ignored build scripts);pipe 到 `| tail` / `| head` 會把提示藏起來並擋住輸出流。

**判別法**:不要 pipe,直接跑;或把輸出導到檔案再讀。長時間的 dev server pipe 給 `head` 也會在首次寫入時被 SIGPIPE 殺掉,同理不要 pipe。

## 7. bash 腳本 CRLF 行尾 → pipefail 解析失敗

**症狀**:shebang 正確的 bash 腳本報 `set: pipefail: invalid option name`。

**根因**:CRLF(`\r\n`)行尾;bash 把 `pipefail\r` 當成選項名。用 `cat -A file | head` 看 `^M$` 即可確認。

**判別法**:`sed -i 's/\r$//'` 去除 CR;預防層(`.gitattributes`、`.editorconfig`、VS Code `files.eol`、prettier `endOfLine`)見本倉庫既有設定,全部指向 LF。

## 8. Fetch 攔截裝太晚 → 抓不到 early request

**症狀**:在頁面載入後才用 `page.evaluate` 包 `window.fetch` 記錄請求,結果捕獲列表是空的,誤判「App 沒發查詢」。

**根因**:reload 之後所有 instrumentation 都會被清掉;App 的查詢在模組初始化時就發出了,安裝時機在請求之後。

**判別法**:要攔截 early request 用 Playwright 的 `page.route`(在 `goto` 之前裝),或 DevTools network 面板;不要用 evaluate 注入的攔截器做「頁面載入後」的請求驗證。

**記錄自**:#120(2026-09-20)。

## 9. 命名相近的標籤讓斷言誤判

**症狀**:測試選取器抓到錯誤元素——例如 `/income$/` 同時命中「Income」與「Income Streams」兩個標題,或大小寫(uppercase 顯示常數)讓 `getByText('Overview')` 抓不到。

**根因**:display labels 來自 constants layer,常數是大寫;而且巢狀標題會讓子字串匹配到多個節點。

**判別法**:查詢一律 case-insensitive(`/overview \/ results/i`),長標題加錨(`/^income$/i`),並避免把同一個元素拿去 `compareDocumentPosition` 自己(會回 0,干擾順序斷言)。

**記錄自**:#120(2026-09-20)。
