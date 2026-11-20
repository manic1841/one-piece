import React from 'react';

import { Skeleton } from '@/ui/components/Skeleton';

/**
 * 路由 chunk 下載期間的頁面骨架。
 *
 * 路由一律以 `lazy()` 切分（首屏只留 shell 與登入），因此 Suspense 需要一個符合
 * 三態契約的載入表面；用 Skeleton 而非 `LoadingLine`（見 docs/ui/states-and-a11y.md）。
 */
export const PageSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true" aria-label="載入中">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full" />
    <Skeleton className="h-40 w-full" />
  </div>
);
