import HeroSection from "@/components/HeroSection";
import ArtisanStory from "@/components/ArtisanStory";
import CraftProcess from "@/components/CraftProcess";
import ProductGallery from "@/components/ProductGallery";
import InstagramFeature from "@/components/InstagramFeature";
import CustomDesignForm from "@/components/CustomDesignForm";
import KaariFooter from "@/components/KaariFooter";
import CrochetDivider from "@/components/CrochetDivider";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      <ErrorBoundary componentName="Hero Section">
        <HeroSection />
      </ErrorBoundary>

      <CrochetDivider />

      <ErrorBoundary componentName="Artisan Story">
        <ArtisanStory />
      </ErrorBoundary>

      <CrochetDivider />

      <ErrorBoundary componentName="Craft Process">
        <CraftProcess />
      </ErrorBoundary>

      <CrochetDivider />

      <ErrorBoundary componentName="Product Gallery">
        <ProductGallery />
      </ErrorBoundary>

      <CrochetDivider />

      <ErrorBoundary componentName="Instagram Feature">
        <InstagramFeature />
      </ErrorBoundary>

      <CrochetDivider />

      <ErrorBoundary componentName="Custom Design Form">
        <CustomDesignForm />
      </ErrorBoundary>

      <CrochetDivider />

      <ErrorBoundary componentName="Footer">
        <KaariFooter />
      </ErrorBoundary>
    </main>
  );
}
