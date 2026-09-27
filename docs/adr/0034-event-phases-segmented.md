# 事件模型採分段 phases[] 設計

**狀態：** 已接受
**規範來源：** [retirement-system.md](../retirement-system.md) §2.4

人生階段型收支(教育、醫療等)在不同時間區段可能有不同金額與成長率。每個事件可拆成多個 phase,每段獨立設定 startYear/endYear、amount 與選擇性 growthRate。取捨是 schema 與驗證變複雜,但換取一個事件能表達多段人生情境,不需建立多個重複事件。

## Considered Options

- **單一計算模式欄位(含百分比計算模式,如薪資百分比)**: phase 需要宣告 mode 與 percentage,讓一個事件也能以「退休後收入的 X%」表達。實作與驗證開銷大,且與收入流的金額模型重疊,後續移除;phase 只保留固定金額。
