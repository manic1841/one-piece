# asset:cash 不區分銀行帳戶

**狀態：** 已接受
**規範來源：** [data-structure.md](../data-structure.md) §跨集合規則；`CONTEXT.md` 的 Cash

日常記帳只在意「花了多少」,不在意「用哪個帳戶」,強制區分銀行會增加記帳摩擦、難以持續。統一用 asset:cash 記錄,不細分是哪張銀行帳戶或信用卡。取捨是月底對帳需另外依賴 Account(真實帳戶)的總額來核對,entries 本身無法回答「這筆支出用哪個帳戶付」。
