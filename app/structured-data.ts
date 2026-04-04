export const generateStructuredData = () => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kaari Marketplace",
    url: "https://kaari.in",
    logo: "https://kaari.in/logo.png",
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
      telephone: "+91-9999999999",
      contactType: "Customer Service",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
  };
};
