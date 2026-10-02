# 狀態與無障礙 (States & Accessibility)

> **邊界宣告**：本文件是**資料狀態義務**與**無障礙契約**的唯一真相來源——空／載入／錯誤三種狀態的必備義務、ARIA 由誰負責、焦點可見性、鍵盤可及性與使用者偏好設定。狀態與元件的**視覺表面**（長什麼樣、用哪些 token、放哪個尺寸）屬 [`design-system.md`](design-system.md)；**頁面層級的佈局與互動標準**屬 [`visual-standards.md`](visual-standards.md)；**分層與依賴方向**屬 [`ui-layer-architecture.md`](ui-layer-architecture.md)。四份文件權威不重疊。

無障礙的機械防線是 `eslint-plugin-jsx-a11y` 的 `recommended` 設定，掛在 `eslint.config.js`：`pnpm lint` 必須零違規。本文件說明規則背後的契約；linter 沒涵蓋的義務同樣有效。

---

## 狀態契約 (States)

任何非同步區塊在任何時刻都必須明確落在三態之一：**empty**、**loading**、**error**。三者不得同時出現，也不得留白由使用者自行解讀。

### 空狀態 (Empty State)

空狀態不插圖、不做大型 Card。標準結構：

```text
○ NO DATA

No accounts have been added yet.

[ + ADD ACCOUNT ]
```

原則：

- icon / status + 一句說明 + 一個主要 action。
- 說明要回答三件事：缺什麼、為何重要、使用者下一步能做什麼。
- 不要大插畫、decorative illustration、大型 Card、大量文字。

### 載入狀態 (Loading)

- 一般 loading：單行文字（`Loading...`）。
- Skeleton 用於 Table / List / Detail。
- 長時間工作使用 Terminal-style 進度——這是 ONE PIECE 的 engineering identity：

```text
$ generate-reports --period SEP-2026

[████████████░░░░░░░░] 62%

→ Generating September financial statements...
```

### 錯誤狀態 (Error State)

- 錯誤必須 **Specific**、**Actionable**、**Close to the affected data**（靠近受影響的資料呈現，而非集中到頁首）。
- `Negative` 色僅用於真正的錯誤或負向狀態。
- 需要使用者解決的問題不得只用通用 toast 蓋掉——改用 inline alert 或 exception 呈現。

## 無障礙契約 (Accessibility)

### ARIA 由誰負責

- role 由**原生元素**或 **Radix primitive** 提供；呼叫端不重新發明 role。
- 表單欄位的 `aria-invalid` / `aria-describedby` 由 `FormControl` 注入（注入清單見 [`design-system.md`](design-system.md) §7 `form`）；欄位元件只負責轉發，不自行組裝。
- `ui/alert` 承擔 `role="alert"` live region；`CliProgress` 自繪進度條並自帶 `role="progressbar"` 與 `aria-value*`。其他自繪進度指示同樣必須自行補齊等價的 `role` 與 `aria-value*`。
- 拖曳排序的播報容器（`aria-live`）置於 table **外層**，不得成為 `tbody` 的子元素。
- 純裝飾的關閉 backdrop 標 `aria-hidden="true"`——它對輔助技術沒有意義。

### 焦點可見性

- 每個可互動元素都必須有可見的 focus 指示。移除 `outline` 就必須提供等價的替代。
- 這是義務而非樣式選擇：focus 樣式跟隨既有元件（`src/ui/components/`）已建立的模式；新元件不得自創。

### 鍵盤可及性

- **每個能用滑鼠完成的操作，都必須有鍵盤等價。**
- 互動一律使用原生元素（`button` / `a` / `input` / `select` / `textarea`）。
- 非原生互動元素只允許兩種，且都必須補齊鍵盤等價：
  1. **容器類元件**（整列或整塊可點擊的列／卡片）：`role="button"` + `tabIndex={0}` + Enter／Space 觸發。
  2. **裝飾性關閉 backdrop**：標 `aria-hidden="true"`，關閉的鍵盤等價由 Escape 承擔。

- 表單輸入必須有**可程式化關聯**的 label：`htmlFor` + `id`，或以 `<label>` 包覆控制項。Radix 的 checkbox / switch 控制項以 `<label>` 包覆，並在 eslint 設定中登錄為控制項。
- 浮層（popover / dialog / sheet）必須能用 **Escape** 關閉。
- 展開／收合類的控件必須帶 `aria-expanded`。

### 使用者偏好設定

`src/index.css` 已全域覆蓋以下偏好，因此**元件不重複處理，也不得用 inline style 繞過**：

| 偏好                           | 覆蓋方式                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `prefers-reduced-motion`       | 動畫與 transition 縮至近乎即時                                                |
| `prefers-reduced-transparency` | 依 [`design-system.md`](design-system.md) §3 的材質層級，浮動 chrome 改為實心 |
| `prefers-contrast: more`       | 浮動 chrome 加上可見邊界                                                      |

## 無障礙 Review Checklist

```text
ONE PIECE A11Y CHECK

[ ] 三態齊備：empty / loading / error 都不留白、不同時出現
[ ] 空狀態只有一句說明 + 一個主要 action
[ ] 錯誤就近呈現、可被解讀為行動
[ ] 互動全部是原生元素
[ ] 非原生互動元素有 role + tabIndex + Enter/Space
[ ] 每個輸入都有可程式化關聯的 label
[ ] 浮層都能用 Escape 關閉
[ ] 展開/收合控件帶 aria-expanded
[ ] 沒有移除 outline 而無 focus 替代
[ ] 純裝飾元素不進 accessibility tree
```
