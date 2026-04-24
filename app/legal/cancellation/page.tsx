import { Metadata } from 'next';
import KaariFooter from '@/components/KaariFooter';

export const metadata: Metadata = {
  title: 'Cancellation Policy | Kaari - Handmade Crochet Marketplace',
  description:
    'Learn about our cancellation policy for handmade crochet orders. Cancel within 24 hours for a full refund before production begins.',
};

export default function CancellationPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">
            Cancellation Policy
          </h1>

          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground leading-relaxed">
            <p className="text-muted-foreground mb-8">Last Updated: April 2026</p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">1. Cancellation Window</h2>
              <p className="text-muted-foreground">
                You may cancel your order within <strong>24 hours</strong> of placing it for a full
                refund, provided the item has not yet entered production. Since all Kaari products
                are handmade to order, cancellations after 24 hours may not be possible once an
                artisan has begun crafting your item.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">2. How to Request a Cancellation</h2>
              <p className="text-muted-foreground">
                To cancel your order, please contact us using one of the following methods:
              </p>
              <ul className="text-muted-foreground list-disc pl-6 mt-2 space-y-1">
                <li>
                  Email:{' '}
                  <a href="mailto:support@kaari.in" className="text-primary underline">
                    support@kaari.in
                  </a>{' '}
                  with your order number and reason for cancellation
                </li>
                <li>Use the Contact form on our website</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                We will confirm the cancellation status within <strong>12 business hours</strong>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">3. Customized Orders</h2>
              <p className="text-muted-foreground">
                Orders for <strong>customized or personalized</strong> crochet items cannot be
                cancelled once the artisan has begun work on your item, regardless of the 24-hour
                window. Please review your customization details carefully before confirming your
                order.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">
                4. Refunds on Approved Cancellations
              </h2>
              <p className="text-muted-foreground">
                Approved cancellations are refunded to your original payment method within{' '}
                <strong>5–7 business days</strong>. The exact timing depends on your bank or payment
                provider.
              </p>
              <ul className="text-muted-foreground list-disc pl-6 mt-2 space-y-1">
                <li>UPI / Net Banking: 2–3 business days</li>
                <li>Credit / Debit Card: 5–7 business days</li>
                <li>Wallets: 1–2 business days</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">5. Orders Already Shipped</h2>
              <p className="text-muted-foreground">
                Orders that have already been dispatched cannot be cancelled. If you no longer wish
                to receive the order, please refuse the delivery at the door and contact us. Once
                the item is returned to us, we will process a refund as per our{' '}
                <a href="/legal/refund" className="text-primary underline">
                  Refund Policy
                </a>
                .
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">6. Governing Law</h2>
              <p className="text-muted-foreground">
                This policy is governed by the Consumer Protection Act, 2019 (India) and the
                Information Technology Act, 2000. Any disputes arising out of cancellations will be
                subject to the jurisdiction of courts in Bhopal, Madhya Pradesh, India.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mt-6 mb-3">7. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about our cancellation policy, please contact us at{' '}
                <a href="mailto:support@kaari.in" className="text-primary underline">
                  support@kaari.in
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
      <KaariFooter />
    </main>
  );
}
