import React from 'react';

import { AppFallback } from '@/ui/components/AppFallback';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * 最外層 render 錯誤的防線。React 在沒有 boundary 時會卸載整棵樹，留下空白畫面
 * 而使用者看不到原因；boundary 讓失敗變成可見的訊息與重試路徑。
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Unhandled render error:', error, errorInfo.componentStack);
  }

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <AppFallback
        title="Something went wrong"
        description={error.message}
        hint="See the browser console for the full stack trace."
      />
    );
  }
}
