'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingCart, User, LogOut, Loader2, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

interface NavbarProps {
  variant?: 'transparent' | 'solid' | 'glass';
}

export default function Navbar({ variant = 'solid' }: NavbarProps) {
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Auth context integration
  const { user, loading: authLoading, signOut } = useAuth();
  const { cart } = useCart();
  const cartItemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
  };

  // Determine navbar style based on variant and scroll state
  const getNavbarStyle = () => {
    if (variant === 'transparent') {
      if (scrolled) {
        return 'glass-navbar';
      }
      return 'bg-transparent';
    }
    if (variant === 'glass') {
      return 'glass-navbar';
    }
    return 'glass-card-cream';
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 ${getNavbarStyle()}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8">
            <Image
              src="/images/kaari-logo.webp"
              alt="Kaari"
              fill
              className="object-contain"
              sizes="32px"
            />
          </div>
          <span className="font-display text-xl text-foreground group-hover:text-primary transition-colors">
            कारी
          </span>
        </Link>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-foreground hover:bg-kaari-cream/10 rounded-lg transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className={`font-body text-xs tracking-[0.15em] uppercase transition-colors thread-underline ${
              pathname === '/' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Home
          </Link>
          <Link
            href="/products"
            className={`font-body text-xs tracking-[0.15em] uppercase transition-colors thread-underline ${
              pathname === '/products' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Products
          </Link>

          {authLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                aria-expanded={showDropdown}
                aria-haspopup="menu"
                className="flex items-center gap-2 font-body text-xs tracking-[0.15em] uppercase text-foreground hover:text-accent transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Account</span>
              </button>

              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 glass-card-cream rounded-lg shadow-lg overflow-hidden"
                    role="menu"
                  >
                    <div className="p-3 border-b border-kaari-warm-brown/20">
                      <p className="font-body text-xs text-muted-foreground">Signed in as</p>
                      <p className="font-body text-sm text-foreground truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/cart"
                      className="block px-3 py-2 font-body text-sm text-foreground hover:bg-kaari-cream/50 transition-colors"
                      onClick={() => setShowDropdown(false)}
                      role="menuitem"
                    >
                      My Cart
                    </Link>
                    <Link
                      href="/admin"
                      className="block px-3 py-2 font-body text-sm text-foreground hover:bg-kaari-cream/50 transition-colors"
                      onClick={() => setShowDropdown(false)}
                      role="menuitem"
                    >
                      Admin
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-3 py-2 font-body text-sm text-foreground hover:bg-kaari-cream/50 transition-colors"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 font-body text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </Link>
          )}

          <Link
            href="/cart"
            className="relative flex items-center gap-2 font-body text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Cart</span>
            {cartItemCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-accent text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center"
              >
                {cartItemCount}
              </motion.span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-card-cream border-t border-kaari-warm-brown/10"
          >
            <div className="px-6 py-4 space-y-4">
              <Link
                href="/"
                className={`block font-body text-sm ${
                  pathname === '/' ? 'text-primary' : 'text-foreground hover:text-accent'
                }`}
              >
                Home
              </Link>
              <Link
                href="/products"
                className={`block font-body text-sm ${
                  pathname === '/products' ? 'text-primary' : 'text-foreground hover:text-accent'
                }`}
              >
                Products
              </Link>
              {user ? (
                <>
                  <Link
                    href="/cart"
                    className="block font-body text-sm text-foreground hover:text-accent"
                  >
                    My Cart ({cartItemCount})
                  </Link>
                  <Link
                    href="/admin"
                    className="block font-body text-sm text-foreground hover:text-accent"
                  >
                    Admin
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block font-body text-sm text-foreground hover:text-accent"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="block font-body text-sm text-foreground hover:text-accent"
                >
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}