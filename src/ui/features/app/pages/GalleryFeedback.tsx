import React from 'react';

import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { AppFallback } from '@/ui/components/AppFallback';
import { CliProgress } from '@/ui/components/CliProgress';
import { EmptyState } from '@/ui/components/EmptyState';
import { FilterStrip } from '@/ui/components/FilterStrip';
import { GateSurface } from '@/ui/components/GateSurface';
import { LoadingLine } from '@/ui/components/LoadingLine';
import { SearchField } from '@/ui/components/SearchField';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Toast } from '@/ui/components/Toast';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';

import { GalleryCaption, GalleryGroup, GalleryModule, GallerySection } from './GalleryScaffold';

const EmptySection: React.FC = () => (
  <GallerySection number="29" title="Empty State">
    <GalleryModule label="NO TRANSACTIONS">
      <EmptyState
        title="NO TRANSACTIONS"
        description="No transactions have been recorded for this period."
        action={<Button>+ ADD TRANSACTION</Button>}
      />
    </GalleryModule>
  </GallerySection>
);

const LoadingSection: React.FC = () => (
  <GallerySection number="30" title="Loading & Skeleton">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <GalleryModule label="FINANCIAL NUMBER">
        <Skeleton className="h-8 w-3/5" />
        <Skeleton className="mt-3 w-1/3" />
      </GalleryModule>
      <GalleryModule label="GENERATING REPORTS">
        <CliProgress
          command="generate-reports --period SEP-2026"
          value={62}
          statusText="Generating September financial statements..."
        />
      </GalleryModule>
      <GalleryModule label="STAGE PROGRESS · NO COMMAND">
        <CliProgress
          value={60}
          tone="positive"
          detail="3/5 · NEXT LEDGER"
          ariaLabel="3 of 5 close stages completed"
        />
      </GalleryModule>
      <GalleryModule label="SINGLE-LINE LOADING">
        <LoadingLine className="min-h-0 py-6" />
      </GalleryModule>
    </div>
  </GallerySection>
);

const AlertSection: React.FC = () => (
  <GallerySection number="31" title="Alert / Inline Message">
    <Alert variant="warning">
      <StatusGlyph type="review" label="REVIEW" />
      <AlertDescription>Brokerage ending balance differs from ledger by NT$1,240.</AlertDescription>
      <Button variant="text" className="ml-auto shrink-0">
        Review
        <ArrowRight size={16} aria-hidden="true" />
      </Button>
    </Alert>
  </GallerySection>
);

/** Unstyled so <Toast> owns the surface; the width is sonner's TOAST_WIDTH. */
const LIVE_TOAST_OPTIONS = { unstyled: true, style: { width: '356px' } } as const;

const UNDONE_TOAST = <Toast message="TRANSACTION UNDONE" />;
const RETRYING_TOAST = <Toast message="RETRYING SAVE" />;

const ToastSection: React.FC = () => (
  <GallerySection number="32" title="Toast">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <GalleryModule label="TOAST (SIMULATED)">
        <Toast
          message="TRANSACTION SAVED"
          actionLabel="UNDO"
          onAction={() => toast.custom(() => UNDONE_TOAST, LIVE_TOAST_OPTIONS)}
        />
        <Toast
          className="mt-4"
          tone="error"
          message="SAVE FAILED"
          actionLabel="RETRY"
          onAction={() => toast.custom(() => RETRYING_TOAST, LIVE_TOAST_OPTIONS)}
        />
      </GalleryModule>
      <GalleryModule label="LIVE TOAST" className="flex flex-col">
        <p className="font-mono text-[11px] text-muted-foreground">
          Fires real sonner toasts that render this same Toast surface.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.custom(
                (id) => (
                  <Toast
                    message="TRANSACTION SAVED"
                    actionLabel="UNDO"
                    onAction={() => toast.dismiss(id)}
                  />
                ),
                LIVE_TOAST_OPTIONS,
              )
            }
          >
            SUCCESS
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.custom(
                (id) => (
                  <Toast
                    tone="error"
                    message="SAVE FAILED"
                    actionLabel="RETRY"
                    onAction={() => toast.dismiss(id)}
                  />
                ),
                LIVE_TOAST_OPTIONS,
              )
            }
          >
            ERROR
          </Button>
        </div>
      </GalleryModule>
    </div>
  </GallerySection>
);

