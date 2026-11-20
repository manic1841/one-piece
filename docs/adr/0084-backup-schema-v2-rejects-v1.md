# 備份 schemaVersion 升到 2 並直接拒絕 v1 備份

**日期：** 2026-10-20
**狀態：** 已接受
**規範來源：** [data-structure.md](../data-structure.md) §4（備份格式與範圍）；[retirement-system.md](../retirement-system.md) §9

退休重設計讓備份的 `retirementPlans` 形狀改變：子集合消失、`projections` 首次進入 payload、欄位整批改名。備份格式因此升到 `schemaVersion: 2`，匯入端遇到 `1` 直接拒絕，不寫任何遷移路徑。理由是舊備份的退休段在還原後只會是新模型讀不懂的死資料，而把 v1 轉成 v2 需要重算投影，等於在匯入端養一份平行的引擎。

還原沿用備份原有的文件 id，與其他 domain 一致；投影以三份固定子文件隨主文件一起還原，覆蓋式還原仍是子先主後。
