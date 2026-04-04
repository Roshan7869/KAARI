'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingBag, User, LogOut, ChevronDown, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

export default function Navbar() {
  const pathname = usePathname();
  const { user, signOut, loading } = useAuth();
  const { cart } = useCart();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const cartCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setShowDropdown(false);
  }, [pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ease-out ${
        scrolled ? 'bg-white/90 backdrop-blur-sm shadow-sm' : 'bg-white'
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-lg focus:shadow-lg font-body text-sm"
      >
        Skip to main content
      </a>

      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="relative w-8 h-8">
            <Image
              src="/images/kaari-logo.webp"
              alt="Kaari"
              fill
              className="object-contain"
              sizes="32px"
            />
          </div>
          <span className="font-display text-xl text-stone-800 group-hover:text-primary transition-colors">
            कारी
          </span>
        </Link>

        {/* Desktop — 3 buttons */}
        <div className="hidden md:flex items-center gap-7">
          <Link
            href="/about"
            className={`font-body text-xs tracking-[0.15em] uppercase transition-colors duration-200 ${
              pathname === '/about'
                ? 'text-primary'
                : 'text-stone-500 hover:text-stone-900'
            }`}
            aria-current={pathname === '/about' ? 'page' : undefined}
          >
            About Us
          </Link>

          {/* Sign In / Account */}
          {loading ? (
            <div className="w-16 h-4 bg-stone-200 animate-pulse rounded" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setShowDropdown((v) => !v)}
                className="flex items-center gap-1.5 font-body text-xs tracking-[0.15em] uppercase text-stone-500 hover:text-stone-900 transition-colors duration-200"
                aria-expanded={showDropdown}
                aria-haspopup="menu"
              >
                <User className="w-3.5 h-3.5" aria-hidden />
                <span className="max-w-[100px] truncate">
                  {user.user_metadata?.full_name ?? user.email?.split('@')[0]}
                </span>
                <ChevronDown className="w-3 h-3" aria-hidden />
              </button>

              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-stone-100 overflow-hidden"
                    role="menu"
                  >
                    <div className="px-4 py-3 border-b border-stone-100">
                      <p className="text-xs text-stone-400 font-body">Signed in as</p>
                      <p className="text-sm text-stone-800 font-body truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/cart"
                      className="block px-4 py-2.5 font-body text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                      role="menuitem"
                    >
                      My Cart
                    </Link>
                    <Link
                      href="/account"
                      className="block px-4 py-2.5 font-body text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                      role="menuitem"
                    >
                      My Orders
                    </Link>
                    <Link
                      href="/admin"
                      className="block px-4 py-2.5 font-body text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                      role="menuitem"
                    >
                      Admin
                    </Link>
                    <button
                      onClick={() => { signOut(); setShowDropdown(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 font-body text-sm text-stone-700 hover:bg-stone-50 transition-colors border-t border-stone-100"
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
              className="font-body text-xs tracking-[0.15em] uppercase text-stone-500 hover:text-stone-900 transition-colors duration-200"
            >
              Sign In
            </Link>
          )}

          {/* Cart */}
          <Link
            href="/cart"
            className="relative flex items-center"
            aria-label={cartCount > 0 ? `Cart — ${cartCount} items` : 'Cart — empty'}
          >
            <ShoppingBag className="w-5 h-5 text-stone-600 hover:text-stone-900 transition-colors duration-200" aria-hidden />
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                aria-hidden
              >
                {cartCount > 99 ? '99+' : cartCount}
              </motion.span>
            )}
          </Link>
          {/* Live region for cart — screen readers */}
          <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? 's' : ''} in cart` : ''}
          </span>
        </div>

        {/* Mobile — Cart + Hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <Link
            href="/cart"
            className="relative"
            aria-label={cartCount > 0 ? `Cart — ${cartCount} items` : 'Cart — empty'}
          >
            <ShoppingBag className="w-5 h-5 text-stone-600" aria-hidden />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="p-1.5 text-stone-600 hover:text-stone-900 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile fullscreen overlay */}
      <div id="mobile-menu">
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-white border-t border-stone-100 shadow-md"
              role="navigation"
              aria-label="Mobile navigation"
            >
              <div className="px-6 py-5 space-y-5">
                <Link
                  href="/about"
                  className="block font-body text-sm tracking-[0.12em] uppercase text-stone-700 hover:text-primary transition-colors"
                  aria-current={pathname === '/about' ? 'page' : undefined}
                >
                  About Us
                </Link>
                {user ? (
                  <>
                    <Link href="/account" className="block font-body text-sm text-stone-700 hover:text-primary transition-colors">
                      My Orders
                    </Link>
                    <button
                      onClick={signOut}
                      className="block font-body text-sm text-stone-700 hover:text-primary transition-colors text-left"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="block font-body text-sm tracking-[0.12em] uppercase text-stone-700 hover:text-primary transition-colors">
                    Sign In
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
