import { describe, expect, it } from 'vitest';

import { RetirementFormValidationLabels } from './formValidationLabels';

describe('RetirementFormValidationLabels pinning', () => {
  it('pins the canonical validation wording shown to users', () => {
    expect(RetirementFormValidationLabels).toEqual({
      name: '請輸入名稱',
      eventName: '請輸入事件名稱',
      phaseName: '請輸入階段名稱',
      eventAmount: '請輸入金額',
      validAmount: '請輸入有效金額',
      currentAnnual: '請輸入目前年支出',
      retirementMultiplier: '請輸入退休後費用比例',
      currentYear: '請輸入目前年度',
      birthYear: '請輸入出生年度',
      retirementAge: '請輸入退休年齡',
      lifeExpectancy: '請輸入預期壽命',
      inflationRate: '請輸入通膨率',
      investmentReturnRate: '請輸入投資報酬率',
      startYear: '請輸入開始年度',
      endYear: '請輸入結束年度',
      growthRate: '請輸入有效成長率',
      atLeastOnePhase: '至少需要一個階段',
    });
  });
});
