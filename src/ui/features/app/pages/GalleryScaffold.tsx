import React from 'react';

import { Module } from '@/ui/components/Module';
import { PageSection } from '@/ui/components/PageSection';
import { eyebrowClass } from '@/ui/components/eyebrow';

export const GallerySection = PageSection;
export const GalleryModule = Module;

/**
 * Group band separating collections of like-natured components. The gallery is
 * ordered by nature (values → layout → collections → forms → interaction →
 * feedback → data-viz), and each band names the group it opens.
 */
export const GalleryGroup: React.FC<{ label: string }> = ({ label }) => (
  <div className="pt-14">
    <p className="border-b border-border pb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-foreground">
      {label}
    </p>
  </div>
);

/** Mono footnote under a scene explaining its role or contract. */
export const GalleryCaption: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">{children}</p>
);

export const GalleryIntro: React.FC = () => (
  <div className="pb-10">
    <p className={eyebrowClass}>DESIGN SYSTEM / COMPONENT GALLERY</p>
    <h2 className="mt-2 text-3xl font-bold tracking-display">Component Gallery</h2>
    <p className="mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">
      Engineering-first household financial operating system. Dark-first, data-driven, semantic
      color, and structure over cardization. Rendered from the real global components. Sections are
      grouped by nature and numbered by render order.
    </p>
  </div>
);
