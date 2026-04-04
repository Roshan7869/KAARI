import { Metadata } from "next";
import dynamic from "next/dynamic";
import ArtisanStory from "@/components/ArtisanStory";
import CrochetDivider from "@/components/CrochetDivider";
import { SectionSkeleton } from "@/components/ui/skeleton-loader";

const CraftProcess = dynamic(() => import("@/components/CraftProcess"), {
  loading: () => <SectionSkeleton height="h-64" className="py-16" />,
  ssr: false,
});

const InstagramFeature = dynamic(() => import("@/components/InstagramFeature"), {
  loading: () => <SectionSkeleton height="h-48" className="py-16" />,
  ssr: false,
});

const CustomDesignForm = dynamic(() => import("@/components/CustomDesignForm"), {
  loading: () => <SectionSkeleton height="h-64" className="py-16" />,
  ssr: false,
});

const KaariFooter = dynamic(() => import("@/components/KaariFooter"), {
  ssr: false,
  loading: () => <SectionSkeleton height="h-40" />,
});

export const metadata: Metadata = {
  title: "About Us | Kaari — Handmade Crochet",
  description:
    "The story of Kaari — handmade crochet from the heart of India. Meet our artisans, learn our craft process, and get in touch.",
  openGraph: {
    type: "website",
    url: "https://kaari.in/about",
    title: "About Us | Kaari Handmade",
    description: "Meet the artisans behind every stitch.",
  },
};

export default function AboutPage() {
  return (
    <main className="overflow-x-hidden" id="main-content" tabIndex={-1}>
      {/* ── Page header ── */}
      <section className="pt-28 pb-12 bg-gradient-warm text-center">
        <p className="font-heritage text-accent text-xs tracking-[0.35em] uppercase mb-3">
          Who We Are
        </p>
        <h1 className="font-display text-4xl md:text-6xl text-stone-800 mb-4">
          About Kaari
        </h1>
        <div className="w-14 h-px bg-accent mx-auto mb-6" />
        <p className="font-heritage text-lg text-muted-foreground max-w-xl mx-auto px-6">
          Every stitch is a story. Every piece carries the spirit of its maker.
        </p>
      </section>

      {/* ── Our Story & Artisan section ── */}
      <ArtisanStory />

      <CrochetDivider />

      {/* ── Mission panel ── */}
      <section className="py-16 bg-gradient-warm">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="font-heritage text-accent text-xs tracking-[0.3em] uppercase mb-4">
            Our Mission
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-stone-800 mb-6">
            Empowering Artisans, <br className="hidden md:block" />
            Celebrating Craft
          </h2>
          <p className="font-heritage text-lg text-muted-foreground leading-relaxed mb-4">
            Founded in 2024, Kaari was born from a desire to preserve and celebrate
            India&apos;s rich tradition of handcrafting. We connect skilled artisans
            — primarily women — with people who appreciate the beauty of handmade goods.
          </p>
          <p className="font-heritage text-lg text-muted-foreground leading-relaxed">
            We believe in fair wages, ethical sourcing, and taking the time to do
            things right. No factories. No shortcuts. Just craftsmanship.
          </p>
        </div>
      </section>

      <CrochetDivider />

      {/* ── Craft Process ── */}
      <CraftProcess />

      <CrochetDivider />

      {/* ── Instagram / Social proof ── */}
      <InstagramFeature />

      <CrochetDivider />

      {/* ── Custom Design Form ── */}
      <CustomDesignForm />

      <CrochetDivider />

      {/* ── Footer ── */}
      <KaariFooter />
    </main>
  );
}
