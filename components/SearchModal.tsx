"use client";

import { useEffect, useRef } from "react";
import { X, Search } from "lucide-react";
import Link from "next/link";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

const SEARCH_HINTS = [
  { label: "Handbags", href: "/products?cat=Crochet Handbags" },
  { label: "Crochet Bouquets", href: "/products?cat=Crochet Bouquet" },
  { label: "Hair Accessories", href: "/products?cat=Crochet Hair Accessories" },
  { label: "Keychains", href: "/products?cat=Crochet Keychains" },
];

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  /* Auto-focus input when modal opens */
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* Prevent body scroll while open */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: "rgba(31,4,7,0.88)", backdropFilter: "blur(6px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl">
        {/* Close button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            aria-label="Close search"
            className="w-9 h-9 rounded-full bg-maroon/60 border border-gold/30 flex items-center justify-center text-gold hover:bg-maroon transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search box */}
        <div className="relative flex items-center bg-ivory rounded-xl shadow-2xl ring-2 ring-gold/25 overflow-hidden">
          <Search size={18} className="absolute left-4 text-maroon/50 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search for wearables, bouquets…"
            className="w-full bg-transparent py-4 pl-11 pr-12 text-maroon-deep placeholder:text-maroon/40 text-[15px] outline-none font-dm-sans"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const q = (e.target as HTMLInputElement).value.trim();
                if (q) {
                  window.location.href = `/products?search=${encodeURIComponent(q)}`;
                  onClose();
                }
              }
            }}
          />
        </div>

        {/* Hints */}
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-[.18em] text-gold/60 mb-2.5">
            Popular searches
          </p>
          <div className="flex flex-wrap gap-2">
            {SEARCH_HINTS.map((hint) => (
              <Link
                key={hint.href}
                href={hint.href}
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-full border border-gold/30 text-[13px] text-gold-light hover:bg-maroon/60 hover:border-gold/60 transition-colors"
              >
                {hint.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
