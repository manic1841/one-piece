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
