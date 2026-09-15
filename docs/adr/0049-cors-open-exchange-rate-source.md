# 匯率源使用 CORS 開放的每日匯率 CDN,不自建代理

## 狀態

已接受(2026-09)

## 背景與動機

舊匯率源 `tw.rter.info/capi.php` 不送 CORS header,生產環境(preview 與正式
channel)無法取得匯率;開發環境靠 Vite proxy 掩蓋了這個問題。Firebase Hosting
的 `rewrites` 無法代理外部 URL(只能指向本地檔案、Cloud Functions、Cloud Run),
同源代理只剩開後端一條路。

系統的匯率消費特性:只在快照編輯器「取得匯率」按鈕被消費,取得後凍結進
snapshot 文件,下游全是純台幣加總。實際用量約每月一次、一小時內不超過十次。
每日更新的匯率源完全足夠,即時性不是需求。

## 決策

1. **改用 `@fawazahmed0/currency-api`(jsDelivr CDN),直連、免 key、免
   attribution**。CORS 開放,實測連續爆發請求由 CDN 邊緣快取吸收。曾考慮
   `open.er-api.com`(老牌、文件完整,但條款要求頁面放置 attribution 連結)與
   Cloud Functions 代理(為一個 GET 引入整條後端鏈,違反 ADR-0002 的零後端
   現狀):皆不採。
2. **Client 契約是誠實的 USD 基準 rates map**(貨幣碼 → 每 1 USD 匯率),
   小寫碼正規化為大寫,非 ISO 4217 形狀的項目過濾;跨匯率由
   `GetLatestRateUseCase` 以 `to/from` 推導,保留 1 小時記憶體快取。不再捏造
   舊源的 `USDxxx.Exrate` 配對形狀。
3. **刪除 Vite proxy 與 dev/prod 分支,單一直連路徑**。CORS 開放後代理只剩
   歷史包袱,單一路徑讓生產問題在開發環境就能重現。
4. **取得失敗顯示錯誤、保留既有欄位值,不以預設值填補**。靜默回傳 1 會讓
   USD 帳戶以約 31 倍的誤差低估資產;既有「匯率需大於 0」驗證自然引導手動
   輸入。

## 後果

匯率準確性依賴社群維護的 CDN 資料源;若上游變更或終止,失敗會以明確錯誤
浮現(不靜默),屆時再評估替代源。`@latest` 標籤使上游資料日期即為所取值。
