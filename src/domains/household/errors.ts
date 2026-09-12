/**
 * Typed errors for the household join flow.
 *
 * `OnboardUserUseCase` inspects these to decide whether an admin may safely
 * fall back to household creation. Only not-found / invalid-input conditions
 * trigger creation; permission, network, and unknown errors propagate.
 */
export class HouseholdNotFoundError extends Error {
  constructor(message = 'Household not found') {
    super(message);
    this.name = 'HouseholdNotFoundError';
  }
}

export class InvalidHouseholdInputError extends Error {
  constructor(message = 'Household ID or household name is required') {
    super(message);
    this.name = 'InvalidHouseholdInputError';
  }
}

export const isMissingHouseholdError = (error: unknown): boolean =>
  error instanceof HouseholdNotFoundError || error instanceof InvalidHouseholdInputError;
