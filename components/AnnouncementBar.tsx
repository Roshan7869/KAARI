'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import Link from 'next/link';

export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="relative z-[60] overflow-hidden py-2 px-4 text-center"
      style={{ background: 'hsl(var(--kaari-maroon-deep))' }}
    >
      {/* Shimmer sweep */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-1/4 animate-ann-sweep"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(212,175,127,0.15), transparent)',
        }}
      />

      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center">
        <p className="font-dm-sans text-[12px] tracking-wide text-gold-light/90">
          <span className="font-semibold text-gold">Free Shipping ₹999+ &nbsp;·&nbsp;</span>
          Custom Orders Welcome —{' '}
          <Link
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 text-gold hover:text-gold-light transition-colors"
          >
            WhatsApp Us
          </Link>
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gold/50 hover:text-gold transition-colors"
          aria-label="Dismiss announcement"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
