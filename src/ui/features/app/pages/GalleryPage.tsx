import React from 'react';

import { GalleryChartsBody } from './GalleryCharts';
import GalleryChrome from './GalleryChrome';
import { GalleryPrimitivesBody } from './GalleryPrimitives';
import { GalleryStatesBody } from './GalleryStates';

const GalleryPage: React.FC = () => {
  const [cadence, setCadence] = React.useState('monthly');

  return (
    <GalleryChrome>
      <GalleryPrimitivesBody />
      <GalleryChartsBody />
      <GalleryStatesBody cadence={cadence} onCadenceChange={setCadence} />
      <p className="pt-8 font-mono text-[11px] text-muted-foreground">
        ONE PIECE / Component Gallery · Dev-only route · Rendered from the real global components
      </p>
    </GalleryChrome>
  );
};

export default GalleryPage;
