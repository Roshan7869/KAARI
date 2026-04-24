import KaariFooter from "@/components/KaariFooter";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Kaari',
  description: 'Learn how Kaari collects, uses, and protects your personal information when you shop for handmade crochet products.',
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">
            Privacy Policy
          </h1>

          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground leading-relaxed">
            <p className="text-muted-foreground mb-8">
              Last Updated: April 2026
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">1. Introduction</h2>
              <p className="text-muted-foreground">
                At Kaari Marketplace (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), we respect and safeguard the privacy of our users. This Privacy Policy describes how we collect, use, share, and protect your personal information when you visit our website (kaari.in) or use our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">2. Information We Collect</h2>
              <p className="text-muted-foreground mb-3">We collect information that you provide directly to us:</p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li><strong>Account Information:</strong> Name, email address, phone number, and password</li>
                <li><strong>Profile Information:</strong> Shipping address, billing address, and profile picture</li>
                <li><strong>Order Information:</strong> Product details, order history, and payment information</li>
                <li><strong>Customization Details:</strong> Messages, size specifications, material preferences for custom orders</li>
                <li><strong>Communications:</strong> Messages exchanged through our platform and customer support interactions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">3. Information We Collect Automatically</h2>
              <p className="text-muted-foreground mb-3">When you visit our website, we automatically collect:</p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li><strong>Device Information:</strong> Browser type, OS version, IP address, and device identifiers</li>
                <li><strong>Usage Information:</strong> Pages visited, time spent on pages, navigation patterns</li>
                <li><strong>Location Information:</strong> General location (country/city) based on IP address</li>
                <li><strong>Cookies and Tracking:</strong> Session cookies, preference cookies, and analytics cookies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">4. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-3">We use the information we collect to:</p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Process and fulfill your orders</li>
                <li>Manage your account and provide customer support</li>
                <li>Send order confirmations and shipping updates</li>
                <li>Improve our products, services, and website functionality</li>
                <li>Personalize your shopping experience</li>
                <li>Send marketing communications (with your consent)</li>
                <li>Detect and prevent fraud and security breaches</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">5. Sharing Your Information</h2>
              <p className="text-muted-foreground mb-3">We do not sell your personal information. We may share your information with:</p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li><strong>Service Providers:</strong> Payment processors, shipping carriers, and fraud prevention services</li>
                <li><strong>Artisans and Sellers:</strong> To fulfill your orders and deliver products</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">6. Data Protection</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and access controls.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">7. Your Rights</h2>
              <p className="text-muted-foreground mb-3">You have the right to:</p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Access your personal information</li>
                <li>Correct inaccurate or incomplete information</li>
                <li>Request deletion of your personal information</li>
                <li>Restrict processing of your information</li>
                <li>Data portability - receive your information in a structured format</li>
                <li>Withdraw consent at any time</li>
                <li>Opt out of marketing communications</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">8. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law. Order data is retained for tax and accounting purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">9. Cookies and Tracking</h2>
              <p className="text-muted-foreground mb-3">We use cookies to:</p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Keep you logged in</li>
                <li>Remember your cart contents</li>
                <li>Analyze website traffic and usage patterns</li>
                <li>Personalize content and ads</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                You can set your browser to refuse cookies, but some website features may not function properly without them.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">10. Childrens Privacy</h2>
              <p className="text-muted-foreground">
                Our website is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">11. International Data Transfer</h2>
              <p className="text-muted-foreground">
                Your information may be transferred to and processed in countries outside your residence, including India. We ensure appropriate safeguards are in place for such transfers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">12. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">13. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy, please contact our Data Protection Officer:
              </p>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-muted-foreground">
                  Email: <a href="mailto:privacy@kaari.in" className="text-primary">privacy@kaari.in</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
      <KaariFooter />
    </main>
  );
}
