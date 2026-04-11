'use client';

import { Share2 } from 'lucide-react';
import {
  buildTrackedProductUrl,
  createDmOrderIntentPayload,
  dispatchDmOrderIntent,
} from '@/lib/socialAttribution';

interface CardShareButtonProps {
  slug: string;
  title: string;
  price: number;
}

export default function CardShareButton({ slug, title, price }: CardShareButtonProps) {
  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = buildTrackedProductUrl({
      slug,
      source: 'website',
      medium: 'card_share',
      campaign: 'instagram-dm-orders',
    });

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${title} — Kaari Handmade`,
          text: `Check out ${title} at ₹${price.toLocaleString('en-IN')} on Kaari Handmade!`,
          url,
        });
        await dispatchDmOrderIntent(
          createDmOrderIntentPayload({
            channel: 'card_share',
            productSlug: slug,
            productTitle: title,
            productPrice: price,
          })
        );
        return;
      } catch {
        // fall through
      }
    }

    // Fallback: copy link
    try {
      await navigator.clipboard.writeText(url);
      await dispatchDmOrderIntent(
        createDmOrderIntentPayload({
          channel: 'copy_link',
          productSlug: slug,
          productTitle: title,
          productPrice: price,
        })
      );
    } catch {}
  };

  return (
    <button
      onClick={handleShare}
      aria-label="Share product"
      className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow text-foreground hover:text-primary"
    >
      <Share2 className="w-3.5 h-3.5" />
    </button>
  );
}