const FailureSection: React.FC = () => (
  <GallerySection number="33" title="Failure Surface">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <GalleryModule label="APP FALLBACK (FULL-SCREEN, CLIPPED)">
        <div className="h-72 overflow-hidden rounded-lg border border-border [&>div]:min-h-full">
          <AppFallback
            title="Something went wrong"
            description="Firebase initialization failed."
            hint="See the browser console for the full stack trace."
            onRetry={() => {}}
          />
        </div>
      </GalleryModule>
      <GalleryModule label="CONTEXT">
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>
            <span className="text-foreground">AppFallback</span> 是全 app 共用的失敗畫面；實務上
            `onRetry` 預設為整頁重載。
          </li>
          <li>
            <span className="text-foreground">ErrorBoundary</span> 沒有自帶視覺——它是 class
            boundary，render 失敗時輸出 AppFallback，因此呈現 AppFallback 即代表整條失敗路徑。
          </li>
          <li>此處以固定高度容器裁切呈現，不引入刻意觸發的 throw 路徑。</li>
        </ul>
      </GalleryModule>
    </div>
  </GallerySection>
);

const FilterSection: React.FC = () => {
  const [filter, setFilter] = React.useState('ALL');
  const [query, setQuery] = React.useState('');

  return (
    <GallerySection number="34" title="Filter Strip & Search Field">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <GalleryModule label="CONTEXTUAL FILTER">
          <div className="border-b border-border">
            <FilterStrip
              items={[
                { id: 'ALL', label: '全部' },
                { id: 'EXPENSE', label: '支出' },
                { id: 'INCOME', label: '收入' },
              ]}
              value={filter}
              onValueChange={setFilter}
              ariaLabel="交易類型篩選"
            />
          </div>
        </GalleryModule>
        <GalleryModule label="CONTEXTUAL SEARCH">
          <SearchField
            value={query}
            onValueChange={setQuery}
            placeholder="搜尋交易或備註..."
            ariaLabel="搜尋交易"
          />
        </GalleryModule>
      </div>
      <GalleryCaption>
        情境篩選列是底線式，沿用 tabs 的觸發區 token（選中態 2px 底線咬住列的細線），但維持
        role=group 與 aria-pressed——它是篩選，不是 tab；細線由呼叫端的列提供。搜尋欄是模組內
        情境搜尋，不同於全域 Command Palette。
      </GalleryCaption>
    </GallerySection>
  );
};

const GateSection: React.FC = () => (
  <GallerySection number="36" title="Entry / Gate Surface">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <GalleryModule label="GATE SURFACE · SINGLE ACTION">
        <div className="h-72 overflow-hidden rounded-lg border border-border [&>div]:min-h-full">
          <GateSurface className="space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Welcome to One Piece</h1>
              <p className="text-sm text-muted-foreground">
                Please sign in with your Google account to continue
              </p>
            </div>
            <Button className="w-full">Sign in with Google</Button>
          </GateSurface>
        </div>
      </GalleryModule>
      <GalleryModule label="GATE SURFACE · FORM">
        <div className="h-72 overflow-hidden rounded-lg border border-border [&>div]:min-h-full">
          <GateSurface className="space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold text-foreground">Create or Join Family</h1>
              <p className="text-sm text-muted-foreground">
                Enter a household name or ID to get started
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Household Name or ID</Label>
                <Input placeholder="Enter a name to create or ID to join" />
              </div>
              <Button className="w-full">Continue</Button>
            </div>
          </GateSurface>
        </div>
      </GalleryModule>
    </div>
    <GalleryModule label="CONTEXT" className="mt-6">
      <ul className="space-y-3 text-sm text-muted-foreground">
        <li>
          <span className="text-foreground">GateSurface</span> 是登入、拒絕存取、Onboarding 與
          啟動失敗（AppFallback）共用的入口版面殼：置中窄欄、鋪滿視窗高度、無卡片。
        </li>
        <li>
          兩種形：文字＋單一動作（登入）、表單容器（Onboarding）；錯誤用 inline alert，不用卡片。
        </li>
        <li>內容與間距由呼叫端決定；元件只提供版面（children ＋ className）。</li>
        <li>用於主介面之外、必須靠自身完成任務的畫面；一般頁面用 Page Shell。</li>
      </ul>
    </GalleryModule>
  </GallerySection>
);

export const GalleryFeedbackBody: React.FC = () => (
  <>
    <GalleryGroup label="STATES & FEEDBACK" />
    <EmptySection />
    <LoadingSection />
    <AlertSection />
    <ToastSection />
    <FailureSection />
    <FilterSection />
    <GateSection />
  </>
);
