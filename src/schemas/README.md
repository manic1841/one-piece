# Zod Schema 驗證系統

本專案使用 Zod 進行 Firebase Firestore 數據的運行時驗證，確保數據類型安全。

## 為什麼使用 Zod?

1. **運行時驗證**: TypeScript 只在編譯時檢查類型，Zod 在運行時驗證數據
2. **數據安全**: 防止從 Firebase 讀取的無效數據進入應用程序
3. **自動類型推導**: 從 schema 自動生成 TypeScript 類型
4. **清晰的錯誤訊息**: 當驗證失敗時提供詳細的錯誤信息

## Schema 位置

所有 schema 定義在 `src/schemas/index.ts`

## 已實現的 Schemas

### 核心 Schemas

- `UserProfileSchema` - 用戶資料
- `HouseholdSchema` - 家庭資料
- `AccountSchema` - 帳戶資料
- `BalanceSnapshotSchema` - 餘額快照
- `TransactionSchema` - 交易記錄
- `AccessControlSchema` - 訪問控制
- `BudgetAllocationsSchema` - 預算分配
- `MonthlyBudgetSchema` - 月度預算

### 輔助 Schemas

- `TimestampSchema` - Firestore Timestamp 驗證
- `DateOrTimestampSchema` - 接受 Date、Timestamp 或 ISO 字串
- `ProjectCategorySchema` - 項目類別枚舉
- `IncomeCategorySchema` - 收入類別枚舉
- `AccountTypeSchema` - 帳戶類型枚舉

## 使用方式

### 1. 導入 Schema 和工具函數

```typescript
import { UserProfileSchema, parseWithSchema, parseWithSchemaOptional } from '../schemas';
import type { UserProfile } from '../schemas';
```

### 2. 驗證從 Firestore 讀取的數據

```typescript
// 獲取單個文檔
async getUser(id: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        // 使用 schema 驗證數據
        return parseWithSchema(UserProfileSchema, data);
    }
    return null;
}

// 獲取多個文檔
async getUsers(): Promise<UserProfile[]> {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return parseWithSchema(UserProfileSchema, data);
    });
}
```

### 3. 驗證用戶輸入

```typescript
async createUser(userData: unknown): Promise<string> {
    // 驗證並轉換用戶輸入
    const validatedUser = parseWithSchema(UserProfileSchema, userData);

    // 現在 validatedUser 是完全類型安全的
    await setDoc(doc(db, 'users', validatedUser.uid), validatedUser);
    return validatedUser.uid;
}
```

### 4. 可選驗證（不拋出錯誤）

```typescript
async getUserOptional(id: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        // 如果驗證失敗，返回 null 而不拋出錯誤
        return parseWithSchemaOptional(UserProfileSchema, data);
    }
    return null;
}
```

## 工具函數

### `parseWithSchema<T>(schema, data)`

- 驗證數據並返回類型化結果
- 驗證失敗時拋出錯誤
- 用於必須成功的場景

### `parseWithSchemaOptional<T>(schema, data)`

- 驗證數據並返回類型化結果或 null
- 驗證失敗時返回 null 並記錄警告
- 用於可選數據或降級場景

## 最佳實踐

### ✅ 應該做

1. **總是驗證從 Firestore 讀取的數據**

   ```typescript
   const data = docSnap.data();
   const validated = parseWithSchema(MySchema, data);
   ```

2. **在服務層進行驗證**
   - 在 `services/` 中的方法應該返回已驗證的數據
   - 組件可以信任從服務層獲得的數據

3. **處理驗證錯誤**
   ```typescript
   try {
     const validated = parseWithSchema(MySchema, data);
   } catch (error) {
     console.error('Validation failed:', error);
     // 處理錯誤...
   }
   ```

### ❌ 不應該做

1. **不要跳過驗證**

   ```typescript
   // ❌ 不好
   const user = docSnap.data() as UserProfile;

   // ✅ 好
   const user = parseWithSchema(UserProfileSchema, docSnap.data());
   ```

2. **不要在組件中直接讀取 Firestore**
   - 使用服務層來集中數據驗證

## 類型定義遷移

### 舊方式（僅 TypeScript）

```typescript
import { type User } from '../types';
```

### 新方式（Zod + TypeScript）

```typescript
import { UserProfileSchema } from '../schemas';
import type { UserProfile } from '../schemas';
```

## 已更新的服務

以下服務已實現 Zod 驗證：

- ✅ `householdService` - 家庭管理
- ✅ `accountService` - 帳戶管理
- ✅ `accessControlService` - 訪問控制
- 🔄 `transactionService` - 進行中
- 🔄 `budgetService` - 進行中

## 擴展 Schema

要添加新的 schema：

1. 在 `src/schemas/index.ts` 中定義
2. 導出 schema 和類型
3. 在相關服務中使用
4. 更新此文檔

### 示例：添加新 Schema

```typescript
// 1. 定義 schema
export const NewSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    email: z.string().email(),
    age: z.number().int().positive(),
});

// 2. 導出類型
export type NewType = z.infer<typeof NewSchema>;

// 3. 在服務中使用
import { NewSchema, parseWithSchema } from '../schemas';
import type { NewType } from '../schemas';

async getData(): Promise<NewType> {
    const data = await fetchData();
    return parseWithSchema(NewSchema, data);
}
```

## 錯誤處理

Zod 驗證錯誤會提供詳細信息：

```typescript
try {
  const result = parseWithSchema(UserProfileSchema, data);
} catch (error) {
  // Error: Data validation failed: Invalid email, uid must be a string
}
```

每個驗證錯誤都會記錄在控制台中，方便調試。

## 效能考量

- Zod 驗證有輕微的運行時開銷
- 對於大量數據，考慮使用批量驗證
- 生產環境中的驗證可以幫助捕獲數據問題
- 建議在所有從 Firestore 讀取的關鍵數據上使用

## 參考資料

- [Zod 官方文檔](https://zod.dev/)
- [Zod GitHub](https://github.com/colinhacks/zod)
