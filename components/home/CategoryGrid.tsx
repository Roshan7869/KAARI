"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

interface Category {
  slug: string;
  name: string;
  description: string;
  pill?: "Most Loved" | "New" | "Custom";
  colSpan?: boolean; // spans 2 rows on desktop
  gradient: string;
  svgArt: React.ReactNode;
}

const CATEGORIES: Category[] = [
  {
    slug: "handbags",
    name: "Crochet Handbags",
    description: "Stylish handmade bags",
    pill: "Most Loved",
    colSpan: true,
    gradient: "from-maroon-deep/90 via-maroon/70 to-transparent",
    svgArt: (
      <svg
        viewBox="0 0 260 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full opacity-25"
        aria-hidden="true"
      >
        {/* Abstract crochet shrug outline */}
        <path
          d="M130 20 C80 20 30 60 20 120 L10 200 Q20 200 30 190 L60 140 L60 280 L200 280 L200 140 L230 190 Q240 200 250 200 L240 120 C230 60 180 20 130 20Z"
          stroke="white" strokeWidth="3" fill="white" fillOpacity="0.08"
        />
        <circle cx="130" cy="48" r="14" stroke="white" strokeWidth="3" fill="none"/>
        {/* Crochet texture dots */}
        {Array.from({ length: 6 }).map((_, row) =>
          Array.from({ length: 8 }).map((_, col) => (
            <circle key={`${row}-${col}`} cx={70 + col * 17} cy={160 + row * 18} r="2.5" fill="white" opacity="0.3"/>
          ))
        )}
      </svg>
    ),
  },
  {
    slug: "bouquet",
    name: "Crochet Bouquet",
    description: "Forever flowers, no wilting",
    pill: "New",
    gradient: "from-maroon-deep/85 via-maroon/60 to-transparent",
    svgArt: (
      <svg
        viewBox="0 0 220 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full opacity-25"
        aria-hidden="true"
      >
        {/* Bouquet stem */}
        <path d="M110 220 L110 140" stroke="white" strokeWidth="4" strokeLinecap="round"/>
        {/* Flowers */}
        {[
          { cx: 110, cy: 100 },
          { cx: 78, cy: 118 },
          { cx: 142, cy: 118 },
          { cx: 88, cy: 80 },
          { cx: 132, cy: 80 },
        ].map(({ cx, cy }, i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="20" stroke="white" strokeWidth="2.5" fill="white" fillOpacity="0.1"/>
            <circle cx={cx} cy={cy} r="8" fill="white" fillOpacity="0.3"/>
            {[0, 72, 144, 216, 288].map((angle) => (
              <ellipse
                key={angle}
                cx={cx + Math.cos((angle * Math.PI) / 180) * 14}
                cy={cy + Math.sin((angle * Math.PI) / 180) * 14}
                rx="5" ry="8"
                transform={`rotate(${angle} ${cx + Math.cos((angle * Math.PI) / 180) * 14} ${cy + Math.sin((angle * Math.PI) / 180) * 14})`}
                fill="white" fillOpacity="0.15"
              />
            ))}
          </g>
        ))}
        {/* Ribbon bow */}
        <path d="M95 210 Q110 200 125 210 Q110 220 95 210Z" fill="white" fillOpacity="0.4"/>
      </svg>
    ),
  },
  {
    slug: "hair-accessories",
    name: "Crochet Hair Accessories",
    description: "Clips, bands & scrunchies",
    gradient: "from-maroon-deep/80 via-maroon/55 to-transparent",
    svgArt: (
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full opacity-25"
        aria-hidden="true"
      >
        {/* Hair clip shape */}
        <rect x="60" y="80" width="80" height="40" rx="20" stroke="white" strokeWidth="3" fill="white" fillOpacity="0.1"/>
        <rect x="75" y="88" width="50" height="24" rx="12" fill="white" fillOpacity="0.2"/>
        {/* Decorative crochet flower on clip */}
        <circle cx="100" cy="100" r="10" fill="white" fillOpacity="0.4"/>
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <ellipse key={a}
            cx={100 + Math.cos((a * Math.PI) / 180) * 13}
            cy={100 + Math.sin((a * Math.PI) / 180) * 13}
            rx="4" ry="7"
            transform={`rotate(${a} ${100 + Math.cos((a * Math.PI) / 180) * 13} ${100 + Math.sin((a * Math.PI) / 180) * 13})`}
            fill="white" fillOpacity="0.25"
          />
        ))}
        {/* Scrunchie */}
        <ellipse cx="100" cy="150" rx="30" ry="15" stroke="white" strokeWidth="2.5" fill="none"/>
        <path d="M70 150 Q100 135 130 150 Q100 165 70 150Z" fill="white" fillOpacity="0.15"/>
      </svg>
    ),
  },
  {
    slug: "keychains",
    name: "Crochet Keychains",
    description: "Tiny gifts, big smiles",
    pill: "Custom",
    gradient: "from-maroon-deep/80 via-maroon/55 to-transparent",
    svgArt: (
      <svg
        viewBox="0 0 200 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full opacity-25"
        aria-hidden="true"
      >
        {/* Key ring */}
        <circle cx="100" cy="50" r="22" stroke="white" strokeWidth="3" fill="none"/>
        <circle cx="100" cy="50" r="14" stroke="white" strokeWidth="2" fill="none"/>
        {/* Chain */}
        <path d="M100 72 L100 100" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        {/* Crochet bunny / bear amigurumi */}
        <circle cx="100" cy="130" r="30" stroke="white" strokeWidth="2.5" fill="white" fillOpacity="0.1"/>
        {/* Ears */}
        <ellipse cx="82" cy="105" rx="9" ry="16" stroke="white" strokeWidth="2" fill="white" fillOpacity="0.1"/>
        <ellipse cx="118" cy="105" rx="9" ry="16" stroke="white" strokeWidth="2" fill="white" fillOpacity="0.1"/>
        {/* Face */}
        <circle cx="93" cy="127" r="3" fill="white" fillOpacity="0.6"/>
        <circle cx="107" cy="127" r="3" fill="white" fillOpacity="0.6"/>
        <path d="M95 138 Q100 143 105 138" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
        {/* Stitch texture */}
        {Array.from({ length: 4 }).map((_, i) => (
          <path key={i} d={`M${76 + i * 12} 155 Q${82 + i * 12} 160 ${88 + i * 12} 155`} stroke="white" strokeWidth="1.5" fill="none"/>
        ))}
      </svg>
    ),
  },
  {
    slug: "dolls",
    name: "Crochet Dolls",
    description: "Handcrafted amigurumi dolls",
    pill: "New",
    gradient: "from-maroon-deep/80 via-maroon/55 to-transparent",
    svgArt: (
      <svg
        viewBox="0 0 200 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full opacity-25"
        aria-hidden="true"
      >
        {/* Doll body */}
        <ellipse cx="100" cy="140" rx="30" ry="50" stroke="white" strokeWidth="2.5" fill="white" fillOpacity="0.1"/>
        {/* Head */}
        <circle cx="100" cy="70" r="25" stroke="white" strokeWidth="2.5" fill="white" fillOpacity="0.1"/>
        {/* Hair */}
        <path d="M75 65 Q80 40 100 38 Q120 40 125 65" stroke="white" strokeWidth="2" fill="white" fillOpacity="0.15"/>
        {/* Eyes */}
        <circle cx="90" cy="68" r="3" fill="white" fillOpacity="0.6"/>
        <circle cx="110" cy="68" r="3" fill="white" fillOpacity="0.6"/>
        {/* Smile */}
        <path d="M92 80 Q100 88 108 80" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
        {/* Arms */}
        <path d="M70 120 L50 150" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M130 120 L150 150" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Stitch texture */}
        {Array.from({ length: 3 }).map((_, i) => (
          <path key={i} d={`M${80 + i * 13} 125 Q${86 + i * 13} 130 ${92 + i * 13} 125`} stroke="white" strokeWidth="1.5" fill="none"/>
        ))}
      </svg>
    ),
  },
];

