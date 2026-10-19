# Projection 結果文件大小估算（#321）

## 結論（先講）

- 單一 `results/annual` 文件在 Firestore 1 MiB 文件上限下**安全，不需要切 chunk**。
- 最壞現實情境（60 年 × 每年 20 筆收入＋25 筆支出明細、20 bytes 名稱、9 位數金額）量到
  **157,751 bytes（150.9 KiB，上限的 15.0%）**，仍有 **6.6 倍**餘裕。
- 真正逼近上限的是 `snapshots/source` 的逐筆分錄明細，不是 results：現實情境約 75 KB，
  悲觀情境（3,000 筆）約 603 KB；**約 2,500 筆分錄**後就該切 chunk 或只保留規則命中的分錄。
- 因此「單一 results 文件」的決策可維持；風險控制點應寫在 source snapshot 的規則裡。

## 1. 輸出面積

`RetirementProjectionYearSchema`（`src/domains/retirement/schemas.ts:197`）每年固定產出：

| 類別 | 欄位 |
| --- | --- |
| 識別（3） | `year`, `age`, `isRetired` |
| 現金流（3） | `totalIncome`, `totalExpense`, `netCashFlow` |
| 餘額（5） | `openingBalance`, `investmentIncome`, `oneTimeIncome`, `oneTimeExpense`, `closingBalance` |
| 明細（2 陣列） | `incomeBreakdown[]{name,amount}`, `expenseBreakdown[]{name,amount}` |
| 事件（1 陣列） | `events[]`（事件名稱字串） |

合計 **12 個純量 ＋ 2 個 breakdown 陣列 ＋ 1 個 events 陣列**。每筆 breakdown 是
`{name, amount}`，無 id、無巢狀物件。

## 2. 投影長度

`calculateRetirementProjection` 以 `currentYear .. currentYear + (lifeExpectancy - currentAge)`
**含頭含尾**迴圈（`retirementCalculator.ts:156-158`；測試亦以 `+1` 驗證行數）。

- 典型：35 歲、預期壽命 90 → `90 - 35 = 55` 年跨度 → **56 列**。
- 上限情境：40 歲、壽命 100 → 61 列；本估算以 **60 列** 作悲觀值，已覆蓋。
- 每列欄位數固定；差異只來自 breakdown 筆數與名稱/金額長度。

## 3. 方法

以 Node 腳本（§7）複製完整 schema，`Buffer.byteLength(JSON.stringify({ years }))` 量 UTF-8
bytes。情境參數：

- **現實**：8 收入＋12 支出明細／年、名稱 8 bytes、7 位數金額、56 年。
- **悲觀**：20 收入＋25 支出明細／年、名稱 20 bytes、9 位數金額、60 年。

## 4. 量測結果

| 情境 | 列數 | bytes/列 | 文件總 bytes | KiB | 佔 1 MiB | 餘裕 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 現實（8/12 明細） | 56 | 1,058 | 59,259 | 57.9 | 5.65% | 17.7× |
| 悲觀（20/25 明細） | 60 | 2,629 | 157,751 | 154.1 | 15.04% | 6.6× |
| 極端（40/40 明細） | 60 | 4,413 | 264,851 | 258.6 | 25.3% | 4.0× |

固定欄位本身每列僅約 274–290 bytes；成本幾乎全由 breakdown 決定（每筆 35–50 bytes）。

## 5. 對照上限

- 單一文件上限：**1 MiB（1,048,576 bytes）**（[Firestore quotas, Collections/documents/fields](https://firebase.google.com/docs/firestore/quotas#collections_documents_and_fields)）。
- 單一**欄位值**上限為 1 MiB − 89 bytes（1,048,487 bytes）。若 `results/annual` 把年度列放進
  單一 `years` 陣列欄位，適用後者，差距僅 89 bytes，不改變結論。
- Firestore 文件大小另含欄位名與 32 bytes 固定開銷；腳本未加索引額外成本，但量級不影響倍數。

**切 chunk 門檻列數**（以悲觀 2,629 bytes/列計）：

| 安全水位 | 列數 |
| --- | ---: |
| 100% 上限（1,048,576 B） | 約 398 列 |
| 50% 安全餘裕 | 約 199 列 |
| 現實值 1,058 B/列、100% 上限 | 約 990 列 |

投影上限約 60–70 列，遠低於 199 列門檻。

## 6. 另外兩份文件

### `snapshots/config`

assumptions（12 欄位）、projectionRules、lifeEvents 的完整快照。以 25 條規則、10 個事件 ×
3 phases 估：

| 元件 | 悲觀 bytes |
| --- | ---: |
| assumptions | 400 |
| 25 rules（含 source/method/endCondition） | 6,250 |
| 10 events × 3 phases | 3,300 |
| 外框與 metadata | 500 |
| **合計** | **約 10.5 KB（1.0%）** |

安全。

### `snapshots/source`（真正的風險）

`docs/retirement-system.md` §3 的來源明細包含 `ledgerCode`、`debit`/`credit`；快照再帶
transactionId、date、description、ruleId。悲觀每筆約 **201 bytes**。

| 情境 | 分錄數 | bytes | 佔 1 MiB |
| --- | ---: | ---: | ---: |
| 現實（每月約 40 筆命中） | 500 | 約 75 KB | 7.2% |
| 悲觀 | 3,000 | 約 603 KB | 57.5% |
| 5,000 筆 | 5,000 | 約 1.0 MB | 95.8%（幾乎撞線） |

門檻：**約 5,200 筆**觸頂；50% 餘裕下 **約 2,600 筆**。來源明細應只存規則 baseline 命中的
分錄，不以整年全部 entries 為範圍。

## 7. 重現腳本

```js
// node size.mjs <income> <expense> <years> <nameLen> <digits>
const [nI, nE, years, nameLen, digits] = process.argv.slice(2).map(Number);
const N = (i, p) => `${p}${'x'.repeat(nameLen - p.length)}`;
const A = () => Number('1'.padEnd(digits, '0'));
const bd = (k, n, p) => ({ [k]: Array.from({ length: n }, (_, i) => ({ name: N(i, p), amount: A() })) });
const row = (y) => ({
  year: y, age: 61, isRetired: true,
  totalIncome: A(), totalExpense: A(), netCashFlow: A(),
  openingBalance: A(), investmentIncome: A(), oneTimeIncome: A(), oneTimeExpense: A(),
  ...bd('incomeBreakdown', nI, 'income'),
  ...bd('expenseBreakdown', nE, 'expense'),
  closingBalance: A(), events: ['Retire', 'Event 1', 'Event 2'],
});
const years_ = Array.from({ length: years }, (_, i) => row(2026 + i));
const bytes = Buffer.byteLength(JSON.stringify({ years: years_ }), 'utf8');
console.log({ bytes, perYear: bytes / years, pct: bytes / 1048576 });
```

- 現實：`node size.mjs 8 12 56 8 7` → 59,259 bytes。
- 悲觀：`node size.mjs 20 25 60 20 9` → 157,751 bytes。

## 8. 建議

1. `results/annual` 維持單一文件，不切 chunk。
2. 在 #322 的寫入契約註明 results 的實測上限與門檻（199 列／50%）。
3. `snapshots/source` 以「規則命中分錄」為範圍；命中超過約 2,600 筆時改存
   `snapshots/source_yearly/{year}` 或將 amount 彙總後只留明細摘要。
