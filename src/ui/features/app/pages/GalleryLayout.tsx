import React from 'react';

import { ArrowRight } from 'lucide-react';

import { CliProgress } from '@/ui/components/CliProgress';
import { Divider } from '@/ui/components/Divider';
import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { PageHeader } from '@/ui/components/PageHeader';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Toolbar } from '@/ui/components/Toolbar';
import { BarChart } from '@/ui/components/charts/BarChart';
import { eyebrowClass } from '@/ui/components/eyebrow';
import { Button } from '@/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/components/ui/card';

import { GalleryCaption, GalleryGroup, GalleryModule, GallerySection } from './GalleryScaffold';

const BAR_CHART_LABELS = ['FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];
const BAR_HEIGHTS = [38, 48, 45, 62, 58, 70, 67, 82];

const SectionModuleSection: React.FC = () => (
  <GallerySection
    number="04"
    title="Section & Module"
    action={
      <Button variant="text" size="sm">
        ACTION SLOT
      </Button>
    }
  >
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <p className={eyebrowClass}>12M NET WORTH</p>
        <div className="my-4 h-px bg-border" />
        <GalleryModule label="TREND">
          <BarChart
            labels={BAR_CHART_LABELS}
            series={[{ tone: 'neutral', values: BAR_HEIGHTS }]}
            highlightIndex={BAR_HEIGHTS.length - 1}
            height={150}
            ariaLabel="12 month net worth trend"
          />
        </GalleryModule>
      </div>
      <GalleryModule label="MONTHLY CLOSE">
        <div className="space-y-3">
          <StatusGlyph type="verified" label="ACCOUNTS · 3/3" />
          <div className="h-px bg-border" />
          <StatusGlyph type="verified" label="LEDGER · 128 ENTRIES" />
          <div className="h-px bg-border" />
          <StatusGlyph type="waiting" label="REPORTS · WAITING" />
        </div>
        <div className="mt-5">
          <CliProgress
            value={60}
            tone="default"
            detail="3/5 · NEXT FINANCIAL REPORTS"
            ariaLabel="3 of 5 close stages completed"
          />
        </div>
        <div className="mt-5">
          <Button variant="text">
            View close
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </GalleryModule>
    </div>
  </GallerySection>
);

const PageHeaderSection: React.FC = () => (
  <GallerySection number="05" title="Page Header">
    <div className="space-y-6">
      <PageHeader
        title="TRANSACTIONS"
        description="Track and review household financial activity."
        actions={<Button>+ ADD TRANSACTION</Button>}
      />
      <Toolbar
        actions={
          <>
            <Button variant="outline" size="sm">
              EDIT
            </Button>
            <Button variant="destructive" size="sm">
              DELETE
            </Button>
            <Button size="sm">+ ADD TRANSACTION</Button>
          </>
        }
      >
        <span className="font-mono text-[11px] uppercase text-muted-foreground">5 SELECTED</span>
      </Toolbar>
    </div>
  </GallerySection>
);

const CardSection: React.FC = () => (
  <GallerySection number="06" title="Card">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>September close</CardTitle>
          <CardDescription>5 of 5 steps completed.</CardDescription>
        </CardHeader>
        <CardContent>
          <FinancialNumber value="NT$4,812,430" size="large" change="Net worth after close" />
        </CardContent>
        <CardFooter>
          <Button variant="text">View report</Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Brokerage snapshot</CardTitle>
          <CardDescription>As of Sep 30, 2026.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Distinct, self-contained module — the only case design-system reserves Card for.
          </p>
        </CardContent>
      </Card>
    </div>
    <GalleryCaption>
      Card 保留給 distinct / interactive module；Summary、Metric、Section、Table 等表面改用
      Typography / Divider / Whitespace 分層，不包 Card。
    </GalleryCaption>
  </GallerySection>
);

const DividerSection: React.FC = () => (
  <GallerySection number="07" title="Divider">
    <GalleryModule label="BALANCE">
      <p className={eyebrowClass}>ASSETS</p>
      <FinancialNumber className="mt-2" value="NT$5,420,000" size="large" />
      <Divider className="my-4" />
      <p className={eyebrowClass}>LIABILITIES</p>
      <FinancialNumber className="mt-2" value="NT$598,680" size="large" />
    </GalleryModule>
  </GallerySection>
);

export const GalleryLayoutBody: React.FC = () => (
  <>
    <GalleryGroup label="LAYOUT & STRUCTURE" />
    <SectionModuleSection />
    <PageHeaderSection />
    <CardSection />
    <DividerSection />
  </>
);
