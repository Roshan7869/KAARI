import Link from 'next/link';
import { WHATSAPP_NUMBER, BUSINESS_EMAIL } from '@/lib/constants';

const SHOP_LINKS = [
  { label: 'All Products', href: '/products' },
  { label: 'New Arrivals', href: '/products?sort=newest' },
  { label: 'Custom Orders', href: '/contact' },
  { label: 'Gift Ideas', href: '/products?tag=gift' },
];

const HELP_LINKS = [
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Shipping Policy', href: '/legal/shipping' },
  { label: 'Cancellation Policy', href: '/legal/cancellation' },
  { label: 'Refund Policy', href: '/legal/refund' },
  { label: 'Privacy Policy', href: '/legal/privacy' },
  { label: 'Terms of Service', href: '/legal/terms' },
];

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/kaari.handmade',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'WhatsApp',
    href: `https://wa.me/${WHATSAPP_NUMBER}`,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.29-1.244l-.306-.182-2.866.852.852-2.866-.182-.306A8 8 0 1112 20z" />
      </svg>
    ),
  },
];

export default function KaariFooter() {
  return (
    <footer className="bg-maroon-deep text-white/45 pt-16 md:pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 md:gap-8 pb-12 border-b border-white/10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-devanagari text-3xl text-gold mb-1">कारी</h3>
            <p className="font-dm-sans text-[10px] text-gold/60 tracking-[0.25em] uppercase mb-4">
              Kaari Handmade
            </p>
            <p className="font-dm-sans text-sm leading-relaxed max-w-[260px]">
              Unique crochet creations woven with love by Indian artisans. Each piece is handcrafted just for you.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3 mt-5">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full border border-white/12 flex items-center justify-center text-white/50 hover:text-gold hover:border-gold/40 transition-colors"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-dm-sans text-[10px] font-semibold text-gold tracking-[0.25em] uppercase mb-4">
              Shop
            </h4>
            <ul className="space-y-2.5">
              {SHOP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-dm-sans text-sm hover:text-gold-light transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="font-dm-sans text-[10px] font-semibold text-gold tracking-[0.25em] uppercase mb-4">
              Help
            </h4>
            <ul className="space-y-2.5">
              {HELP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-dm-sans text-sm hover:text-gold-light transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-dm-sans text-[10px] font-semibold text-gold tracking-[0.25em] uppercase mb-4">
              Contact
            </h4>
            <div className="space-y-2.5 font-dm-sans text-sm">
              <p>
                <a
                  href="https://www.instagram.com/kaari.handmade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold-light transition-colors"
                >
                  @kaari.handmade
                </a>
              </p>
              <p>
                <a
                  href={`tel:+${WHATSAPP_NUMBER}`}
                  className="hover:text-gold-light transition-colors"
                >
                  +91 91315 48788
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Payment badges + copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-3">
            <span className="font-dm-sans text-[10px] text-white/30 tracking-wider uppercase">
              UPI
            </span>
            <span className="w-px h-3 bg-white/10" />
            <span className="font-dm-sans text-[10px] text-white/30 tracking-wider uppercase">
              Cashfree
            </span>
            <span className="w-px h-3 bg-white/10" />
            <span className="font-dm-sans text-[10px] text-white/30 tracking-wider uppercase">
              Secure
            </span>
          </div>
          <p className="font-dm-sans text-white/30 text-xs tracking-wider">
            © {new Date().getFullYear()} Kaari Handmade. All rights reserved. Crafted with ♡
          </p>
        </div>
      </div>
    </footer>
  );
}