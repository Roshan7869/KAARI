import KaariFooter from "@/components/KaariFooter";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Kaari',
  description: 'Read the terms and conditions governing your use of Kaari and purchase of our handmade crochet products.',
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">
            Terms of Service
          </h1>

          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground leading-relaxed">
            <p className="text-muted-foreground mb-8">
              Last Updated: April 2026
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using Kaari Marketplace (&quot;the Platform&quot;), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">2. Use License</h2>
              <p className="text-muted-foreground">
                Permission is granted to temporarily view the materials (information or software) on Kaari Marketplace&apos;s website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or public display</li>
                <li>Attempt to decompile or reverse engineer any software on the site</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
                <li>Transfer the materials to another person or &quot;mirror&quot; the materials on any other server</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">3. Disclaimer</h2>
              <p className="text-muted-foreground">
                The materials on Kaari Marketplace&apos;s website are provided on an &quot;as is&quot; basis. Kaari Marketplace makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">4. Revisions and Errata</h2>
              <p className="text-muted-foreground">
                The materials appearing on Kaari Marketplace&apos;s website could include technical, typographical, or photographic errors. Kaari Marketplace does not warrant that any of the materials on its website are accurate, complete, or current. Kaari Marketplace may make changes to the materials contained on its website at any time without notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">5. Price Accuracy</h2>
              <p className="text-muted-foreground">
                We make every effort to ensure that the prices displayed on Kaari Marketplace are accurate and up-to-date. However, prices can change frequently, and we cannot guarantee the accuracy of prices at any given time. The final price for any order shall be determined by our order confirmation system.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">6. Refund Policy</h2>
              <p className="text-muted-foreground">
                Please refer to our <a href="/legal/refund" className="text-primary hover:underline">Refund Policy</a> for detailed information about our refund and return procedures.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">7. Shipping Policy</h2>
              <p className="text-muted-foreground">
                Please refer to our <a href="/legal/shipping" className="text-primary hover:underline">Shipping Policy</a> for detailed information about our shipping methods, timelines, and costs.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">8. Privacy</h2>
              <p className="text-muted-foreground">
                Your privacy is important to us. Please refer to our <a href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</a> for information on how we collect, use, and protect your personal data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">9. Revisions to Terms</h2>
              <p className="text-muted-foreground">
                Kaari Marketplace may revise these terms of service for its website at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">10. Governing Law</h2>
              <p className="text-muted-foreground">
                These terms and conditions are governed by and construed in accordance with the laws of India and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">11. Grievance Redressal</h2>
              <p className="text-muted-foreground">
                In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the name and contact details of the Grievance Officer are:
              </p>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-muted-foreground">
                  <strong>Grievance Officer:</strong> Kaari Support Team<br />
                  Email: <a href="mailto:grievance@kaari.in" className="text-primary">grievance@kaari.in</a><br />
                  Response time: Acknowledgment within 24 hours, resolution within 15 days
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">12. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-muted-foreground">
                  Email: <a href="mailto:hello@kaari.in" className="text-primary">hello@kaari.in</a>
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
