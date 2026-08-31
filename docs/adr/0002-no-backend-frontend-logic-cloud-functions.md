# 不自建後端服務,邏輯留在前端

選定 Firebase(0001)後,不架設獨立 API Server。所有商業邏輯留在前端(React + TypeScript),資料存取權限交由 Firestore Security Rules 控制;未來若出現前端無法處理的情境(保密運算、排程任務、第三方 API 整合),才引入 Cloud Functions。取捨是正確性保證高度依賴 Security Rules 撰寫是否嚴謹,而非伺服器端驗證。
