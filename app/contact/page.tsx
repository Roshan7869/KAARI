import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import KaariFooter from "@/components/KaariFooter";

export const metadata: Metadata = {
  title: "Contact Us | Kaari - Handmade Crochet Marketplace",
  description:
    "Get in touch with Kaari for handmade crochet products, custom orders, and wholesale inquiries.",
  openGraph: {
    type: "website",
    url: "https://kaari.in/contact",
    title: "Contact Us | Kaari",
    description: "We'd love to hear from you!",
  },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-display font-bold mb-2 text-center">Contact Us</h1>
        <p className="text-center text-muted-foreground mb-12">
          We&apos;re here to help with your crochet needs
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="p-6 bg-card rounded-lg border border-border">
            <h3 className="text-xl font-semibold mb-4">Get in Touch</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Email</h4>
                <p className="text-muted-foreground">
                  <a href="mailto:hello@kaari.in" className="text-primary">
                    hello@kaari.in
                  </a>
                </p>
              </div>
              <div>
                <h4 className="font-medium">Phone</h4>
                <p className="text-muted-foreground">
                  <a href="tel:+919999999999" className="text-primary">
                    +91 99999 99999
                  </a>
                </p>
              </div>
              <div>
                <h4 className="font-medium">Location</h4>
                <p className="text-muted-foreground">
                  Bhopal, Madhya Pradesh, India
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-card rounded-lg border border-border">
            <h3 className="text-xl font-semibold mb-4">Business Hours</h3>
            <div className="space-y-2">
              <p className="text-muted-foreground">Monday - Friday: 9:00 AM - 6:00 PM</p>
              <p className="text-muted-foreground">Saturday: 10:00 AM - 4:00 PM</p>
              <p className="text-muted-foreground">Sunday: Closed</p>
            </div>
          </div>
        </div>

        <form className="space-y-4 max-w-xl mx-auto">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-md border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 rounded-md border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="your.email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              rows={4}
              className="w-full px-4 py-2 rounded-md border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="How can we help you?"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            Send Message
          </button>
        </form>
      </div>
      <KaariFooter />
    </main>
  );
}
