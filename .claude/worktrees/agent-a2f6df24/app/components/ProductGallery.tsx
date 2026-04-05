import Link from "next/link";

export default function ProductGallery() {
  const products = [
    { id: 1, title: "Crochet Handbag", price: "₹2,499" },
    { id: 2, title: "Amigurumi Doll", price: "₹1,899" },
    { id: 3, title: "Gajra Set", price: "₹899" },
    { id: 4, title: "Keychain", price: "₹299" },
  ];

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="font-display text-4xl text-center text-foreground mb-4">
          Featured Products
        </h2>
        <p className="text-center text-kaari-dark/60 mb-16 max-w-2xl mx-auto">
          Explore our carefully curated collection of handmade crochet pieces
        </p>
        <div className="grid md:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <div className="group cursor-pointer">
                <div className="bg-kaari-cream rounded-lg h-64 mb-4 flex items-center justify-center text-kaari-dark/40 group-hover:bg-kaari-cream/80 transition-colors">
                  Product Image
                </div>
                <h3 className="font-body text-lg text-kaari-dark mb-2 group-hover:text-kaari-gold transition-colors">
                  {product.title}
                </h3>
                <p className="font-display text-kaari-dark">{product.price}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link
            href="/products"
            className="inline-block px-8 py-3 bg-kaari-dark text-kaari-cream font-body text-sm uppercase tracking-widest hover:bg-kaari-dark/90 transition-colors"
          >
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
}
