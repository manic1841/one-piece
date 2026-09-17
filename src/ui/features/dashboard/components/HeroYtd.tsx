import { type DashboardHeroVM } from '@/ui/features/dashboard/viewmodels/dashboardHero.vm';

interface HeroYtdProps {
  ytd: DashboardHeroVM['ytd'];
}

export function HeroYtd({ ytd }: HeroYtdProps) {
  if (ytd == null) {
    return null;
  }
  return (
    <p
      data-testid="hero-ytd"
      className="mt-2 font-mono text-sm tabular-nums text-muted-foreground"
    >
      {ytd.percentText}
      {ytd.amountText != null && (
        <span
          className={
            ytd.direction === 'negative' ? 'ml-2 text-negative' : 'ml-2 text-positive'
          }
        >
          {ytd.amountText}
        </span>
      )}
    </p>
  );
}
