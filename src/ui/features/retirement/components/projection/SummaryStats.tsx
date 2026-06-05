import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

type RetirementProjectionProps = {
  projection: RetirementProjectionVM;
};

export function SummaryStats({ projection }: RetirementProjectionProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">退休時資產</p>
        <p className="text-xl font-semibold">{projection.retirementSavingsText}</p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">最低資產年份</p>
        <p className="text-xl font-semibold">
          {projection.minYearText} / {projection.minSavingsText}
        </p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">是否破產</p>
        <p className={`text-xl font-semibold ${projection.bankruptClassName}`}>
          {projection.bankruptText}
        </p>
      </div>
    </div>
  );
}
