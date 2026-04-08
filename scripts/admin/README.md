# Admin scripts

## 安裝 Firebase Admin SDK

```bash
pnpm install firebase-admin --dev
```

## 設定金鑰

```
$env:GOOGLE_APPLICATION_CREDENTIALS="/path/to/file.json"
```

## 執行

### 列出所有使用者角色

```bash
node list-users.js
```

### 授權管理員權限

```bash
node grant-admin.js <uid>
```

### 檢查使用者角色

```bash
node check-role.js <uid>
```
