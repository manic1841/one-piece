# Allocation 建立與目前狀態取代的原子性與 identity

**狀態：** 已接受
**規範來源：** [transaction-flow.md](../transaction-flow.md)；[data-structure.md](../data-structure.md) §allocations

## 背景

Allocation 是管理會計決策，不是真實財務事件；Transaction 仍是財務 source，
這項邊界由 [ADR-0011](0011-allocation-separate-collection.md) 定義。現有收入與
支出表單會先建立 Transaction，再建立 Allocation，最後把 `allocationId` 回寫到
來源 Transaction。這三個步驟若分開執行，可能留下孤立 Allocation 或在不確定的
網路重試後產生重複財務 Transaction。

## 決策

初次建立帶分配的收入或支出，視為一個 composite command：資料必須在同一筆
Firestore transaction 中成功提交；任一驗證、寫入、競爭或重試衝突失敗時，本次
command 新建的所有資料一起 rollback。沒有 Allocation 的一般 Transaction 仍是
合法狀態，但不屬於這個 composite command。

這個 command 會新增不可重複的 financial source event，因此依
[ADR-0038](0038-command-atomicity-and-retry-policy.md) 歸類為不可重複的 command：
caller 必須提供 idempotency key，並以 operation record 保存成功結果、payload
fingerprint、狀態與最小必要的 audit reference。

重新分配則相反：同一個 `sourceTransactionId` 只有一筆目前有效的 Allocation，
重新分配不新增 financial source event，只是取代目前狀態，因此走 atomic
desired-state 契約、不要求 idempotency key；相同 desired state 重試必須安全，
不同 desired state 代表新的使用者意圖。

第一版只處理 `INCOME` 與 `EXPENSE`。Debt Payment、Transfer、Manual、Investment
與 Financing 不因本 ADR 改變 Allocation 語意。

## 取捨

- 將初次建立包成 composite command，會讓 application boundary 比目前表單依序
  呼叫多個 use case 更窄，但能避免財務 Transaction 與其管理分配互相失聯。
- 保留「無 Allocation 的 Transaction 合法」可維持 Allocation 不是真實財務事件的
  domain 定義；代價是 Allocation 失敗時不能藉由刪除既有 Transaction 來假裝完成
  rollback。
- 使用來源交易作為新 Allocation 的 identity 可讓 retry 與查找更直接，但需要
  legacy random-ID fallback 與 lazy normalization。
- 對重新分配不使用 operation record 可降低 audit record 數量，但它只適用於
  deterministic desired-state replacement，不適用於新增 financial source event。

## 不在本 ADR 範圍

- Retirement plan activation、child replacement 與 reorder 的 atomicity。
- Allocation history、版本化審計或多筆歷史 Allocation 並存。
- 將 Allocation 擴展到其他 IntentType。
- 一次性清理所有既有 random-ID Allocation。