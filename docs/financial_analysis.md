# 歷史財務分析 (Financial Analysis)

`/reports/analysis` 是報表的分析子頁，只讀**已產生報表**與既有 portfolio snapshot，提供
跨期間的淨資產、資產類別、投資績效、收支、淨現金流與負債槓桿觀察。路由與錨定的決策理由見
[ADR-0090](adr/0090-report-analysis-single-route-and-anchor.md)；報表本身的語意見
[financial_report.md](financial_report.md)。

## 1. 分析錨點

分析頁錨定**最新且有資產負債表報表的期間，不論狀態**。範圍終點固定在錨點，不回推今天。

這與儀表板錨定最新已關帳月份刻意不同：儀表板是現況頁，分析頁是證據頁。錨點非已關帳時，
KPI 期間旁顯示 `StatusGlyph` 與「未關帳」；頁面 description 固定揭露資料截止與未關帳期數。
取捨見 [ADR-0053](adr/0053-dashboard-report-anchored.md) 與 ADR-0090。

沒有同月損益表時，儲蓄率顯示「—」，不往前找。完全沒有任何資產負債表時，整頁顯示空狀態。

## 2. 可畫期間

可畫期間是任何有該區塊所需報表型別的已產生報表月份，**不檢查財務期間狀態**。各區塊各自
只取有對應報表型別的月份：

| 區塊         | 報表型別                             |
| ------------ | ------------------------------------ |
| 淨資產       | 資產負債表                           |
| 資產類別構成 | 資產負債表（僅 `assets.total > 0`）  |
| 投資績效     | 資產負債表 ∩ 每個 portfolio 當月 snapshot |
| 收支         | 損益表                               |
| 淨現金流     | 現金流量表                           |
| 負債與槓桿   | 資產負債表（僅 `assets.total > 0`）  |

只有 snapshot 的月份不畫；投資績效與負債槓桿的 snapshot 由既有 list-all 讀取後在
workflow 內依範圍過濾，不改 repository。

缺月份自軸省略、不補 0；軸僅由有報表的月份構成。區塊在目前範圍內可畫期間少於 2 期時顯示
「此範圍內不足 2 期」。

## 3. 指標

- **淨資產** ＝ 資產負債表資產總計 − 負債總計。
- **儲蓄率** ＝ (損益表 `incomeTotal` − `expenseTotal`) ÷ `incomeTotal`，顯示一位小數百分比。
  `incomeTotal <= 0` 時為 `null`；負儲蓄率正常呈現為負值。口徑是應計基礎，不等於現金流。
- **淨現金流** ＝ 現金流量表 `netCashChange`，以現金為基礎，正值與負值分別向上與向下。

## 4. 範圍

範圍以 replace 更新，終點固定錨點。依可用月份數去除產生相同結果的選項；有效選項只剩一個
時整條範圍控制隱藏。

## 5. 未關帳

範圍內的未關帳月份是暫定資料。圖上與範圍下方的標示方式見
[visual-standards.md](ui/visual-standards.md) 的 Analysis View；未關帳提示不使用 `Alert`，
`Alert` 只保留給載入錯誤。

## 6. 空值與狀態

KPI 缺對應報表時顯示「—」；資產或負債為 0 仍是合法序列。載入為各區塊 Skeleton、錯誤為
頂部 warning alert 與重試、空為共用空狀態。圖表 tooltip 只列目前可見序列，被關閉的序列不
進 tooltip、不影響軸範圍。

## 7. 資產類別構成

回答「資產以什麼形式持有」，與按標的看的持倉配置是兩個視角。

- 三條固定序列直接映射資產負債表的現金（`assets.groups.cash`）、投資
  （`assets.groups.investment`）與不動產（`assets.groups.property`）群 `total`。
- 分母固定 `assets.total`，由 workflow 隨點帶出；佔比在 UI 以 `群 total ÷ assets.total ×
  100` 計算，不重算分母。
- 圖例切換只影響可見性，**不重新歸一化**；可見序列的佔比因此可能合計不到 100%。
- `assets.total > 0` 才收；為 0 的月份視同缺月。群值可為負，照原值堆疊。
- 100% 堆疊面積、y 軸固定 0–100。序列使用類別色板（`chart-1`／`chart-4`／`chart-3`），
  不佔用語意 tone。

## 8. 投資績效

- 每點 `{ yearMonth, gain, openingValue, returnRate }`；`gain` 與 `openingValue` 為所有
  portfolio 在該月的加總，`returnRate = gain ÷ openingValue × 100`，`openingValue <= 0` 時
  為 `null`。
- 口徑是家庭層「加總後相除」，不是各 portfolio 報酬率的平均。
- 只收同時有當月資產負債表、且**每個** portfolio 都有當月 snapshot 的月份；部分 portfolio
  缺 snapshot 時家庭加總會偏低，因此該月不收。
- 上層報酬金額柱（正負分向）、下層報酬率折線（零基準、`null` 斷線）。

## 9. 負債與槓桿

- 每點 `{ yearMonth, liabilities, assetsTotal, debtRatio, leverage }`；可畫期間為
  `assets.total > 0` 的資產負債表月份，負債為 0 仍是合法點。
- `debtRatio = liabilities ÷ assetsTotal × 100`。
- `leverage` 是家庭持倉以市值加權的 `Σ(marketValue × leverage ?? 1) ÷ ΣmarketValue`；該月
  無 snapshot 或 `ΣmarketValue <= 0` 時為 `null`，只斷槓桿線。
- 兩個比率意義不同：負債比是存量槓桿，加權平均槓桿是持倉曝險倍數，不得互相換算。
- 槓桿層只在目前範圍任一點 `leverage > 1` 時出現；否則不渲染該層，改在區塊底部說明
  「此範圍內持倉無槓桿」。
