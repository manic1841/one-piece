/**
 * Barrel for the E2E support helpers the specs use: QA identity, Auth
 * emulator session minting, session installation, the emulator reset, and the
 * Firestore counter the persistence claims assert against.
 */
export {
  QA_EMAIL,
  QA_HOUSEHOLD_ID,
  QA_PASSWORD,
  signInEmulatorUser,
  signInNonWhitelistedUser,
} from './emulator';
export { installEmulatorSession } from './auth';
export { countAccountSnapshots, resetQaEnvironment } from './reset';
