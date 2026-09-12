# Project 與會計科目分離

Project 是管理會計視圖(預算分配與追蹤),Journal Entry 是財務會計視圖(真實財務事件記錄),兩者本質不同,強行對應會造成混亂。管理會計關心「這筆錢從哪個用途扣」,財務會計關心「資產/負債/收入/費用如何變動」。分離後各自清晰,Project 餘額從 Allocation + Transaction 計算,報表從 entries 的 LedgerCode 計算,互不干涉。
