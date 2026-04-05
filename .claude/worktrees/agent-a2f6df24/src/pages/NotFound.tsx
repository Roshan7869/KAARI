import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import KaariFooter from "@/components/KaariFooter";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="overflow-x-hidden">
      <Navbar variant="solid" />
      
      <div className="min-h-[70vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center px-6"
        >
          <div className="mb-8">
            <span className="font-display text-9xl md:text-[12rem] font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              404
            </span>
          </div>
          
          <h1 className="font-display text-3xl md:text-5xl text-foreground mb-4">
            Page Not Found
          </h1>
          
          <p className="font-heritage text-lg text-muted-foreground mb-8 max-w-md mx-auto">
            Oops! The page you're looking for has wandered off like a loose thread.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 yarn-button px-8 py-4 bg-primary text-primary-foreground font-body text-sm tracking-[0.15em] uppercase"
            >
              <ArrowLeft className="w-4 h-4" />
              Return Home
            </Link>
            
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 yarn-button px-8 py-4 bg-background text-foreground border border-border font-body text-sm tracking-[0.15em] uppercase hover:bg-accent/5 transition-colors"
            >
              Browse Products
            </Link>
          </div>

          <p className="font-body text-xs text-muted-foreground mt-8">
            Error: Requested path "{location.pathname}" does not exist
          </p>
        </motion.div>
      </div>
      
      <KaariFooter />
    </main>
  );
};

export default NotFound;
