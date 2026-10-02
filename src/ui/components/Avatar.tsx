import * as React from 'react';

import { cn } from '@/ui/utils/cn';

type AvatarSize = 'sm' | 'default';

type AvatarProps = {
  /** Initials shown when no image is available, e.g. "CY". */
  initials?: string;
  src?: string;
  alt?: string;
  size?: AvatarSize;
  className?: string;
};

const sizeClass: Record<AvatarSize, string> = {
  sm: 'h-6 w-6 text-[9px]',
  default: 'h-8 w-8 text-[11px]',
};

/** Identity circle: photo when provided, otherwise initials. Mono by default (data identity). */
export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ initials, src, alt, size = 'default', className }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-border-strong bg-muted font-mono uppercase text-foreground',
        sizeClass[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt={alt ?? ''} className="h-full w-full rounded-full object-cover" />
      ) : (
        (initials ?? '')
      )}
    </span>
  ),
);
Avatar.displayName = 'Avatar';
