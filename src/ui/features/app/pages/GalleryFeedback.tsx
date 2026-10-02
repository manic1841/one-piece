import React from 'react';

import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { AppFallback } from '@/ui/components/AppFallback';
import { CliProgress } from '@/ui/components/CliProgress';
import { EmptyState } from '@/ui/components/EmptyState';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Toast } from '@/ui/components/Toast';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';

import { GalleryGroup, GalleryModule, GallerySection } from './GalleryScaffold';

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

export const GalleryFeedbackBody: React.FC = () => (
  <>
    <GalleryGroup label="STATES & FEEDBACK" />
    <EmptySection />
    <LoadingSection />
    <AlertSection />
    <ToastSection />
    <FailureSection />
  </>
);