const PILL_COLORS: Record<string, string> = {
  "Most Loved": "bg-maroon text-gold-light",
  New: "bg-gold text-maroon-deep",
  Custom: "bg-ivory/90 text-maroon",
};

function getPillColor(pill: string) {
  return PILL_COLORS[pill] ?? "bg-ivory/90 text-maroon";
}

export default function CategoryGrid() {
  const shouldReduceMotion = useReducedMotion();
  return (
    <section className="py-10 md:py-14 px-3 md:px-4 bg-cream-warm" aria-labelledby="cat-heading">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-6 md:mb-10">
          <p className="text-[11px] tracking-[.22em] uppercase text-maroon/60 mb-2">
            Browse by Category
          </p>
          <h2
            id="cat-heading"
            className="font-display text-2xl md:text-4xl text-maroon-deep leading-tight"
          >
            Shop Our Collections
          </h2>
        </div>

        {/* Grid — single column on very small screens, 2-col on mobile, 4-col on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[180px] sm:auto-rows-[220px] md:auto-rows-[260px] gap-2.5 md:gap-4">
          {CATEGORIES.map((cat) => (
            <motion.div
              key={cat.slug}
              className={cat.colSpan ? "row-span-2" : ""}
              whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.02 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: "easeOut" }}
            >
              <Link
                href={`/products?cat=${encodeURIComponent(cat.name)}`}
                className="block relative overflow-hidden rounded-2xl bg-maroon group h-full min-h-[180px]"
                aria-label={`Browse ${cat.name}`}
              >
                {/* SVG art fill */}
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                  {cat.svgArt}
                </div>

                {/* Gradient overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${cat.gradient}`}
                />

                {/* Pill */}
                {cat.pill && (
                  <span
                    className={`absolute top-2.5 right-2.5 z-20 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full ${getPillColor(cat.pill)}`}
                  >
                    {cat.pill}
                  </span>
                )}

                {/* Text */}
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 z-10">
                  <h3 className="font-display text-base md:text-xl font-bold text-ivory leading-tight">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] md:text-[12px] text-gold-light/80 mt-0.5">
                    {cat.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
