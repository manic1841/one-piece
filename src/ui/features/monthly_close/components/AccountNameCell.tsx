import React from 'react';

interface AccountNameCellProps {
  name: string;
  currency: string;
}

export const AccountNameCell: React.FC<AccountNameCellProps> = ({ name, currency }) => (
  <>
    <span className="text-sm font-medium text-foreground">{name}</span>
    <span className="ml-2 font-mono text-[11px] text-muted-foreground">{currency}</span>
  </>
);
