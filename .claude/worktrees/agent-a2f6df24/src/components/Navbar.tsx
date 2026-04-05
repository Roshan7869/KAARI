import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Loader2, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import kaariLogo from '@/assets/kaari-logo.webp';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  variant?: 'transparent' | 'solid';
}

export default function Navbar({ variant = 'solid' }: NavbarProps) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { cart } = useCart();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Memoize cart item count to prevent recalculation on every render
  const cartItemCount = useMemo(
    () => cart?.items.reduce((total, item) => total + item.quantity, 0) || 0,
    [cart?.items]
  );

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const handleSignOut = useCallback(async () => {
    try {
      setSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setSigningOut(false);
      setShowDropdown(false);
    }
  }, [signOut]);

  const bgClass = variant === 'transparent'
    ? 'bg-transparent'
    : 'bg-background/90 backdrop-blur-sm border-b border-border';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${bgClass}`} role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={kaariLogo} alt="Kaari" className="w-8 h-8 object-contain" />
          <span className="font-display text-xl text-foreground">कारी</span>
        </Link>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="font-body text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors thread-underline">
            Home
          </Link>
          <Link to="/products" className="font-body text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors thread-underline">
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
                    className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-sm shadow-lg"
                    role="menu"
                  >
                    <div className="p-3 border-b border-border">
                      <p className="font-body text-xs text-muted-foreground">Signed in as</p>
                      <p className="font-body text-sm text-foreground truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/cart"
                      className="block px-3 py-2 font-body text-sm text-foreground hover:bg-accent/10"
                      onClick={() => setShowDropdown(false)}
                      role="menuitem"
                    >
                      My Cart
                    </Link>
                    <Link
                      to="/admin"
                      className="block px-3 py-2 font-body text-sm text-foreground hover:bg-accent/10"
                      onClick={() => setShowDropdown(false)}
                      role="menuitem"
                    >
                      Admin
                    </Link>
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="flex items-center gap-2 w-full px-3 py-2 font-body text-sm text-foreground hover:bg-accent/10 disabled:opacity-50"
                      role="menuitem"
                    >
                      {signingOut ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 font-body text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </Link>
          )}

          <Link to="/cart" className="relative flex items-center gap-2 font-body text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors">
            <ShoppingCart className="w-4 h-4" />
            <span>Cart</span>
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-accent text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
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
            className="md:hidden bg-background border-b border-border"
          >
            <div className="px-6 py-4 space-y-4">
              <Link
                to="/"
                className="block font-body text-sm text-foreground hover:text-accent"
              >
                Home
              </Link>
              <Link
                to="/products"
                className="block font-body text-sm text-foreground hover:text-accent"
              >
                Products
              </Link>
              {user ? (
                <>
                  <Link
                    to="/cart"
                    className="block font-body text-sm text-foreground hover:text-accent"
                  >
                    My Cart ({cartItemCount})
                  </Link>
                  <Link
                    to="/admin"
                    className="block font-body text-sm text-foreground hover:text-accent"
                  >
                    Admin
                  </Link>
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="block font-body text-sm text-foreground hover:text-accent disabled:opacity-50"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
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