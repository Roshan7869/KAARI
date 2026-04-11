'use client';

import { Star, SlidersHorizontal, X } from 'lucide-react';

interface ProductFiltersProps {
  minPrice: number;
  maxPrice: number;
  minRating: number;
  onMinPriceChange: (value: number) => void;
  onMaxPriceChange: (value: number) => void;
  onRatingChange: (rating: number) => void;
  onReset: () => void;
  activeCount: number;
}

const PRICE_MIN = 0;
const PRICE_MAX = 5000;

export default function ProductFilters({
  minPrice,
  maxPrice,
  minRating,
  onMinPriceChange,
  onMaxPriceChange,
  onRatingChange,
  onReset,
  activeCount,
}: ProductFiltersProps) {
  return (
    <div className="border border-border rounded-sm p-4 bg-background">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" aria-hidden />
          <span className="font-body text-xs uppercase tracking-[0.15em]">Filters</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground rounded-full text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 font-body text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear all filters"
          >
            <X className="w-3 h-3" aria-hidden />
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Price Range */}
        <div>
          <p className="font-body text-xs uppercase tracking-[0.12em] text-muted-foreground mb-3">
            Price Range (₹)
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label htmlFor="filter-min-price" className="sr-only">Minimum price</label>
              <input
                id="filter-min-price"
                type="number"
                min={PRICE_MIN}
                max={maxPrice}
                value={minPrice}
                onChange={(e) => {
                  const val = Math.max(PRICE_MIN, Math.min(Number(e.target.value), maxPrice));
                  onMinPriceChange(val);
                }}
                className="w-full px-3 py-2 bg-background border border-border rounded-sm font-body text-sm text-center"
                placeholder="Min"
                aria-label="Minimum price in rupees"
              />
            </div>
            <span className="font-body text-muted-foreground text-sm flex-shrink-0">—</span>
            <div className="flex-1">
              <label htmlFor="filter-max-price" className="sr-only">Maximum price</label>
              <input
                id="filter-max-price"
                type="number"
                min={minPrice}
                max={PRICE_MAX}
                value={maxPrice}
                onChange={(e) => {
                  const val = Math.min(PRICE_MAX, Math.max(Number(e.target.value), minPrice));
                  onMaxPriceChange(val);
                }}
                className="w-full px-3 py-2 bg-background border border-border rounded-sm font-body text-sm text-center"
                placeholder="Max"
                aria-label="Maximum price in rupees"
              />
            </div>
          </div>
        </div>

        {/* Minimum Rating */}
        <div>
          <p className="font-body text-xs uppercase tracking-[0.12em] text-muted-foreground mb-3">
            Minimum Rating
          </p>
          <div className="flex items-center gap-1" role="group" aria-label="Minimum star rating filter">
            <button
              onClick={() => onRatingChange(0)}
              className={`font-body text-xs px-3 py-2 border rounded-sm transition-all duration-200 ${
                minRating === 0
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-accent hover:text-accent'
              }`}
              aria-pressed={minRating === 0}
            >
              All
            </button>
            {[1, 2, 3, 4, 5].map((stars) => (
              <button
                key={stars}
                onClick={() => onRatingChange(stars)}
                className={`flex items-center gap-0.5 px-2.5 py-2 border rounded-sm transition-all duration-200 ${
                  minRating === stars
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-accent hover:text-accent'
                }`}
                aria-pressed={minRating === stars}
                aria-label={`${stars} star${stars > 1 ? 's' : ''} and up`}
              >
                <Star
                  className="w-3 h-3"
                  fill={minRating === stars ? 'currentColor' : 'none'}
                  aria-hidden
                />
                <span className="font-body text-xs">{stars}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
