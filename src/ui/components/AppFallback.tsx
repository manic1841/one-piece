import React from 'react';

import { Button } from '@/ui/components/ui/button';

interface AppFallbackProps {
  title: string;
  description: string;
  hint?: string;
  onRetry?: () => void;
}

/**
 * 全 app 共用的失敗畫面（啟動期不可回復的錯誤）。
 *
 * 存在的理由：先前 Firebase 初始化失敗時畫面全空，使用者無從得知原因
 * （見 docs/qa-faq.md）。任何讓 app 無法進入的失敗都必須留下可見訊息與重試路徑，
 * 不得是 silent failure。
 */
export const AppFallback: React.FC<AppFallbackProps> = ({
  title,
  description,
  hint,
  onRetry,
}) => (
  <div className="flex min-h-screen items-center justify-center bg-background px-6">
    <div className="w-full max-w-md space-y-3 text-center">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      {hint && <p className="font-mono text-xs text-muted-foreground">{hint}</p>}
      <div className="pt-2">
        <Button onClick={onRetry ?? (() => window.location.reload())}>Reload</Button>
      </div>
    </div>
  </div>
);
