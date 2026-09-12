/**
 * Shared QA fixture identity.
 *
 * Single source of truth for the emulator QA account/household used by
 * both the auth bootstrap (qa:init) and the data seeder (qa:seed), so the
 * seeded financial data always attaches to the signed-in QA user.
 */

export const QA_EMAIL = 'qa@onepiece.test';
export const QA_PASSWORD = 'password123';
export const QA_DISPLAY_NAME = 'QA Tester';
export const QA_HOUSEHOLD_ID = 'qa_household';
