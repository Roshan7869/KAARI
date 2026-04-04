import KaariFooter from "@/components/KaariFooter";
import Navbar from "@/components/Navbar";

export default function RefundPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">
            Refund and Return Policy
          </h1>

          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground leading-relaxed">
            <p className="text-muted-foreground mb-8">
              Last Updated: January 2026
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">1. Introduction</h2>
              <p className="text-muted-foreground">
                We want you to love your handmade crochet products from Kaari Marketplace. If you&apos;re not completely satisfied, we offer flexible refund and return options for eligible items.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">2. Return Window</h2>
              <p className="text-muted-foreground">
                You may return most items within <strong>30 days</strong> of receiving your order for a full refund. Items must be unused, in original packaging, and with all tags attached.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">3. Eligibility for Refunds</h2>
              <p className="text-muted-foreground mb-3">Items are eligible for refund if:</p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Returned within 30 days of delivery</li>
                <li>Unused and in original condition</li>
                <li>In original packaging with tags intact</li>
                <li>Not a custom-made or personalized item</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">4. Non-Refundable Items</h2>
              <p className="text-muted-foreground mb-3">
                The following items cannot be returned or refunded due to their nature:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li><strong>Custom/Personalized Orders:</strong> Items made to your specifications</li>
                <li><strong>Gift Cards:</strong> Digital or physical gift cards</li>
                <li><strong>Downloadable Files:</strong> Digital patterns or plans</li>
                <li><strong>Intimate Items:</strong> Personal items for health reasons</li>
                <li><strong>Perishable Items:</strong> Any food or perishable products</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">5. Defective or Damaged Items</h2>
              <p className="text-muted-foreground mb-3">
                If you receive a defective, damaged, or incorrect item:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Contact us within 48 hours of delivery</li>
                <li>Provide photos of the damage or defect</li>
                <li>We will arrange for replacement or full refund</li>
                <li>We cover return shipping for defective items</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">6. How to Initiate a Return</h2>
              <p className="text-muted-foreground mb-3">Follow these steps to return an item:</p>
              <ol className="list-decimal list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Log into your account and go to &quot;Order History&quot;</li>
                <li>Select the order containing the item you want to return</li>
                <li>Click &quot;Request Return&quot; and select the items</li>
                <li>Print the return label (if applicable)</li>
                <li>Package the item securely and ship it back</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">7. Refund Processing</h2>
              <p className="text-muted-foreground mb-3">Once we receive your returned item:</p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Inspection takes 2-3 business days</li>
                <li>Refunds are processed within 5 business days of approval</li>
                <li>Refunds appear on your original payment method in 3-10 business days</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                <strong>Note:</strong> Original shipping charges are non-refundable unless the return is due to our error.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">8. Exchange Policy</h2>
              <p className="text-muted-foreground mb-3">
                If you&apos;d like to exchange an item for a different size, color, or product:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Item must be returned in original condition</li>
                <li>Exchanges subject to availability of the new item</li>
                <li>You may be charged for price differences</li>
                <li>Free exchange shipping for first exchange per order</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">9. Custom Order Cancellations</h2>
              <p className="text-muted-foreground mb-3">
                For custom orders:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Full refund if canceled before production begins</li>
                <li>50% refund if canceled during production (within 7 days of order)</li>
                <li>No refund if canceled after production is complete</li>
                <li>Quote requests can be canceled anytime before acceptance</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">10. International Returns</h2>
              <p className="text-muted-foreground mb-3">
                For international customers:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Return window extended to 60 days</li>
                <li>Customer covers return shipping costs</li>
                <li>Customs duties are non-refundable</li>
                <li>Items must be clearly marked &quot;RETURNED GOODS&quot;</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">11. Warranty Information</h2>
              <p className="text-muted-foreground mb-3">
                All products come with a <strong>90-day craftsmanship warranty</strong>:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Covers defects in materials and workmanship</li>
                <li>Does not cover normal wear and tear</li>
                <li>Does not cover damage from misuse or accidents</li>
                <li>Warranty is non-transferable</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">12. Questions?</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Refund and Return Policy, please contact us:
              </p>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-muted-foreground">
                  Email: <a href="mailto:returns@kaari.in" className="text-primary">returns@kaari.in</a><br />
                  Phone: <a href="tel:+919999999999" className="text-primary">+91 99999 99999</a>
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
