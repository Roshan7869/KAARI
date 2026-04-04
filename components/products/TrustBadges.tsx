import { Shield, Truck, Scissors, RefreshCw } from 'lucide-react';

const badges = [
  {
    icon: Scissors,
    label: '100% Handmade',
    sub: 'By skilled artisans',
  },
  {
    icon: Shield,
    label: 'Secure Checkout',
    sub: 'Encrypted & safe',
  },
  {
    icon: Truck,
    label: 'Pan India Delivery',
    sub: 'Tracked shipping',
  },
  {
    icon: RefreshCw,
    label: 'Easy Returns',
    sub: '7-day return policy',
  },
];

export default function TrustBadges({ className = '' }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${className}`}>
      {badges.map((badge) => {
        const Icon = badge.icon;
        return (
          <div
            key={badge.label}
            className="flex flex-col items-center text-center gap-1.5 p-3 rounded-lg border border-accent/20 bg-background/60"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <p className="font-body text-xs font-semibold text-foreground leading-tight">
              {badge.label}
            </p>
            <p className="font-body text-[10px] text-muted-foreground">{badge.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
