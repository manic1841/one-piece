import React from 'react';

import { Label } from '@/components/ui/label';
import { type PortfolioSnapshotCreate } from '@/schemas';

interface PerformancePreviewProps {
  preview: PortfolioSnapshotCreate | null;
  isMissingSnapshots: boolean;
}

export const PerformancePreview: React.FC<PerformancePreviewProps> = ({
  preview,
  isMissingSnapshots,
}) => {
  return (
    <div className="space-y-3">
      {isMissingSnapshots ? (
        <p className="text-[11px] text-destructive font-medium bg-destructive/5 p-4 rounded border border-destructive/10">
          ⚠️ All linked accounts must have recorded snapshots for this month before you can create a
          portfolio settlement.
        </p>
      ) : (
        preview && (
          <div className="space-y-3">
            <Label className="text-blue-600 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Performance Preview (Trial Calculation)
            </Label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 border rounded-md p-4 bg-blue-50/50 border-blue-100">
              <div className="space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Gain / Loss</div>
                <div
                  className={`text-sm font-bold ${
                    preview.performance.gain >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {preview.performance.gain >= 0 ? '+' : ''}
                  {preview.performance.gain.toLocaleString()}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Return Rate</div>
                <div
                  className={`text-sm font-bold ${
                    preview.performance.returnRate >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {preview.performance.returnRate >= 0 ? '+' : ''}
                  {preview.performance.returnRate.toFixed(2)}%
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold">
                  Cumulative Gain
                </div>
                <div
                  className={`text-sm font-bold ${
                    preview.performance.cumulativeGain >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {preview.performance.cumulativeGain >= 0 ? '+' : ''}
                  {preview.performance.cumulativeGain.toLocaleString()}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Total Return</div>
                <div
                  className={`text-sm font-bold ${
                    preview.performance.cumulativeReturnRate >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {preview.performance.cumulativeReturnRate >= 0 ? '+' : ''}
                  {preview.performance.cumulativeReturnRate.toFixed(2)}%
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              * Preview includes market gain adjusted for entered cash flow.
            </p>
          </div>
        )
      )}
    </div>
  );
};
