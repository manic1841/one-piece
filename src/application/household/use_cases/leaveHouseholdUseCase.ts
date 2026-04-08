import { updateUserProfileUseCase } from '@/application/user/use_cases/updateUserProfileUseCase';

export interface LeaveHouseholdRequest {
  uid: string;
}

export class LeaveHouseholdUseCase {
  async execute(request: LeaveHouseholdRequest): Promise<void> {
    const { uid } = request;
    await updateUserProfileUseCase.execute({ uid, updates: { householdId: undefined } });
  }
}

export const leaveHouseholdUseCase = new LeaveHouseholdUseCase();
