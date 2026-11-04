import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';

interface LoadErrorAlertProps {
  /** The read's message. Only the presence matters; the copy is `message`. */
  errorMessage: string;
  /** Shown as-is. The raw failure rides along as the tooltip. */
  message: string;
  retryLabel: string;
  onRetry: () => void;
  testId?: string;
}

/**
 * The one shape for "a read failed, here is the retry", shared by every surface
 * that loads something: list pages, plan load gates and the rule-source pickers.
 * Keeping it in one place is what stops a new surface from inventing its own
 * variant, button style and button position.
 */
export function LoadErrorAlert({
  errorMessage,
  message,
  retryLabel,
  onRetry,
  testId,
}: LoadErrorAlertProps) {
  return (
    <Alert variant="warning" data-testid={testId} title={errorMessage}>
      <AlertDescription>{message}</AlertDescription>
      <Button variant="text" className="ml-auto shrink-0" onClick={onRetry}>
        {retryLabel}
      </Button>
    </Alert>
  );
}
