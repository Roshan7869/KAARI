import { Metadata } from "next";
import { Playfair_Display, Cormorant_Garamond, Inter, DM_Sans, Noto_Serif_Devanagari } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "./providers";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["300", "400", "500"],
});

const notoDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
  weight: ["400", "600", "700"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kaari.in'

export const metadata: Metadata = {
  title: {
    template: "%s | Kaari - Handmade Crochet Marketplace",
    default: "Kaari - Handmade Crochet Marketplace",
  },
  description:
    "Discover beautiful handmade crochet products crafted with love. Shop unique crocheted clothing, accessories, and home decor from Indian artisans.",
  keywords: [
    "handmade crochet",
    "crochet products",
    "handmade clothing",
    "crochet accessories",
    "Indian artisans",
    "crochet home decor",
    "custom crochet",
  ],
  metadataBase: new URL(APP_URL),
  authors: [{ name: "Kaari Marketplace" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: APP_URL,
    title: "Kaari - Handmade Crochet Marketplace",
    description:
      "Discover beautiful handmade crochet products crafted with love",
    siteName: "Kaari Marketplace",
    images: [
      {
        url: `${APP_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "Kaari Marketplace - Handmade Crochet",
      },
    ],
  },
  alternates: {
    canonical: APP_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Schema.org structured data for the site
const siteStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kaari Marketplace",
  url: APP_URL,
  logo: `${APP_URL}/logo.png`,
  description:
    "Handmade crochet marketplace connecting artisans with customers",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Bhopal",
    addressRegion: "Madhya Pradesh",
    postalCode: "462001",
    addressCountry: "IN",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
      ? `+91-${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER.replace(/^91/, '')}`
      : '',
    contactType: "Customer Service",
    areaServed: "IN",
    availableLanguage: ["English", "Hindi"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${cormorant.variable} ${inter.variable} ${dmSans.variable} ${notoDevanagari.variable}`}>
      <head>
        <link rel="canonical" href={APP_URL} />
        <link rel="alternate" href={`${APP_URL}/sitemap.xml`} type="application/xml" title="Sitemap" />
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8B1F2A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Kaari" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteStructuredData, null, 2),
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ClerkProvider>
          <Providers>
            <AnnouncementBar />
            <Navbar />
            {children}
          </Providers>
          <WhatsAppButton />
        </ClerkProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
