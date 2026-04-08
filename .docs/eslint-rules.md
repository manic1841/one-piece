# ESLint Configuration - Development Guidelines

本專案的 ESLint 配置已根據 `GEMINI.md` 開發準則進行強化。

## 已啟用的規則

### ✅ 強制執行 (Error)

**1. 禁止使用 `any` 型別**

```javascript
'@typescript-eslint/no-explicit-any': 'error'
```

- 必須使用明確的型別定義
- 如果型別複雜，請先定義 Interface 或 Type

### ⚠️ 警告提示 (Warning)

**2. 巢狀層數限制**

```javascript
'max-depth': ['warn', 3]
```

- 最多 3 層巢狀
- 建議使用 Guard Clauses（提早 return）

**3. 函式大小限制**

```javascript
'max-lines-per-function': ['warn', { max: 300 }]
```

- 單一函式建議不超過 300 行
- 超過時考慮提取為獨立函式或 Custom Hooks

**4. 複雜度限制**

```javascript
'complexity': ['warn', 15]
```

- 循環複雜度（Cyclomatic Complexity）≤ 15
- 保持函式邏輯簡單易懂

**5. 檔案大小限制**

```javascript
'max-lines': ['warn', { max: 400 }]
```

- 單一檔案建議不超過 400 行
- 鼓勵模組化設計

**6. 單一職責原則**

```javascript
'max-classes-per-file': ['warn', 1]
```

- 一個檔案一個 class
- 避免產生「萬能類別」（God Objects）

## 未加入但建議手動遵守的規則

### 變數命名

- ❌ 避免：`data`, `info`, `item`, `temp`, `tmp`
- ✅ 使用：具體描述變數用途的名稱

### 布林變數命名

必須回答是非題：

- ✅ `isEnabled`, `hasAccess`, `shouldRetry`
- ✅ `canEdit`, `willUpdate`, `didChange`

### 註解規則

- 只解釋「為什麼」（WHY），不解釋「做什麼」（WHAT）
- 不要保留被註解掉的舊程式碼（用 Git 管理）

## 使用方式

```bash
# 檢查程式碼品質
pnpm lint

# 常見警告的處理方式
# - 函式過長 → 提取為多個小函式
# - 巢狀過深 → 使用 Guard Clauses 提早 return
# - 複雜度過高 → 簡化邏輯或拆分函式
```

## 設計哲學

這些規則基於以下原則：

- **KISS**: 愚蠢的簡單 > 聰明的複雜
- **YAGNI**: 只解決當下的問題
- **DRY**: Rule of Three - 第三次出現時才重構
- **Pragmatism**: 程式碼必須能跑且穩定
