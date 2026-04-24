'use client';

import { useState } from 'react';
import { Share2, Link2, Instagram, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WHATSAPP_NUMBER } from '@/lib/constants';
import {
  buildTrackedProductUrl,
  createDmOrderIntentPayload,
  dispatchDmOrderIntent,
} from '@/lib/socialAttribution';

interface ProductShareBoxProps {
  title: string;
  price: number;
  slug: string;
  category?: string | null;
  description?: string | null;
}

export default function ProductShareBox({
  title,
  price,
  slug,
  category,
  description,
}: ProductShareBoxProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const productUrl = buildTrackedProductUrl({
    slug,
    source: 'website',
    medium: 'share_box',
    campaign: 'instagram-dm-orders',
  });

  const shortDesc = description
    ? description.slice(0, 100) + (description.length > 100 ? '...' : '')
    : 'Handmade with love by Indian artisans.';

  // Pre-filled Instagram DM message
  const igDmText = encodeURIComponent(
    `Hi Kaari! 🧶 I'm interested in ordering:\n\n*${title}*\nPrice: ₹${price.toLocaleString('en-IN')}\n\nProduct link: ${productUrl}\n\nPlease let me know about availability and delivery! 🙏`
  );

  // Pre-filled WhatsApp message
  const waText = encodeURIComponent(
    `Hi Kaari Handmade! 🧶\n\nI'd like to order:\n*${title}*\nPrice: ₹${price.toLocaleString('en-IN')}\n\n${productUrl}\n\nKindly share availability & delivery details. Thank you!`
  );

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;
  const instagramUrl = `https://www.instagram.com/kaari.handmade/`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      await dispatchDmOrderIntent(
        createDmOrderIntentPayload({
          channel: 'copy_link',
          productSlug: slug,
          productTitle: title,
          productPrice: price,
          category,
        })
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('input');
      el.value = productUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      await dispatchDmOrderIntent(
        createDmOrderIntentPayload({
          channel: 'copy_link',
          productSlug: slug,
          productTitle: title,
          productPrice: price,
          category,
        })
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${title} — Kaari Handmade`,
          text: `${shortDesc}\n\nPrice: ₹${price.toLocaleString('en-IN')}`,
          url: productUrl,
        });
        await dispatchDmOrderIntent(
          createDmOrderIntentPayload({
            channel: 'native_share',
            productSlug: slug,
            productTitle: title,
            productPrice: price,
            category,
          })
        );
        return;
      } catch {
        // Fall through to share box
      }
    }
    setOpen((prev) => !prev);
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleNativeShare}
        className="flex items-center gap-2 border-accent/40 text-muted-foreground hover:text-foreground hover:border-accent transition-colors"
        aria-label="Share this product"
      >
        <Share2 className="w-4 h-4" />
        <span className="font-body text-xs tracking-wide">Share</span>
      </Button>

      {/* Share Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="absolute bottom-full mb-2 right-0 z-50 w-72 glass-card-cream rounded-xl border border-accent/20 shadow-xl p-4 animate-scale-in">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display text-sm text-foreground">Share this product</p>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close share panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product preview */}
            <div className="mb-3 p-2.5 bg-background/50 rounded-lg border border-border">
              <p className="font-body text-xs text-muted-foreground truncate">{category}</p>
              <p className="font-display text-sm text-foreground truncate">{title}</p>
              <p className="font-body text-xs text-primary font-semibold">
                ₹{price.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="space-y-2">
              {/* Instagram DM */}
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={async () => {
                  // Open IG and copy DM message to clipboard
                  navigator.clipboard
                    .writeText(decodeURIComponent(igDmText))
                    .catch(() => {});
                  await dispatchDmOrderIntent(
                    createDmOrderIntentPayload({
                      channel: 'instagram_dm',
                      productSlug: slug,
                      productTitle: title,
                      productPrice: price,
                      category,
                    })
                  );
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white font-body text-sm hover:opacity-90 transition-opacity"
              >
                <Instagram className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">Order via Instagram DM</span>
                <span className="text-xs opacity-80">@kaari.handmade</span>
              </a>

              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={async () => {
                  await dispatchDmOrderIntent(
                    createDmOrderIntentPayload({
                      channel: 'whatsapp',
                      productSlug: slug,
                      productTitle: title,
                      productPrice: price,
                      category,
                    })
                  );
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-[#25D366] text-white font-body text-sm hover:opacity-90 transition-opacity"
              >
                {/* WhatsApp SVG icon */}
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span className="flex-1">Order via WhatsApp</span>
                <span className="text-xs opacity-80">9131548788</span>
              </a>

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground font-body text-sm hover:bg-accent/10 transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <Link2 className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="flex-1">{copied ? 'Link Copied!' : 'Copy Product Link'}</span>
              </button>
            </div>

            {/* Footer note */}
            <p className="mt-3 text-center font-body text-[10px] text-muted-foreground/60">
              We accept orders via Instagram DM & WhatsApp
            </p>
          </div>
        </>
      )}
    </div>
  );
}
