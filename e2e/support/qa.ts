/**
 * Barrel for the E2E support helpers the specs use: QA identity, Auth
 * emulator session minting, and session installation.
 */
export {
  QA_EMAIL,
  QA_HOUSEHOLD_ID,
  QA_PASSWORD,
  signInEmulatorUser,
  signInNonWhitelistedUser,
} from './emulator';
export { installEmulatorSession } from './auth';
