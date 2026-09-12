# Account、Project、Portfolio 排序的原子 desired-state 契約

## 背景

Account、Project、Portfolio 的 reorder command 以 `Promise.all` 逐一獨立更新 `order` 欄位，任一更新失敗會留下部分套用的排序。排序屬於一份整體 desired state（使用者看到的清單順序），部分成功沒有業務意義。此切片對應 [ADR-0038](0038-command-atomicity-and-retry-policy.md) 的 atomic desired-state 分類，並關閉 issue #34 的最後一個 finding。

## 決策

### 契約

三個 reorder command（accounts、projects、portfolios）皆為 all-or-nothing：同一 household 的整份排序在一次 Firestore transaction 內提交，任一驗證或寫入失敗時全部回滾，排序維持提交前的狀態。不做 partial update，也不引入 idempotency key——重試同一 desired state 是安全的。

### 輸入驗證

`orders` 為空陣列時直接成功返回（無事可做不是錯誤）。重複的目標 id 視為無效輸入，回傳穩定錯誤 `INVALID_ORDERS`。不存在的目標文件在 transaction 內 `tx.get` 後顯式拒絕 `TARGET_NOT_FOUND`，不靜默略過；權限仍由 household permission service 處理。

### 併發

兩個成員同時 reorder 會在相同文件集合上產生 transaction 衝突，後提交者以新讀取的狀態重試，最終收斂為其中一方的完整排序。不需要額外的 contention token。

### 寫入上限

單一 household 的帳戶/專案/投資組合數量遠低於 Firestore transaction 500 上限，本契約不做動態寫入數計算；若未來數量接近上限，依 [ADR-0040](0040-retirement-plan-atomic-writes.md) 的模式補驗證。

## 取捨

- All-or-nothing 讓「重新整理後順序不變」成為唯一可觀察行為，取代原本未文件化的部分成功。
- 重複 id 拒絕而不是去重，是為了不隱藏呼叫端（UI 拖曳排序）的狀態錯誤。

## 驗證要求

Application 單元測試覆蓋空清單、重複 id、目標遺失、權限拒絕與 transaction 包裝；Firebase Emulator 整合測試覆蓋全量套用、任一寫入失敗的全量回滾與併發 reorder 收斂。
