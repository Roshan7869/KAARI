'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, User, LogOut, ChevronDown, Menu, X, Heart, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import SearchModal from '@/components/SearchModal';

const NAV_LINKS = [
  { label: 'Shop All', href: '/products' },
  { label: 'Wearables', href: '/category/wearables' },
  { label: 'Bouquets', href: '/category/bouquets' },
  { label: 'Accessories', href: '/category/hair-accessories' },
  { label: 'Custom Orders', href: '/custom' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, signOut, loading, isAdmin } = useAuth();
  const { cart } = useCart();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const cartCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setShowDropdown(false);
  }, [pathname]);

  const userDropdownExpanded = showDropdown ? 'true' : 'false';
  const mobileMenuExpanded = mobileMenuOpen ? 'true' : 'false';

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-shadow duration-300 ${
          scrolled ? 'shadow-[0_2px_16px_rgba(31,4,7,0.10)]' : ''
        }`}
        style={{
          background: 'hsl(var(--kaari-cream-warm) / 0.93)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid hsl(var(--kaari-gold) / 0.18)',
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Skip to main content */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-ivory focus:text-maroon-deep focus:rounded-lg focus:shadow-lg font-dm-sans text-sm"
        >
          Skip to main content
        </a>

        <div className="max-w-[1320px] mx-auto px-5 h-[62px] flex items-center justify-between gap-4">
          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            {/* Crochet needle icon */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center ring-2 flex-shrink-0"
              style={{
                background: 'hsl(var(--kaari-maroon))',
                ringColor: 'hsl(var(--kaari-gold) / 0.35)',
              }}
            >
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" aria-hidden>
                <path d="M8 24 L20 6 L22 8 L24 7 C26 6 27 8 26 10 L24 12 L16 26 Z"
                  fill="hsl(var(--kaari-gold-light))" stroke="hsl(var(--kaari-gold))" strokeWidth="1"/>
                <circle cx="23" cy="9" r="2.5" fill="hsl(var(--kaari-gold))"/>
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-devanagari text-[22px] font-bold text-maroon leading-none">
                कारी
              </span>
              <span className="text-[9px] tracking-[.18em] uppercase text-maroon-dark/70 -mt-0.5">
                Handmade Crochet
              </span>
            </div>
          </Link>

          {/* ── Desktop nav links ── */}
          <div className="hidden md:flex items-center gap-6 lg:gap-7">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-dm-sans text-[12px] tracking-[0.12em] uppercase transition-colors duration-200 ${
                  pathname === link.href
                    ? 'text-maroon font-semibold'
                    : 'text-maroon-dark/70 hover:text-maroon'
                }`}
                aria-current={pathname === link.href ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── Right icons ── */}
          <div className="flex items-center gap-0.5">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-maroon-dark/70 hover:text-maroon hover:bg-maroon/8 transition-colors"
              aria-label="Open search"
            >
              <Search className="w-[17px] h-[17px]" aria-hidden />
            </button>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="w-9 h-9 flex items-center justify-center rounded-full text-maroon-dark/70 hover:text-maroon hover:bg-maroon/8 transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="w-[17px] h-[17px]" aria-hidden />
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative w-9 h-9 flex items-center justify-center rounded-full text-maroon-dark/70 hover:text-maroon hover:bg-maroon/8 transition-colors"
              aria-label={cartCount > 0 ? `Cart — ${cartCount} items` : 'Cart — empty'}
            >
              <ShoppingBag className="w-[17px] h-[17px]" aria-hidden />
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-0.5 text-[10px] font-bold rounded-full flex items-center justify-center"
                  style={{ background: 'hsl(var(--kaari-maroon))', color: 'hsl(var(--kaari-gold-light))' }}
                  aria-hidden
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </motion.span>
              )}
            </Link>
            <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? 's' : ''} in cart` : ''}
            </span>

            {/* Auth */}
            {!loading && (
              user ? (
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setShowDropdown((v) => !v)}
                    className="flex items-center gap-1 w-9 h-9 rounded-full text-maroon-dark/70 hover:text-maroon hover:bg-maroon/8 transition-colors justify-center"
                    aria-expanded={userDropdownExpanded}
                    aria-haspopup="menu"
                    aria-label="Account menu"
                  >
                    <User className="w-[17px] h-[17px]" aria-hidden />
                    <ChevronDown className="w-3 h-3" aria-hidden />
                  </button>

                  <AnimatePresence>
                    {showDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-52 bg-ivory rounded-xl shadow-xl border overflow-hidden"
                        style={{ borderColor: 'hsl(var(--kaari-gold) / 0.2)' }}
                        role="menubar"
                      >
                        <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(var(--kaari-gold) / 0.15)' }}>
                          <p className="text-[11px] text-maroon-dark/50 font-dm-sans">Signed in as</p>
                          <p className="text-sm text-maroon-deep font-dm-sans truncate">{user.email}</p>
                        </div>
                        <Link href="/account" className="block px-4 py-2.5 font-dm-sans text-sm text-maroon-dark hover:bg-cream-warm transition-colors" role="menuitem">My Orders</Link>
                        <Link href="/wishlist" className="block px-4 py-2.5 font-dm-sans text-sm text-maroon-dark hover:bg-cream-warm transition-colors" role="menuitem">Wishlist</Link>
                        {isAdmin && (
                          <Link href="/admin" className="block px-4 py-2.5 font-dm-sans text-sm text-maroon font-medium hover:bg-cream-warm transition-colors" role="menuitem">
                            Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={() => { signOut(); setShowDropdown(false); }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 font-dm-sans text-sm text-maroon-dark hover:bg-cream-warm transition-colors border-t"
                          style={{ borderColor: 'hsl(var(--kaari-gold) / 0.15)' }}
                          role="menuitem"
                        >
                          <LogOut className="w-4 h-4" aria-hidden />
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden md:flex items-center h-9 px-4 rounded-full font-dm-sans text-[12px] tracking-wide text-ivory transition-colors"
                  style={{ background: 'hsl(var(--kaari-maroon))' }}
                >
                  Sign In
                </Link>
              )
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuExpanded}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-full text-maroon-dark/70 hover:text-maroon hover:bg-maroon/8 transition-colors ml-1"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        <div id="mobile-menu">
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden border-t overflow-hidden"
                style={{
                  background: 'hsl(var(--kaari-cream-warm))',
                  borderColor: 'hsl(var(--kaari-gold) / 0.18)',
                }}
                role="navigation"
                aria-label="Mobile navigation"
              >
                <div className="px-5 py-4 space-y-4">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`block font-dm-sans text-sm tracking-[0.12em] uppercase transition-colors ${
                        pathname === link.href ? 'text-maroon font-semibold' : 'text-maroon-dark/70 hover:text-maroon'
                      }`}
                      aria-current={pathname === link.href ? 'page' : undefined}
                    >
                      {link.label}
                    </Link>
                  ))}

                  <div className="border-t pt-4 space-y-3" style={{ borderColor: 'hsl(var(--kaari-gold) / 0.15)' }}>
                    {user ? (
                      <>
                        <Link href="/account" className="block font-dm-sans text-sm text-maroon-dark hover:text-maroon transition-colors">My Orders</Link>
                        {isAdmin && (
                          <Link href="/admin" className="block font-dm-sans text-sm text-maroon font-medium">Admin Panel</Link>
                        )}
                        <button onClick={signOut} className="block font-dm-sans text-sm text-maroon-dark hover:text-maroon transition-colors text-left">
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <Link href="/login" className="block font-dm-sans text-sm text-maroon font-medium">Sign In</Link>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Search modal — rendered outside nav to avoid stacking-context issues */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
