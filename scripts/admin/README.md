# Admin scripts

## Emulator QA bootstrap

瀏覽器 QA 前的環境準備:建立測試帳號、whitelist、household、user profile,並印出可直接貼入 DevTools 的 localStorage session 注入片段。

```bash
pnpm qa:init
```

前置條件:Firebase emulator 運行中(Firestore :8080、Auth :9099)。腳本可重複執行,已存在的資料會跳過或補齊連結。

### 注意事項

- 腳本連線目標讀取 `FIRESTORE_EMULATOR_HOST` /
  `FIREBASE_AUTH_EMULATOR_HOST` / `FIREBASE_PROJECT_ID` 環境變數,值可含
  或不含 `http://` 前綴;未設定時預設 `localhost:8080/9099` 與
  `demo-project`,並會印出實際解析後的連線目標。在 Docker dev stack 內:

  ```bash
  FIRESTORE_EMULATOR_HOST=firebase:8080 \
  FIREBASE_AUTH_EMULATOR_HOST=firebase:9099 \
  FIREBASE_PROJECT_ID=demo-project \
  pnpm qa:init
  ```

  `grant-admin.js`、`list-users.js`、`check-role.js` 連線正式 Firebase
  後端,不使用這些模擬器環境變數。
- 印出的 localStorage 注入片段在 Firebase JS SDK v12 可能不足以登入:SDK
  以 IndexedDB(`firebaseLocalStorageDb`)為主要 session 來源,localStorage
  僅為 fallback。詳細說明見 [docs/testing.md](../../docs/testing.md) 的
  「瀏覽器 QA 環境注意事項」。

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
