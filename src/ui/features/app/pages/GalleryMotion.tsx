import React from 'react';

import { RefreshCw } from 'lucide-react';

import { AnimatedNumber } from '@/ui/components/AnimatedNumber';
import { Button } from '@/ui/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/ui/components/ui/sheet';
import { shouldDismiss } from '@/ui/components/ui/sheetDrag';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

import { GalleryParticleField } from './GalleryParticleField';
import { GalleryCaption, GalleryGroup, GalleryModule, GallerySection } from './GalleryScaffold';

const READOUT_CLASS =
  'font-mono text-[11px] tabular-nums uppercase tracking-widest text-muted-foreground';

const PressSection: React.FC = () => (
  <GalleryModule label="M01 / M02 · PRESS & FOCUS">
    <div className="flex flex-wrap items-center gap-3">
      <Button>CLOSE PERIOD</Button>
      <Button variant="outline">Cancel</Button>
      <Button variant="ghost" size="icon" aria-label="Refresh">
        <RefreshCw size={16} />
      </Button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {/* Shapes that must *not* scale: a list row and an input keep space still
          and answer on colour only (motion-system §3). */}
      <span className="rounded-sm border border-border px-3 py-1.5 text-sm transition-colors duration-fast hover:bg-accent">
        A list row
      </span>
      <span className="rounded-md border border-input px-3 py-1.5 text-sm transition-colors duration-fast focus-within:ring-2 focus-within:ring-ring">
        An input shape
      </span>
    </div>
    <p className={cn(READOUT_CLASS, 'mt-3')}>
      Press and hold: 0.97 scale over `fast`, released over `fast`. Rows, input-shaped fields and
      underline tabs take colour only.
    </p>
  </GalleryModule>
);

const DURATIONS = [300, 400, 500] as const;

const NumberSection: React.FC = () => {
  const [duration, setDuration] = React.useState<number>(400);
  const [value, setValue] = React.useState(1_284_000);

  // Alternating targets keeps every replay a real interpolation, not a no-op.
  const replay = () => setValue((current) => (current === 1_284_000 ? 986_400 : 1_284_000));

  return (
    <GalleryModule label="M07 · NUMBER TRANSITION">
      <div className="flex items-baseline gap-3">
        <AnimatedNumber
          value={value}
          durationMs={duration}
          format={formatCurrency}
          className="text-lg font-semibold"
        />
        <span className={READOUT_CLASS}>{duration}ms</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1" role="group" aria-label="Duration">
          {DURATIONS.map((option) => (
            <Button
              key={option}
              size="sm"
              variant={duration === option ? 'outline' : 'ghost'}
              aria-pressed={duration === option}
              onClick={() => setDuration(option)}
            >
              {option}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="text" onClick={replay}>
          Replay
        </Button>
      </div>
      <p className={cn(READOUT_CLASS, 'mt-3')}>
        `data` is 400. Compare before changing it; every frame is a real formatted value.
      </p>
    </GalleryModule>
  );
};

type Gesture = { displacement: number; velocity: number; verdict: boolean | null };

/** Instrumentation. Fixed above the overlay while the sheet is open, because the
 * sheet itself slides out from under the numbers as it is dragged. */
const GestureReadout: React.FC<{ gesture: Gesture | null }> = ({ gesture }) => (
  <dl className={cn(READOUT_CLASS, 'flex flex-wrap items-baseline gap-x-4 gap-y-1')}>
    <div className="flex items-baseline gap-1">
      <dt>Δ</dt>
      <dd className="whitespace-nowrap" data-testid="gesture-displacement">
        {gesture === null ? '—' : `${Math.round(gesture.displacement)}px`}
      </dd>
    </div>
    <div className="flex items-baseline gap-1">
      <dt>V</dt>
      <dd className="whitespace-nowrap" data-testid="gesture-velocity">
        {gesture === null ? '—' : `${gesture.velocity.toFixed(2)}px/ms`}
      </dd>
    </div>
    <div className="flex items-baseline gap-1">
      <dt>Verdict</dt>
      <dd className="whitespace-nowrap" data-testid="gesture-verdict">
        {gesture?.verdict == null ? '—' : gesture.verdict ? 'DISMISS' : 'RETURN'}
      </dd>
    </div>
  </dl>
);

const SheetSection: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [gesture, setGesture] = React.useState<Gesture | null>(null);

  // The sheet owns its own gesture; this just mirrors the numbers for the lab.
  React.useEffect(() => {
    if (!open) return;

    let start: { y: number; lastY: number; lastAt: number } | null = null;
    const height = () =>
      document.querySelector('[data-sheet-content]')?.getBoundingClientRect().height ?? 0;

    const down = (event: PointerEvent) => {
      if (
        !(event.target instanceof Element) ||
        event.target.closest('[data-sheet-handle]') === null
      )
        return;
      start = {
        y: event.clientY,
        lastY: event.clientY,
        lastAt: event.timeStamp,
      };
      setGesture({ displacement: 0, velocity: 0, verdict: null });
    };
    const move = (event: PointerEvent) => {
      if (start === null) return;
      const elapsed = event.timeStamp - start.lastAt;
      const travelled = event.clientY - start.lastY;
      start.lastY = event.clientY;
      start.lastAt = event.timeStamp;
      setGesture({
        displacement: event.clientY - start.y,
        velocity: elapsed > 0 ? travelled / elapsed : 0,
        verdict: null,
      });
    };
    const up = (event: PointerEvent) => {
      if (start === null) return;
      const displacement = event.clientY - start.y;
      // Same sample as the hook: the last segment, so a pause before release
      // reads as slow instead of inheriting the whole drag's average.
      const elapsed = event.timeStamp - start.lastAt;
      const velocity = elapsed > 0 ? (event.clientY - start.lastY) / elapsed : 0;
      start = null;
      setGesture({
        displacement,
        velocity,
        verdict: shouldDismiss(displacement, velocity, height()),
      });
    };

    document.addEventListener('pointerdown', down);
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
  }, [open]);

  return (
    <GalleryModule label="M10 · BOTTOM SHEET PHYSICS">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">Open sheet</Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[70vh]">
          <SheetHeader>
            <SheetTitle>Drag the handle</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground">
            Release past 25% of the height, or flick at 0.5 px/ms, to dismiss.
          </p>
        </SheetContent>
      </Sheet>

      <div className="mt-3">
        {open ? (
          <div className="material-chrome fixed left-4 top-4 z-[60] rounded-md border border-border px-3 py-2">
            <GestureReadout gesture={gesture} />
          </div>
        ) : (
          <GestureReadout gesture={gesture} />
        )}
      </div>
    </GalleryModule>
  );
};

export const GalleryMotionBody: React.FC = () => (
  <>
    <GalleryGroup label="MOTION" />
    <GallerySection number="37" title="Motion Lab">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <PressSection />
        <NumberSection />
        <SheetSection />
      </div>
      <div className="mt-6">
        <GalleryModule label="M12 · PARTICLE FIELD">
          <GalleryParticleField />
          <p className={cn(READOUT_CLASS, 'mt-2')}>
            Gallery only. Density and DPR are capped, the loop stops off-screen or on a hidden tab,
            and reduced motion holds one still frame.
          </p>
        </GalleryModule>
      </div>
      <GalleryCaption>
        Parameters still worth tuning live here; every other animation is specified in
        `motion-system.md` and is not re-shown. Pixel Pet reactions are a separate discussion.
      </GalleryCaption>
    </GallerySection>
  </>
);
