import { cn } from '@/ui/utils/cn';

type DividerProps = {
  className?: string;
};

/** Structural rule between sibling content blocks. Pure presentation; carries no semantics. */
export function Divider({ className }: DividerProps) {
  return <hr className={cn('border-0 border-t border-border', className)} />;
}
