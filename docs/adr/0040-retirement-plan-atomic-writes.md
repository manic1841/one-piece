# 退休計畫寫入的原子邊界

## 背景

退休計畫的 create/update/delete/duplicate 會觸及主文件、`incomeStreams`/`expenseCategories` 子集合與 active fan-out，但目前拆成多個獨立 commit：`createPlan` 依序建立主文件與兩個子集合 batch、`updatePlan` 依序更新主文件與兩個子集合、`setOnlyActivePlan` 讀取全部計畫後單獨 batch commit、`deletePlan` 依序刪除兩個子集合與主文件。任一步驟失敗會留下殘缺子集合或孤兒主文件；併發啟用兩個計畫可能同時留下多筆 active，違反 [ADR-0036](0036-single-active-retirement-plan.md)。

## 決策

### 單一 transaction 邊界

退休計畫的每個寫入 command（create、update、delete、duplicate）將主文件寫入、子集合整批替換與 active fan-out 放進同一個 Firestore transaction。Application 層持有 `runTransaction`，repository 接收 transaction 參數，比照 [ADR-0039](0039-allocation-atomicity-and-identity.md) 建立的模式。任一驗證或寫入失敗時全部回滾，不留部分資料。

### Preflight 讀取

Firestore transaction 內不能執行 query，因此 plan 清單（fan-out 目標）與現有 children 清單在 transaction callback 內以普通讀取 preflight，每次 Firestore 自動 retry 都重新讀取；transaction 內只對已知 document ref 執行 `tx.get` 與寫入。

### 寫入上限

Transaction 寫入數以動態計算保護：主文件 1 筆 + 舊 children 刪除數 + 新 children 寫入數 + fan-out 更新數。超過 400 時在驗證階段拒絕，回傳穩定錯誤 `PLAN_TOO_LARGE`，不做任何部分寫入。上限預留 headroom 給 fan-out 與未來欄位開銷；不採用靜態 per-collection 上限，避免誤拒合理組合。

### 併發啟用的已知視窗

Fan-out 目標在 callback 內 preflight；preflight 之後、commit 之前由另一成員建立的新 active plan 不在本 transaction 的衝突集合內，存在殘留兩筆 active 的極小視窗。本 ADR 接受並文件化此視窗，不在 household 文件上加入 contention token 或 `activePlanId` 指標，不改變 ADR-0036 的資料形狀。兩筆既有計畫的併發啟用會因互相重寫 `isActive` 觸發 transaction 衝突而收斂為單一 active。

### Active 語意

單一 household「至多一筆 active」；零筆 active 是合法狀態。create 與 duplicate 不自動啟用；啟用只發生在使用者明確提交 `isActive: true` 的更新。

### Command 分類

依 [ADR-0038](0038-command-atomicity-and-retry-policy.md)：update/delete/啟用為 atomic desired-state command，重試安全，不需 idempotency key。createPlan/duplicate 會建立新文件，重試可能產生重複 plan，但退休計畫是設定資料而非 financial source event，重複結果可見、可手動刪除且無會計影響，因此不導入 operation record；重複送出的主要緩解是 UI 對 create/duplicate 的 pending disabled 防護，殘餘風險明確接受。

### 錯誤契約

退休計畫 command 使用穩定 application error：`PLAN_NOT_FOUND`（update/delete/duplicate 的來源計畫不存在）、`PLAN_TOO_LARGE`（寫入超限）、`TRANSACTION_FAILED`（transaction abort 包裝）。權限檢查仍由 household permission service 拋出，不重複定義。找不到來源計畫時顯式拒絕，不靜默成功。

### Repository 級時間戳保護

`BaseRepository.update` 會在每次更新時重寫 `createdAt`；退休 repository 以直寫方法（比照 transaction repository 的 link 更新模式）確保更新只改變預期欄位與 `updatedAt`/`updatedBy`，不修改 base 的共用行為。

### 主文件佔位欄位移除

`createPlan` 不再在主文件寫入 `incomes: []`/`expenses: []` 佔位欄位；子集合是收入與支出的唯一權威來源。不需要資料遷移，既有文件的佔位欄位自然閒置。

### 刪除語意

`deletePlan` 的子集合刪除與主文件刪除進入同一 transaction。[ADR-0031](0031-retirement-delete-order.md) 的「先刪子再刪主」順序不再是安全機制，僅保留為歷史決策。

## 取捨

- Transaction 內不能 query，preflight 讀取為每次 retry 增加數個 round trip；換取 fan-out 目標與 children 清單在重試時保持新鮮。
- 400 上限會拒絕極端大計畫而不是支援它；整批替換的既有取捨（[ADR-0030](0030-retirement-update-batch-replace.md)）維持，部分成功會破壞 desired-state 語意。
- 併發視窗（preflight 後新建 active plan）小於現狀每次 `setOnlyActivePlan` 的非原子批次；消除它需要改變 ADR-0036 的資料形狀，收益不成比例。

## 驗證要求

實作必須涵蓋 application 單元測試與 Firebase Emulator 整合測試：任一寫入失敗的全量 rollback、併發啟用收斂為單一 active、child replacement 失敗時舊子集合完整保留、duplicate/delete 的原子性、`PLAN_TOO_LARGE`、`PLAN_NOT_FOUND`，以及主文件不再寫入佔位欄位。
