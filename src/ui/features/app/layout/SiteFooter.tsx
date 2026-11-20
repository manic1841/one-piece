import { cn } from '@/ui/utils/cn';

import { APP_BRAND, APP_TAGLINE, APP_VERSION } from './brand';

const FOOTER_TEXT_CLASS = 'font-mono text-xs text-muted-foreground tracking-heading';

const SiteFooter: React.FC = () => {
  return (
    <footer className="pb-24 md:pb-8">
      {/* The pet is fixed in this corner at 56px plus its offset, so the footer
          keeps that much room instead of running underneath it. */}
      <div className="max-w-7xl mx-auto py-6 pl-4 pr-24 md:pl-8 md:pr-28 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span data-testid="footer-brand" className={FOOTER_TEXT_CLASS}>
          {APP_BRAND}
        </span>
        <span data-testid="footer-version" className={cn(FOOTER_TEXT_CLASS, 'shrink-0')}>
          {APP_VERSION}
        </span>
        <span className="text-xs text-muted-foreground/50" aria-hidden="true">
          /
        </span>
        <span data-testid="footer-tagline" className={FOOTER_TEXT_CLASS}>
          {APP_TAGLINE}
        </span>
      </div>
    </footer>
  );
};

export default SiteFooter;
