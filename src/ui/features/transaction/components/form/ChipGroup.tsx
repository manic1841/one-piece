import { cn } from '@/ui/utils/cn';

type ChipGroupProps = {
  options: Array<{ value: string; label: string }>;
  value: string | null;
  onChange: (value: string) => void;
  tone: 'expense' | 'income' | 'neutral';
};

export function ChipGroup({ options, value, onChange, tone }: ChipGroupProps) {
  const toneClass = {
    expense: 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100',
    income:
      'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100',
    neutral:
      'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100',
  };

  const activeClass = {
    expense: 'border-rose-500 bg-rose-600 text-white',
    income: 'border-emerald-500 bg-emerald-600 text-white',
    neutral: 'border-slate-500 bg-slate-700 text-white',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              selected ? activeClass[tone] : toneClass[tone],
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
