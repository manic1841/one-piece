import * as React from 'react';

import { Search } from 'lucide-react';

import { Input } from '@/ui/components/ui/input';

type SearchFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
};

/** 模組內情境搜尋欄，使用標準 input 表面（focus 走既有 input 的 primary ring）。 */
export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ value, onValueChange, placeholder, ariaLabel, className }, ref) => (
    <div className={className}>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={ref}
          type="search"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="pl-9"
        />
      </div>
    </div>
  ),
);
SearchField.displayName = 'SearchField';
