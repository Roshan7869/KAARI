"use client";

const TICKER_ITEMS = [
  "100% Handmade Crochet",
  "Custom Sizes Available",
  "Free Shipping on ₹999+",
  "Wearables · Bouquets · Hair Clips",
  "Made with Pure Love",
  "Secure UPI Payments",
  "WhatsApp for Custom Orders",
  "प्यार से बुनी गई",
];

const SEP = "\u2738"; // ❋ heavy asterisk separator

export default function MarqueeTicker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]; // duplicate for seamless loop

  return (
    <div
      className="relative overflow-hidden bg-maroon-deep py-2.5 select-none"
      aria-label="Site announcements"
      aria-hidden="true"
    >
      {/* Fade edges */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10"
        style={{
          background:
            "linear-gradient(to right, hsl(var(--kaari-maroon-deep)), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10"
        style={{
          background:
            "linear-gradient(to left, hsl(var(--kaari-maroon-deep)), transparent)",
        }}
      />

      <div
        className="flex whitespace-nowrap animate-ticker hover:[animation-play-state:paused] w-max"
      >
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-3 px-4 text-[13px] font-medium tracking-wide text-gold"
          >
            {item}
            <span className="text-gold/50 text-[10px]">{SEP}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
