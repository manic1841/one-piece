import React from 'react';

import { toast } from 'sonner';

import { Toast } from '@/ui/components/Toast';
import { Button } from '@/ui/components/ui/button';

import { GalleryModule, GallerySection } from './GalleryScaffold';

/** sonner renders our Toast surface unstyled; width matches sonner's TOAST_WIDTH (356px). */
const LIVE_TOAST_OPTIONS = { unstyled: true, style: { width: '356px' } } as const;

const UNDONE_TOAST = <Toast message="TRANSACTION UNDONE" />;
const RETRYING_TOAST = <Toast message="RETRYING SAVE" />;

export const ToastSection: React.FC = () => (
  <GallerySection number="11" title="Toast">
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
