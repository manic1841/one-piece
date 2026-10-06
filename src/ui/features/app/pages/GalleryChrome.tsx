import React from 'react';

import { Search, Settings } from 'lucide-react';

import { Avatar } from '@/ui/components/Avatar';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Button } from '@/ui/components/ui/button';

const GalleryChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-50 border-b border-border bg-background/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-heading">ONE PIECE</h1>
          <StatusGlyph type="active" label="GALLERY" />
        </div>
        <div className="flex items-center gap-2">
          <Avatar initials="CY" />
          <Button variant="ghost" size="icon" aria-label="Search">
            <Search size={18} className="text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings size={18} className="text-muted-foreground" />
          </Button>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-10 md:px-8">{children}</main>
  </div>
);

export default GalleryChrome;
