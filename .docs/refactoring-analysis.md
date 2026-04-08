# Code Refactoring Analysis

基於 ESLint 的程式碼品質檢查，以下是需要重構的檔案列表。

## 🔴 需要立即處理的檔案

### 1. **AccountDetailView.tsx** (396 行)

**問題：**

- 主函式 305 行（超過 300 行限制）
- 檔案總行數 396 行（接近 400 行限制）

**重構建議：**

```
提取獨立組件：
├─ AccountBasicInfo.tsx       # 基本資訊顯示
├─ AccountTransactionList.tsx # 交易列表
├─ AccountBalanceChart.tsx    # 餘額圖表
└─ hooks/
   ├─ useAccountData.ts        # 資料邏輯
   └─ useAccountActions.ts     # 操作邏輯
```

### 2. **reconciliationService.test.ts** (647 行)

**問題：**

- 測試檔案超大（647 行）
- 單一測試函式 333 行

**重構建議：**

```
拆分測試檔案：
├─ reconciliationService.basic.test.ts      # 基本功能測試
├─ reconciliationService.edge-cases.test.ts # 邊緣案例
└─ reconciliationService.integration.test.ts # 整合測試
```

### 3. **未知檔案** (372 行函式)

**問題：**

- 單一函式 372 行（超過 300 行限制）

**需進一步確認檔案名稱**

## ⚠️ 複雜度過高的檔案

### budgetCalculator.ts

**問題：**

- 循環複雜度超過 15

**重構建議：**

- 提取條件判斷為獨立的 pure functions
- 使用策略模式簡化分支邏輯
- 將複雜的迴圈邏輯拆分為小函式

## 📋 重構優先順序

**Priority 1（立即處理）：**

1. `AccountDetailView.tsx` - 使用者介面，影響維護性
2. `reconciliationService.test.ts` - 測試檔案，難以維護

**Priority 2（中期處理）：** 3. 查明 372 行函式所在檔案並重構 4. `budgetCalculator.ts` 複雜度優化

## 🛠️ 重構原則

### KISS 原則

- 單一組件/函式只做一件事
- 避免過度巢狀（最多 3 層）

### 提取策略

1. **UI 邏輯分離**：將顯示邏輯提取為獨立組件
2. **資料邏輯分離**：將 API 呼叫和狀態管理提取為 Custom Hooks
3. **共用邏輯提取**：將重複的計算邏輯提取為 helper functions

### Rule of Three

當同樣的邏輯出現第三次時，必須重構為共用函式。

## ✅ 下一步行動

1. 執行 `pnpm lint` 取得完整警告列表
2. 針對 Priority 1 檔案逐一重構
3. 每次重構後執行測試確保功能正常
4. 重新執行 lint 確認警告消除
