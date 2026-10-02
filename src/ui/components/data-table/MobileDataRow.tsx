import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import {
  dataTableLabelClass,
  mobileDataListClass,
  mobileDataRowClass,
  mobileFieldClass,
} from './styles';

/** 行動版欄位容器（md 以下取代桌面表格）。 */
export const MobileDataList: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn(mobileDataListClass, className)} {...props} />;
MobileDataList.displayName = 'MobileDataList';

/** 行動版單列：label 左 / 值右的 row representation。 */
export const MobileDataRow: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn(mobileDataRowClass, className)} {...props} />;
MobileDataRow.displayName = 'MobileDataRow';

interface MobileDataFieldProps {
  label: string;
  children?: React.ReactNode;
  className?: string;
}

/** 行動版單一欄位列（label 左 / 值右）。 */
export const MobileDataField: React.FC<MobileDataFieldProps> = ({ label, children, className }) => (
  <div className={cn(mobileFieldClass, className)}>
    <p className={dataTableLabelClass}>{label}</p>
    {children}
  </div>
);
MobileDataField.displayName = 'MobileDataField';

interface MobileExpandableRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** 主要列：左側摘要內容。 */
  summary: React.ReactNode;
  /** 尾端數值（例如金額）。 */
  value?: React.ReactNode;
  /** 次要資訊列（摘要下方）。 */
  meta?: React.ReactNode;
  /** 列動作；點擊不觸發展開（ADR-0061 pointer event 優先序）。 */
  actions?: React.ReactNode;
  /** 展開後內容；提供時整列成為可展開控件。 */
  details?: React.ReactNode;
}

/**
 * 行動版可展開列：接管展開狀態與鍵盤等價（Enter／Space），並在提供 `details`
 * 時補上 `role="button"` 與 `aria-expanded`。動作區停止冒泡，讓編輯／刪除不會
 * 連帶切換展開。
 */
export const MobileExpandableRow: React.FC<MobileExpandableRowProps> = ({
  summary,
  value,
  meta,
  actions,
  details,
  className,
  ...props
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const isExpandable = details !== undefined;

  const toggle = () => setIsExpanded((previous) => !previous);

  return (
    <div
      role={isExpandable ? 'button' : undefined}
      tabIndex={isExpandable ? 0 : undefined}
      aria-expanded={isExpandable ? isExpanded : undefined}
      onClick={isExpandable ? toggle : undefined}
      onKeyDown={
        isExpandable
          ? (event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              toggle();
            }
          : undefined
      }
      className={cn(
        mobileDataRowClass,
        isExpandable &&
          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-baseline gap-2">{summary}</span>
        {value !== undefined && <span className="ml-auto whitespace-nowrap">{value}</span>}
        {actions !== undefined && (
          <span
            role="presentation"
            className="flex shrink-0 gap-0.5"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {actions}
          </span>
        )}
      </div>
      {meta !== undefined && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">{meta}</div>
      )}
      {isExpandable && isExpanded && (
        <div className="mt-3 border-t border-border pt-2">{details}</div>
      )}
    </div>
  );
};
MobileExpandableRow.displayName = 'MobileExpandableRow';
