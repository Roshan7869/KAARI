const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kaari.in';

export const generateStructuredData = () => {
  return {
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
};
