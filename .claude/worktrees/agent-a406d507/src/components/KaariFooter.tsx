import darkWoolTexture from '@/assets/dark-wool-texture.webp';
import kaariLogo from '@/assets/kaari-logo.webp';

export default function KaariFooter() {
  return (
    <footer className="relative py-16 md:py-24">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${darkWoolTexture})` }}
      />
      <div className="absolute inset-0 bg-kaari-dark/80" />

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12 text-center md:text-left">
          {/* Brand */}
          <div>
            <img src={kaariLogo} alt="Kaari Logo" className="w-16 h-16 object-contain mb-2 mx-auto md:mx-0" />
            <h3 className="font-display text-3xl text-kaari-cream mb-2">कारी</h3>
            <p className="font-heritage text-kaari-gold text-sm tracking-[0.2em] uppercase">
              Kaari Handmade
            </p>
            <p className="font-heritage text-kaari-cream/60 mt-4 text-sm">
              Unique designs woven with love
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-kaari-cream text-lg mb-4">Contact</h4>
            <div className="space-y-2 font-heritage text-kaari-cream/70 text-sm">
              <p>
                <a
                  href="https://www.instagram.com/kaari.handmade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="thread-underline hover:text-kaari-gold transition-colors"
                >
                  @kaari.handmade
                </a>
              </p>
              <p>
                <a href="tel:9131548788" className="thread-underline hover:text-kaari-gold transition-colors">
                  9131548788
                </a>
              </p>
            </div>
          </div>

          {/* Features */}
          <div>
            <h4 className="font-display text-kaari-cream text-lg mb-4">Services</h4>
            <div className="space-y-2 font-heritage text-kaari-cream/70 text-sm">
              <p>✦ Online Orders Accepted</p>
              <p>✦ Customisation Available</p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-kaari-cream/10 text-center">
          <p className="font-heritage text-kaari-cream/40 text-xs tracking-wider">
            © 2026 Kaari Handmade. All rights reserved. Crafted with ♡
          </p>
        </div>
      </div>
    </footer>
  );
}
