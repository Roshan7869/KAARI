import KaariFooter from "@/components/KaariFooter";
import Navbar from "@/components/Navbar";

export default function ShippingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">
            Shipping Policy
          </h1>

          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground leading-relaxed">
            <p className="text-muted-foreground mb-8">
              Last Updated: April 2026
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">1. Overview</h2>
              <p className="text-muted-foreground">
                At Kaari Marketplace, we ship handmade crochet products across India and select international locations. All orders are processed and shipped from our craft hub in Bhopal, Madhya Pradesh.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">2. Order Processing Time</h2>
              <p className="text-muted-foreground mb-3">
                <strong>Standard Processing:</strong> 2-3 business days
              </p>
              <p className="text-muted-foreground mb-3">
                <strong>Custom Orders:</strong> 7-14 days (production time)
              </p>
              <p className="text-muted-foreground">
                Please note that processing time begins after payment confirmation and may vary during peak seasons (festival periods, sales events).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">3. Shipping Methods and Timelines</h2>
              <p className="text-muted-foreground mb-3">We offer the following shipping options:</p>

              <div className="overflow-x-auto mt-4">
                <table className="w-full border-collapse border border-border text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-3 text-left">Shipping Method</th>
                      <th className="border border-border p-3 text-left">Delivery Timeline</th>
                      <th className="border border-border p-3 text-left">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr>
                      <td className="border border-border p-3">Standard Shipping</td>
                      <td className="border border-border p-3">5-7 business days</td>
                      <td className="border border-border p-3">Free* (above ₹499)</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3">Express Shipping</td>
                      <td className="border border-border p-3">2-3 business days</td>
                      <td className="border border-border p-3">₹99</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3">Priority Shipping</td>
                      <td className="border border-border p-3">1-2 business days</td>
                      <td className="border border-border p-3">₹199</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-sm mt-3">
                *Free standard shipping on orders above ₹499. For orders below ₹499, a flat shipping charge of ₹69 applies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">4. International Shipping</h2>
              <p className="text-muted-foreground mb-3">
                We ship to the following countries:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>United States, Canada</li>
                <li>United Kingdom, Germany, France</li>
                <li>Australia, New Zealand</li>
                <li>UAE, Singapore, Malaysia</li>
              </ul>

              <p className="text-muted-foreground mt-4 mb-3">
                <strong>International Delivery Timelines:</strong>
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>USA/Canada: 10-15 business days</li>
                <li>UK/Europe: 7-12 business days</li>
                <li>Asia/Australia: 8-14 business days</li>
              </ul>

              <p className="text-muted-foreground mt-4">
                <strong>International Shipping Costs:</strong> Calculated at checkout based on destination and package weight. Customs duties and taxes are the responsibility of the recipient.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">5. Tracking Your Order</h2>
              <p className="text-muted-foreground">
                Once your order is shipped, you&apos;ll receive an email with a tracking number and a link to track your package. You can also view your tracking information in your account under &quot;Order History.&quot;
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">6. Packaging</h2>
              <p className="text-muted-foreground mb-3">
                We take great care in packaging your handmade items:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Eco-friendly recycled packaging materials</li>
                <li>Protective wrapping to prevent damage during transit</li>
                <li>Branded packaging with care instructions</li>
                <li>Gift wrapping available at checkout (free for orders above ₹1999)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">7. Address Changes and Delivery Issues</h2>
              <p className="text-muted-foreground mb-3">
                <strong>Before Shipping:</strong> Contact us within 24 hours of placing your order to update the shipping address.
              </p>
              <p className="text-muted-foreground mb-3">
                <strong>After Shipping:</strong> Once an order has shipped, address changes may not be possible. If the carrier returns the package due to an incorrect address, we&apos;ll contact you for instructions.
              </p>
              <p className="text-muted-foreground">
                <strong>Failed Deliveries:</strong> If no one is available to receive the package, the carrier will attempt delivery up to 3 times. After that, the package may be returned to us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">8. Lost or Damaged Packages</h2>
              <p className="text-muted-foreground mb-3">
                <strong>If your package is lost:</strong>
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Contact the carrier first using your tracking number</li>
                <li>If unresolved after 5 business days, contact us</li>
                <li>We&apos;ll investigate and arrange replacement or refund</li>
              </ul>

              <p className="text-muted-foreground mt-4">
                <strong>If your package arrives damaged:</strong>
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Document the damage with photos (package and contents)</li>
                <li>Contact us within 48 hours of delivery</li>
                <li>We&apos;ll arrange replacement or full refund at no extra cost</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">9. Local Pickup (Bhopal Area)</h2>
              <p className="text-muted-foreground">
                For customers in Bhopal, we offer local pickup from our craft studio. Select &quot;Local Pickup&quot; at checkout and choose a convenient time slot. You&apos;ll receive pickup instructions via email.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">10. Seasonal and Holiday Shipping</h2>
              <p className="text-muted-foreground mb-3">
                During peak seasons (diwali, Christmas, weddings season), shipping timelines may be extended due to high order volumes:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 text-muted-foreground">
                <li>Processing time: 3-5 business days</li>
                <li>Standard shipping: 7-10 business days</li>
                <li>Express shipping: 3-5 business days</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                We recommend placing orders at least 2 weeks before your desired delivery date during peak seasons.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">11. Questions?</h2>
              <p className="text-muted-foreground">
                If you have any questions about our shipping policy, please contact us:
              </p>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-muted-foreground">
                  Email: <a href="mailto:shipping@kaari.in" className="text-primary">shipping@kaari.in</a>
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
