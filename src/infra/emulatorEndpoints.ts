/**
 * Emulator 連線端點（Vite dev-server proxy 路徑）。
 *
 * 瀏覽器跑在 host、app 跑在 compose 網路內時，host 通常只發佈 app 的 port，
 * emulator 的 8080/9099 並不對外；而瀏覽器也解析不到 compose 的 service hostname。
 * 因此 client 一律走「同源路徑」，由 Vite dev server 轉發到 emulator
 * （見 vite.config.ts 的 server.proxy）。
 *
 * 若瀏覽器本身就在 compose 網路內，可設 `VITE_FIREBASE_EMULATOR_HOST=firebase`
 * 改為直連，略過 proxy。
 *
 * 兩者的轉發方式不同，因為兩個 SDK 對 emulator URL 的處理不同：
 *
 * - Auth：`connectAuthEmulator` 會強制把 URL 路徑換成 `/`（SDK 原始碼註解：
 *   "Always replace path with '/' "），所以只能用 origin 根路徑。SDK 會產生
 *   `<origin>/identitytoolkit.googleapis.com/v1/...` 這類「假 API host」路徑，
 *   由 `AUTH_PROXY_PREFIXES` 逐一轉發。
 * - Firestore：channel base URL 是 `http://${host}:${port}` 字串串接，路徑可留在
 *   `port` 參數裡，因此用 `FIRESTORE_PROXY_PATH` 單一前綴。
 */
export const FIRESTORE_PROXY_PATH = '/__emulator/firestore';

/** Auth SDK 產生的假 API host 路徑（emulator 以這些前綴路由）。 */
export const AUTH_PROXY_PREFIXES = [
  '/identitytoolkit.googleapis.com',
  '/securetoken.googleapis.com',
  '/www.googleapis.com',
] as const;

/** Proxy 目標的預設值；可用 FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST 覆寫。 */
export const DEFAULT_FIRESTORE_EMULATOR_TARGET = 'firebase:8080';
export const DEFAULT_AUTH_EMULATOR_TARGET = 'firebase:9099';
