import { cn } from '@/ui/utils/cn';

type SkeletonProps = {
  className?: string;
};

/** Loading shimmer block for Table / List / Detail states. Compose rows; this renders one block. */
export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={cn('h-4 rounded-sm bg-muted animate-pulse', className)} />;
}
