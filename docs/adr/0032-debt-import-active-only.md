# 債務還款匯入僅限 active 帳戶

掃描所有 isActive=true 的 DebtAccount,每筆建立一筆 type=debt_payment 支出類別,搭配最近 12 個月 DebtSnapshot 彙總 totalPaid/interestPaid。已結清貸款不納入退休試算的未來支出。
