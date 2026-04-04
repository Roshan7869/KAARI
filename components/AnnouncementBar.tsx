'use client';

import { useState } from 'react';
import { X, Instagram } from 'lucide-react';

export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative z-[60] bg-primary text-primary-foreground py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-center">
        <Instagram className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
        <p className="font-body text-xs tracking-wide">
          <span className="font-semibold">Order via Instagram DM!</span>
          <span className="hidden sm:inline"> — DM us at </span>
          <a
            href="https://www.instagram.com/kaari.handmade"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-80 transition-opacity ml-1"
          >
            @kaari.handmade
          </a>
          <span className="hidden sm:inline"> for custom orders &amp; availability</span>
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          aria-label="Dismiss announcement"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
