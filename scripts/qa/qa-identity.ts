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

/**
 * The public fake API key every emulator-facing surface must agree on. The
 * browser SDK keys its persisted Auth entry (`firebase:authUser:<apiKey>:…`) by
 * this value, so the app (`.env.development`) and the E2E session installer must
 * use the SAME key or the app never sees the seeded session. It must equal
 * `VITE_FIREBASE_API_KEY` in `.env.development` and `docker-compose.yml`.
 */
export const EMULATOR_API_KEY = 'fake-api-key';
