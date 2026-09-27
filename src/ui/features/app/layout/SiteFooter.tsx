import { APP_BRAND, APP_TAGLINE, APP_VERSION } from './brand';

const FOOTER_TEXT_CLASS = 'font-mono text-xs text-muted-foreground tracking-heading';

const SiteFooter: React.FC = () => {
  return (
    <footer className="pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex items-baseline gap-3">
        <span data-testid="footer-brand" className={FOOTER_TEXT_CLASS}>
          {APP_BRAND}
        </span>
        <span data-testid="footer-version" className={FOOTER_TEXT_CLASS}>
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
