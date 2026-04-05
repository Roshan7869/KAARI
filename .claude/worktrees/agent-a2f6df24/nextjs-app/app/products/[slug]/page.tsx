import ProductDetail from "@/pages/ProductDetail";

export default function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  return <ProductDetail />;
}
