# 退休計畫寫入的原子邊界

**狀態：** 已接受
**規範來源：** [retirement-system.md](../retirement-system.md) §5；[ddd-design-principles.md](../ddd-design-principles.md) §3

退休計畫的 create/update/delete/duplicate 會觸及主文件、`incomeStreams`/`expenseCategories` 子集合與 active fan-out，但原本拆成多個獨立 commit：`createPlan` 依序建立主文件與兩個子集合 batch、`updatePlan` 依序更新主文件與兩個子集合、`setOnlyActivePlan` 讀取全部計畫後單獨 batch commit、`deletePlan` 依序刪除兩個子集合與主文件。任一步驟失敗會留下殘缺子集合或孤兒主文件；併發啟用兩個計畫可能同時留下多筆 active，違反 [ADR-0036](0036-single-active-retirement-plan.md)。

因此把每個寫入 command（create、update、delete、duplicate）的主文件寫入、子集合整批替換與 active fan-out 放進同一個 Firestore transaction。Application 層持有 `runTransaction`，repository 接收 transaction 參數，比照 [ADR-0039](0039-allocation-atomicity-and-identity.md) 建立的模式。任一驗證或寫入失敗時全部回滾，不留部分資料。

Firestore transaction 內不能執行 query，因此 plan 清單（fan-out 目標）與現有 children 清單在 transaction 前以普通讀取 preflight；transaction 內只對已知 document ref 執行 `tx.get` 與寫入，且所有讀取先於任何寫入。實測（firebase 12.6.0 + Emulator）顯示 callback 內的 `getDocs` 會使其後同一 transaction 的部分寫入被靜默丟棄；因此 preflight 一律置於 `runTransaction` 之外。代價是自動 retry 時 children 清單可能過期，屬於已接受的併發視窗。

Command 分類依 [ADR-0038](0038-command-atomicity-and-retry-policy.md)：update/delete/啟用為 atomic desired-state command，重試安全，不需 idempotency key。create/duplicate 會建立新文件，重試可能產生重複 plan，但退休計畫是設定資料而非 financial source event，重複結果可見、可手動刪除且無會計影響，因此不導入 operation record；重複送出的主要緩解是 UI 對 create/duplicate 的 pending disabled 防護。

## Consequences

- 併發視窗：fan-out 目標在 callback 外 preflight，preflight 之後、commit 之前由另一成員建立的新 active plan 不在本 transaction 的衝突集合內，存在殘留兩筆 active 的極小視窗。接受並文件化此視窗，不在 household 文件上加入 contention token 或 `activePlanId` 指標，不改變 ADR-0036 的資料形狀。兩筆既有計畫的併發啟用會因互相重寫 `isActive` 觸發衝突而收斂為單一 active；此視窗小於現狀每次 `setOnlyActivePlan` 的非原子批次，消除它需要改變資料形狀，收益不成比例。
- 單一 household「至多一筆 active」；零筆 active 是合法狀態。create 與 duplicate 不自動啟用。
- Firestore transaction 內不能 query，preflight 讀取為每次 retry 增加數個 round trip；換取 fan-out 目標與 children 清單在重試時保持新鮮。
- 400 筆寫入上限（`PLAN_TOO_LARGE`）會拒絕極端大計畫而不是支援它；整批替換的既有取捨（[ADR-0030](0030-retirement-update-batch-replace.md)）維持，部分成功會破壞 desired-state 語意。
- `createPlan` 不再在主文件寫入 `incomes: []`/`expenses: []` 佔位欄位；子集合是唯一權威來源，既有佔位欄位自然閒置，不需遷移。
- [ADR-0031](0031-retirement-delete-order.md) 的「先刪子再刪主」順序不再是安全機制，僅保留為歷史決策。
