import React from 'react';

import { GalleryChartsBody } from './GalleryCharts';
import GalleryChrome from './GalleryChrome';
import { GalleryCollectionsBody } from './GalleryCollections';
import { GalleryFeedbackBody } from './GalleryFeedback';
import { GalleryFormsBody } from './GalleryForms';
import { GalleryInteractionBody } from './GalleryInteraction';
import { GalleryLayoutBody } from './GalleryLayout';
import { GalleryIntro } from './GalleryScaffold';
import { GalleryValuesBody } from './GalleryValues';

/**
 * Dev-only component gallery. Bodies are grouped by nature and rendered in that
 * order; section numbers follow the render order (01–34).
 */
const GalleryPage: React.FC = () => (
  <GalleryChrome>
    <GalleryIntro />
    <GalleryValuesBody />
    <GalleryLayoutBody />
    <GalleryCollectionsBody />
    <GalleryFormsBody />
    <GalleryInteractionBody />
    <GalleryFeedbackBody />
    <GalleryChartsBody />
    <p className="pt-8 font-mono text-[11px] text-muted-foreground">
      ONE PIECE / Component Gallery · Dev-only route · Rendered from the real global components
    </p>
  </GalleryChrome>
);

export default GalleryPage;
