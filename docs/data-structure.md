```
firestore
  ├─ access_control
  │    ├─ whitelistEmails  
  │    ├─ updatedAt
  │    └─ updatedBy
  
  ├─ users
  │    ├─ uid  
  │    ├─ email
  │    ├─ displayName
  │    ├─ photoURL
  │    ├─ role: "owner" | "admin" | "member" | "guest"
  │    └─ householdId               # chosen last time
  
  └─ households/{id}                # 家庭設定（根 document）
       ├─ name
       ├─ createdAt
       └─ members: array
       │    ├─ uid
       │    ├─ name
       │    └─ role: "owner" | "admin" | "member" | "guest"
      
       ├─ projects/{id}                # 專案帳戶
       │    ├─ name
       │    ├─ color
       │    ├─ icon
       │    ├─ description
       │    ├─ isPersonal                    # 零用錢
       │    ├─ isActive
       │    └─ createdAt
       │
       │    └─ snapshots/{id}        # Subcollection: 每月快照
       │         ├─ year
       │         ├─ month
       │         ├─ openingBalance
       │         ├─ income
       │         ├─ expense
       │         ├─ closingBalance
       │         └─ createdAt
       │         # 🔹 建議索引: date DESC
      
       ├─ projectTransactions/{id} # 專案資金調度
       │    ├─ date
       │    ├─ type: "allocation" | "transfer" | "adjustment"
       │    ├─ fromProject (nullable)
       │    ├─ toProject
       │    ├─ amount
       │    ├─ description
       │    ├─ incomeSource
       │    ├─ createdBy
       │    └─ createdAt
       │    # 🔹 建議索引: toProject, date DESC | fromProject, date DESC
      
       ├─ transactions/{id}         # 日常交易
       │    ├─ date
       │    ├─ amount
       │    ├─ type: "income" | "expense"
       │    ├─ projectId
       │    ├─ category
       │    ├─ description
       │    ├─ createdBy
       │    └─ createdAt
       │    # 🔹 建議索引: projectId, date DESC | householdId, date DESC
      
       ├─ plannedIncome/{id}             # 分配收入
       │    ├─ date
       │    ├─ amount
       │    ├─ category: "salary" | "bonus" | "other"
       │    ├─ description
       │    ├─ createdBy
       │    ├─ createdAt
       │    ├─ allocations: array
       │    │    ├─ projectId: string
       │    │    ├─ percentage: number
       │    │    └─ lastUsedAmount?: number
       │    │
       │    └─ userSettings: object
       │        ├─ modifiedAt?: Timestamp
       │        └─ adjustedAllocations?: array
       │            ├─ projectId: string
       │            └─ percentage: number
      
       └─ accounts/{id}          # 銀行帳戶
            ├─ name
            ├─ type: "bank" | "cash" | ...
            ├─ currency
            └─ createdAt
      
            └─ snapshots/{id}          # Subcollection: 每月餘額快照
                 ├─ year
                 ├─ month
                 ├─ amount
                 ├─ createdBy
                 └─ createdAt
                 # 🔹 建議索引: date DESC
```