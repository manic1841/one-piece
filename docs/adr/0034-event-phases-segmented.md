# 事件模型採分段 phases[] 設計

人生階段型收支(教育、醫療等)在不同時間區段可能有不同計算方式。每個事件可拆成多個 phase,每段獨立設定 startYear/endYear 與 mode(FIXED 用 amount+growthRate,SALARY_PERCENTAGE 用 percentage+linkedIncomeId)。驗證規則:endYear >= startYear,FIXED 必填 amount,SALARY_PERCENTAGE 必填 percentage。
