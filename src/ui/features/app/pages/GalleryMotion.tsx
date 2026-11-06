import React from 'react';

import { GalleryCaption, GalleryGroup, GalleryModule, GallerySection } from './GalleryScaffold';

/**
 * Motion Lab (motion-system §1): the manual verification surface for the motion
 * contract. It shows only the parameters still worth tuning — not a second copy
 * of every animation already decided elsewhere.
 */
const PressSection: React.FC = () => (
  <GalleryModule label="M01 / M02 · PRESS & FOCUS">
    <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
      Content lands here in #365.
    </p>
  </GalleryModule>
);

const NumberSection: React.FC = () => (
  <GalleryModule label="M07 · NUMBER TRANSITION">
    <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
      Content lands here in #365.
    </p>
  </GalleryModule>
);

const SheetSection: React.FC = () => (
  <GalleryModule label="M10 · BOTTOM SHEET PHYSICS">
    <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
      Content lands here in #365.
    </p>
  </GalleryModule>
);

export const GalleryMotionBody: React.FC = () => (
  <>
    <GalleryGroup label="MOTION" />
    <GallerySection number="37" title="Motion Lab">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <PressSection />
        <NumberSection />
        <SheetSection />
      </div>
      <GalleryCaption>
        Parameters still worth tuning live here; every other animation is specified in
        `motion-system.md` and is not re-shown. Pixel Pet reactions are a separate discussion.
      </GalleryCaption>
    </GallerySection>
  </>
);
