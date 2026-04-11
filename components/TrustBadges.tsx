'use client';

import { Heart, CreditCard, Package, Truck } from 'lucide-react';

const BADGES = [
  { icon: Heart, label: '100% Handmade', subtitle: 'Crafted with love' },
  { icon: CreditCard, label: 'Secure UPI', subtitle: 'Safe payments' },
  { icon: Package, label: 'Made to Order', subtitle: 'Just for you' },
  { icon: Truck, label: 'Free Shipping', subtitle: 'Orders ₹500+' },
] as const;

export function TrustBadges() {
  return (
    <section className="bg-cream-warm border-y border-gold/20 py-6 md:py-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-gold/15">
          {BADGES.map(({ icon: Icon, label, subtitle }) => (
            <div key={label} className="flex items-center justify-center gap-3 md:px-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-maroon/[0.08] flex items-center justify-center">
                <Icon className="w-[18px] h-[18px] text-maroon" />
              </div>
              <div>
                <p className="font-cormorant font-semibold text-maroon-deep text-sm leading-tight">
                  {label}
                </p>
                <p className="font-dm-sans text-[11px] text-maroon/50">{subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}