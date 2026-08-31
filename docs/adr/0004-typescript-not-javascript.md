# 採用 TypeScript 而非 JavaScript

系統涉及複式簿記、專案帳戶、退休試算等複雜資料結構,且是長期維護的個人專案,沒有團隊 code review 把關。採用 TypeScript 而非 JavaScript,換取編譯期型別檢查、重構安全,並可搭配 Zod schema 推導型別。取捨是初期設定成本與部分第三方套件型別品質不一。
