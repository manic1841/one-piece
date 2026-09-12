import { type HouseholdCreate } from '@/domains/household/schemas';
import { householdRepository } from '@/infra/repositories/householdRepository';

// Caller input: memberUids is omitted because the use case derives it from members.
export type HouseholdCreateInput = Omit<HouseholdCreate, 'memberUids'>;

export interface CreateHouseholdRequest {
  data: HouseholdCreateInput;
  userEmail: string;
}

export class CreateHouseholdUseCase {
  async execute(request: CreateHouseholdRequest): Promise<string> {
    const { data, userEmail } = request;
    const memberUids = Object.keys(data.members);

    return await householdRepository.create(
      [],
      {
        ...data,
        memberUids,
      },
      userEmail,
    );
  }
}

export const createHouseholdUseCase = new CreateHouseholdUseCase();
