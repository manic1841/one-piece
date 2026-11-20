/**
 * 閒置時預取「下一步最可能走到的路由」。
 *
 * 只跑在 `Layout` 內，因此只有已登入、已有家戶的使用者會付這筆成本；在 `/login`
 * 訪客身上預取會連 Firestore 一起抓下來，並不划算。
 *
 * 用 `import()` 而不是 `<link rel="prefetch">`：Vite 直接把它映射成同一個 chunk
 * 請求，不必另外維護 asset 清單。prefetch 只暖快取，不 prerender——prerender 會把
 * 整棵 React 樹與 Firebase 初始化再跑一次。
 */
const PREFETCH = [() => import('@/ui/features/transaction/pages/TransactionsPage')];

const whenIdle = (task: () => void): void => {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => task(), { timeout: 3000 });
    return;
  }
  // Safari 沒有 requestIdleCallback；退化成計時器，仍然避開首屏競爭。
  setTimeout(task, 1200);
};

export const prefetchLikelyNextRoutes = (): void => {
  whenIdle(() => {
    for (const load of PREFETCH) {
      // 失敗不影響任何事：真正導覽時會再 import 一次。
      void load().catch(() => undefined);
    }
  });
};
