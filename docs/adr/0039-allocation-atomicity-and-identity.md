# Allocation 建立與目前狀態取代的原子性與 identity

## 背景

Allocation 是管理會計決策，不是真實財務事件；Transaction 仍是財務 source，
這項邊界由 [ADR-0011](0011-allocation-separate-collection.md) 定義。現有收入與
支出表單會先建立 Transaction，再建立 Allocation，最後把 `allocationId` 回寫到
來源 Transaction。這三個步驟若分開執行，可能留下孤立 Allocation 或在不確定的
網路重試後產生重複財務 Transaction。

## 決策

### 初次建立帶分配的交易

初次建立帶 Allocation 的收入或支出，視為一個 composite command：

```text
Transaction + Allocation + source Transaction allocation link + operation result
```

這些資料必須在同一個 Firestore transaction 中成功提交；任一驗證、寫入、競爭或
重試衝突失敗時，本次 command 新建的所有資料一起 rollback。沒有 Allocation 的
一般 Transaction 仍然是合法狀態，但不屬於這個 composite command。

這個 command 會新增不可重複的 financial source event，因此依
[ADR-0038](0038-command-atomicity-and-retry-policy.md) 歸類為 explicitly
non-repeatable command：caller 必須提供 idempotency key，並以 household operation
record 保存成功結果、payload fingerprint、狀態與最小必要的 audit reference。

### 目前 Allocation 與重新分配

同一個 `sourceTransactionId` 只有一筆目前有效的 Allocation。重新分配是 atomic
desired-state command：

- 以來源 Transaction 定位目前 Allocation。
- Allocation 內容與來源 Transaction 的 `allocationId` link 一起更新。
- 更新失敗時 Allocation 與 link 一起 rollback。
- 不刪除、不 rollback 已存在的 Transaction。
- 重新分配本身不新增 financial source event，因此不要求 idempotency key；相同
  desired state 重試必須安全，不同 desired state 代表新的使用者意圖。

第一版只處理 `INCOME` 與 `EXPENSE`。Debt Payment、Transfer、Manual、Investment
與 Financing 不因本 ADR 改變 Allocation 語意。

### Resource identity 與既有資料

新建立的 Allocation document ID 使用 `sourceTransactionId`，以表達一對一的目前
狀態 identity。它不等同於 idempotency key，也不代表 command 已成功。

既有 random-ID Allocation 必須向後相容：讀取與重新分配時可依
`sourceTransactionId` fallback 定位，並在觸碰資料時 lazy normalize 到 deterministic
identity。normalize 期間不可同時保留兩筆目前有效 Allocation，也不進行一次性
全量 migration。

Composite command 的 fingerprint 必須只包含會影響 Transaction 與 Allocation 結果
的 canonical input，不包含 generated document IDs、執行時間、authentication
context、email 或儲存後的資料。具體欄位在實作 ticket 中依現有 Transaction 與
Allocation payload 明確列出，並以版本化 schema 固定。

## 取捨

- 將初次建立包成 composite command，會讓 application boundary 比目前表單依序
  呼叫多個 use case 更窄，但能避免財務 Transaction 與其管理分配互相失聯。
- 保留「無 Allocation 的 Transaction 合法」可維持 Allocation 不是真實財務事件的
  domain 定義；代價是 Allocation 失敗時不能藉由刪除既有 Transaction 來假裝完成
  rollback。
- 使用 `sourceTransactionId` 作為新 Allocation identity 可讓 retry 與查找更直接，
  但需要 legacy random-ID fallback 與 lazy normalization。
- 對重新分配不使用 operation record 可降低 audit record 數量，但它只適用於
  deterministic desired-state replacement，不適用於新增 financial source event。

## 不在本 ADR 範圍

- Retirement plan activation、child replacement 與 reorder 的 atomicity。
- Allocation history、版本化審計或多筆歷史 Allocation 並存。
- 將 Allocation 擴展到其他 IntentType。
- 一次性清理所有既有 random-ID Allocation。

## 驗證要求

後續實作必須在 application boundary 驗證 permission、payload validation、key
replay/conflict、default mapping 與錯誤傳遞；在 Firebase Emulator 驗證成功寫入、
任一寫入失敗的全量 rollback、同一 source 的 deterministic identity、legacy
fallback、重新分配 concurrency，以及 operation record 的持久化內容。