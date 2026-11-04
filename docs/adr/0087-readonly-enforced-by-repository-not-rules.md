# 投影唯讀由 repository 契約強制，`firestore.rules` 不加專屬規則

**日期：** 2026-10-20
**狀態：** 已接受
**規範來源：** [retirement-system.md](../retirement-system.md) §2

`firestore.rules` 目前對退休集合沒有任何專屬規則，走 `households/{id}/{allSubcollections=**}` 的 catch-all：admin 可寫、member 可讀。投影要唯讀，看起來最自然的位置是加一條「projection 只准 create」的規則。我們選擇不加，改由 repository 不提供 `update` 方法來保證。

理由是這個 repo 的 household 成員在 catch-all 下本來就能寫所有子集合，唯讀是應用層而非安全層的約束；寫進規則就得為投影開一個例外分支，之後每次動規則都要記得繞過它，而規則對「這個 use case 到底該不該寫」一無所知。約定改成：投影的寫入路徑只有建立與刪除兩個 use case。

## Considered Options

**在 `firestore.rules` 加 create-only 規則。** 否決原因如上：它擋得住誤寫，但要多維護一段與 catch-all 平行的分支，換來的保證只在直連 Firestore 時才有意義。

## Consequences

- 投影的唯讀性是團隊約定，繞過 repository 直寫不會被擋。
- 集合改名為 `retirementPlans` / `projections`，規則檔仍然零改動。
