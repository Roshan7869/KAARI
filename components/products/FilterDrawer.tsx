'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';

export type AvailabilityFilter = 'in_stock' | 'made_to_order' | 'pre_order';

export interface FilterState {
  minPrice: number;
  maxPrice: number;
  categories: string[];
  availability: AvailabilityFilter[];
  minRating: 0 | 3 | 4 | 5;
  customizableOnly: boolean;
}

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
  allCategories: string[];
}

const AVAILABILITY_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'made_to_order', label: 'Made to Order' },
  { value: 'pre_order', label: 'Pre-order' },
];

const RATING_OPTIONS: { value: 0 | 3 | 4 | 5; label: string }[] = [
  { value: 5, label: '5.0 only' },
  { value: 4, label: '4+ stars' },
  { value: 3, label: '3+ stars' },
];

export default function FilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  onApply,
  onReset,
  allCategories,
}: FilterDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const toggleCategory = (cat: string) => {
    const next = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    onChange({ ...filters, categories: next });
  };

  const toggleAvailability = (val: AvailabilityFilter) => {
    const next = filters.availability.includes(val)
      ? filters.availability.filter((a) => a !== val)
      : [...filters.availability, val];
    onChange({ ...filters, availability: next });
  };

  const activeCount = [
    filters.minPrice > 0,
    filters.maxPrice < 3000,
    filters.categories.length > 0,
    filters.availability.length > 0,
    filters.minRating > 0,
    filters.customizableOnly,
  ].filter(Boolean).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110] bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
            className="fixed top-0 left-0 z-[120] h-full w-[300px] bg-background shadow-2xl flex flex-col"
            role="dialog"
            aria-label="Product filters"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="font-body text-sm font-semibold tracking-[0.12em] uppercase">
                  Filters
                </span>
                {activeCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground rounded-full text-[10px] font-bold">
                    {activeCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close filters"
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {/* Price Range */}
              <section>
                <p className="font-body text-xs uppercase tracking-[0.15em] text-muted-foreground mb-3">
                  Price Range (₹)
                </p>
                <div className="space-y-3">
                  <input
                    type="range"
                    min={0}
                    max={3000}
                    step={50}
                    value={filters.maxPrice}
                    onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
                    className="w-full accent-primary"
                    aria-label="Maximum price"
                  />
                  <div className="flex justify-between font-body text-xs text-muted-foreground">
                    <span>₹0</span>
                    <span className="text-foreground font-semibold">
                      up to ₹{filters.maxPrice.toLocaleString('en-IN')}
                    </span>
                    <span>₹3,000</span>
                  </div>
                </div>
              </section>

              {/* Category */}
              {allCategories.length > 0 && (
                <section>
                  <p className="font-body text-xs uppercase tracking-[0.15em] text-muted-foreground mb-3">
                    Category
                  </p>
                  <div className="space-y-2">
                    {allCategories.map((cat) => (
                      <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={filters.categories.includes(cat)}
                          onChange={() => toggleCategory(cat)}
                          className="w-4 h-4 rounded accent-primary"
                        />
                        <span className="font-body text-sm group-hover:text-foreground transition-colors">
                          {cat}
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {/* Availability */}
              <section>
                <p className="font-body text-xs uppercase tracking-[0.15em] text-muted-foreground mb-3">
                  Availability
                </p>
                <div className="space-y-2">
                  {AVAILABILITY_OPTIONS.map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={filters.availability.includes(value)}
                        onChange={() => toggleAvailability(value)}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <span className="font-body text-sm group-hover:text-foreground transition-colors">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Rating */}
              <section>
                <p className="font-body text-xs uppercase tracking-[0.15em] text-muted-foreground mb-3">
                  Rating
                </p>
                <div className="space-y-2">
                  {RATING_OPTIONS.map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="rating-filter"
                        checked={filters.minRating === value}
                        onChange={() => onChange({ ...filters, minRating: value })}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="flex items-center gap-1.5">
                        {Array.from({ length: value }).map((_, i) => (
                          <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                        ))}
                        <span className="font-body text-xs text-muted-foreground group-hover:text-foreground transition-colors ml-1">
                          {label}
                        </span>
                      </span>
                    </label>
                  ))}
                  {filters.minRating > 0 && (
                    <button
                      onClick={() => onChange({ ...filters, minRating: 0 })}
                      className="font-body text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Clear rating
                    </button>
                  )}
                </div>
              </section>

              {/* Customizable Only */}
              <section>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.customizableOnly}
                    onChange={(e) => onChange({ ...filters, customizableOnly: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="font-body text-sm group-hover:text-foreground transition-colors">
                    Customizable products only
                  </span>
                </label>
              </section>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  onReset();
                }}
                className="py-2.5 border border-border rounded-lg font-body text-sm hover:bg-muted transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  onApply();
                  onClose();
                }}
                className="py-2.5 bg-primary text-primary-foreground rounded-lg font-body text-sm hover:opacity-90 transition-opacity"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
