# 報表分析是單一路由，KPI 以錨點深連結下鑽

**日期：** 2026-11-05
**狀態：** 已實作
**規範來源：** [financial_analysis.md](../financial_analysis.md)、[visual-standards.md](../ui/visual-standards.md)「歷史財務分析」

`/reports` 是目前唯一的報表入口，但清單只是檔案庫，使用者仍得一期一期點開三張報表自己在腦中拼湊趨勢。分析需求同時包含淨資產、收支與儲蓄率、淨現金流三組觀察，卻共用同一段歷史與同一個時間範圍；若拆成三條以上子路由，範圍選擇、資料截止與未關帳提示都要各自複製一份。

因此 `/reports/analysis` 是一條單一路由，區塊以錨點分節（`#net-worth`、`#asset-composition`、`#investment-performance`、`#income`、`#cash-flow`、`#debt-leverage`、`#cash-coverage`），後續觀察直接增節而不新增路由。landing 的四個 KPI 直接深連結到對應錨點，總資產與總負債另帶一次性的 `?series=` 預先勾選脈絡線。範圍放在 `?range=` 並以 replace 更新，讓返回清單後仍停在同一段歷史。

分析頁的錨點刻意與 [ADR-0053](0053-dashboard-report-anchored.md) 的儀表板不同：儀表板是「現況」，錨定最新**已關帳**月份；分析頁是「證據」，錨定最新**有資產負債表報表**的期間（含未關帳），並固定揭露資料截止與未關帳期數。兩頁回答不同問題，不共用錨定契約。

## Considered Options

- **三條以上子路由**（`/reports/analysis/net-worth` 等）：否決，範圍、截止與未關帳提示會各自複製，且圖表之間的對照需要跨路由。
- **沿用儀表板的已關帳錨定**：否決，分析頁會看不到最新一期的暫定資料，失去「證據頁」的意義。
- **`?series=` 持續回寫**：否決，深連結是一次性的進入意圖，回寫會讓切換圖例改動網址。

## Consequences

- 分析頁與儀表板自此是兩套獨立的錨定契約；改動其一不會連帶另一頁。
- 單一路由讓範圍、截止與未關帳只有一份實作，代價是所有觀察綁在同一段歷史上。
- 因為每個軸點都要能下鑽，報表與 snapshot 的交集是硬條件，而不只是顯示細節。
- 行為契約（錨定、可畫期間、空值、公式）住 [financial_analysis.md](../financial_analysis.md)；
  版面、互動與無障礙住 [visual-standards.md](../ui/visual-standards.md)「歷史財務分析」。
  本 ADR 不重述兩者。
