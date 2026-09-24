# Account、Project、Portfolio 排序的原子 desired-state 契約

**狀態：** 已接受
**規範來源：** [ddd-design-principles.md](../ddd-design-principles.md) §4；[data-structure.md](../data-structure.md) §跨集合規則

Account、Project、Portfolio 的 reorder command 以 `Promise.all` 逐一獨立更新 `order` 欄位，任一更新失敗會留下部分套用的排序。排序屬於一份整體 desired state（使用者看到的清單順序），部分成功沒有業務意義。因此三個 reorder command 皆改為 all-or-nothing：同一 household 的整份排序在一次 Firestore transaction 內提交，失敗時全部回滾，排序維持提交前的狀態。對應 [ADR-0038](0038-command-atomicity-and-retry-policy.md) 的 atomic desired-state 分類，並關閉 issue #34 的最後一個 finding。

## Considered Options

- **重複的目標 id 靜默去重**：會隱藏呼叫端（UI 拖曳排序）的狀態錯誤；改為回傳穩定錯誤 `INVALID_ORDERS`，不靜默修正。
- **引入 idempotency key**：重試同一 desired state 本身就是安全的，額外的 key 沒有增加保護，不引入。
- **加入 contention token 解並發**：兩個成員同時 reorder 會因 transaction 衝突而收斂為其中一方的完整排序，不需要額外 token。
- **動態計算寫入數上限**：單一 household 的帳戶/專案/投資組合數量遠低於 Firestore transaction 的 500 筆上限，靜態假設即可，不計算。
