# 舊退休實作整批刪除，不寫資料遷移

**日期：** 2026-10-20
**狀態：** 已接受
**規範來源：** [retirement-system.md](../retirement-system.md) §1

退休重設計的模型與 v1 不相容：子集合消失、金額欄位換成規則、時間軸搬進投影。v1 沒有線上資料，因此舊實作直接整批刪除——domain、application use case、UI feature、repository、admin 遷移腳本、舊 ADR 一起退場，不寫把 v1 文件轉成新模型的腳本。

理由是新模型的第一份資料就是重算出來的。留著 `migrate-retirement-v1.ts` 等於維護一支沒有使用者的程式，而它的輸出水準（平坦金額轉規則）也只能是猜的。

## Considered Options

**寫遷移腳本保留舊資料。** 否決原因是舊資料的品質不足以當作新模型的起點：平坦金額要轉成哪一種 Method 是啟發式判斷，轉完還是得人工看過一遍，那不如重建。

## Consequences

- `docs/adr/` 中十一條退休專屬決策標為已被取代，兩條改寫。
- 既有備份的退休段在 v2 匯入時被拒絕（ADR-0084）。
