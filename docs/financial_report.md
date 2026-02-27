# 財務報表計算邏輯說明

本文檔說明系統中三大財務報表（損益表、資產負債表、現金流量表）的計算邏輯。

---

## 1. 損益表 (Income Statement)

損益表反映特定期間內的經營成果。

#### 資料結構 (Data Structure)

```typescript
interface IncomeStatementData {
  revenue: {
    total: number;
    items: IncomeStatementItem[];
  };
  expenses: {
    total: number;
    items: IncomeStatementItem[];
  };
  netIncome: number;
}

interface IncomeStatementItem {
  category: string; // 對應 IncomeSubCategory 或 ExpenseSubCategory
  amount: number;
  subItems?: Array<{
    name: string;
    amount: number;
    sourceType?: 'transaction' | 'project' | 'manual' | 'plannedIncome';
    sourceId?: string;
  }>;
}
```

### 收入 (Revenue)

- **計畫收入 (Planned Income)**: 從使用者的計畫收入資料中提取，包含：
  - 薪資 (Salary)
  - 獎金 (Bonus)
  - 其他固定收入 (Other Income)
- **專案收入 (Project Income)**: 標記為 `INCOME` 類別的專案結餘。

### 支出 (Expenses)

- **專案支出 (Project Expenses)**: 標記為 `EXPENSE` 類別的專案支出金額。

### 本期損益 (Net Income)

- **計算公式**: `收入總計 - 支出總計`

---

## 2. 資產負債表 (Balance Sheet)

資產負債表反映特定時間點的財務狀況。

#### 資料結構 (Data Structure)

```typescript
interface BalanceSheetData {
  assets: {
    total: number;
    items: BalanceSheetItem[];
  };
  liabilities: {
    total: number;
    items: BalanceSheetItem[];
  };
  equity: {
    total: number;
    items: BalanceSheetItem[];
  };
}

interface BalanceSheetItem {
  category: string; // 對應 AssetSubCategory, LiabilitySubCategory 或 EquitySubCategory
  amount: number;
  subItems?: Array<{
    name: string;
    amount: number;
    sourceType?: 'account' | 'project' | 'manual';
    sourceId?: string;
  }>;
}
```

### 資產 (Assets)

- **帳戶資產 (Account Assets)**: 包含銀行存款、現金、投資帳戶（股票/基金）及其他資產帳戶的餘額。
- **專案資產 (Project Assets)**: 標記為 `ASSET` 類別的專案項目（如：房地產估值、固定資產）。

### 負債 (Liabilities)

- **專案負債 (Project Liabilities)**: 標記為 `LIABILITY` 類別的項目（如：房貸、車貸、信用卡欠款）。

### 淨資產 (Net Worth)

- **計算公式**: `總資產 - 總負債`
- _備註：系統遵循會計基本恆等式（資產 = 負債 + 淨資產）。_

---

## 3. 現金流量表 (Cash Flow)

現金流量表反映現金的流入與流出情況。

#### 資料結構 (Data Structure)

```typescript
interface CashFlowData {
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  netChange: number;
  beginningBalance: number;
  endingBalance: number;
}

interface CashFlowSection {
  income: CashFlowItem[];
  expense: CashFlowItem[];
  netAmount: number;
  items: CashFlowItem[]; // 包含正負值的合併清單
}

interface CashFlowItem {
  category: string; // 對應 Operating / Investing / Financing SubCategory
  amount: number;
  subItems?: Array<{
    name: string;
    amount: number;
    sourceType?: 'account' | 'project' | 'manual';
    sourceId?: string;
  }>;
}
```

### 營業活動 (Operating Activities)

- **起點**: 以損益表的「本期淨利」作為經營現金的基礎。
- **調整**: 加上其他標記為 `OPERATING` 的現金專案（排除已在損益表中計算過的專案，避免重複計入）。

### 投資活動 (Investing Activities)

- **現金流入/流出**: 來自標記為 `INVESTING` 類別的專案交易（如：購買/出售資產、投資支出）。

### 融資活動 (Financing Activities)

- **現金流入/流出**: 來自標記為 `FINANCING` 類別的專案交易（如：借款、還還本金）。

### 現金變動與餘額

- **現金淨增減 (Net Change)**: `營業活動淨額 + 投資活動淨額 + 融資活動淨額`
- **期末現金 (Ending Balance)**: `期初現金 + 現金淨增減`
