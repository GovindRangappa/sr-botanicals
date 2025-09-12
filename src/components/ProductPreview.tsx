// src/components/ProductPreview.tsx
import Image from 'next/image';
import Link from 'next/link';
import FadeInOnScroll from '@/components/FadeInOnScroll';

const products = [
  { name: "Silky Lock Elixir (8oz)", slug: "silky-lock-elixir", price: "$12", image: "/SilkyLockElixir.png" },
  { name: "Wild Rose", slug: "wild-rose", price: "$4.99", image: "/WildRose.png" },
  { name: "Evergreen Forest", slug: "evergreen-forest", price: "$4.99", image: "/EvergreenForest.png" },
];

export default function ProductPreview() {
  return (
    <section className="py-20 px-4 bg-[#f5f2e8]">
      <FadeInOnScroll>
        <h2 className="text-4xl font-bold font-['Playfair_Display'] text-center text-[#3c2f2f] mb-16">
          Popular Products
        </h2>

        {/* Mobile: horizontal scroll */}
        <div className="flex gap-6 overflow-x-auto sm:hidden px-2 snap-x snap-mandatory scroll-smooth">
          {products.map((product, idx) => (
            <Link key={idx} href={`/product/${product.slug}`}>
              <div className="min-w-[250px] snap-start shrink-0 bg-white rounded-2xl shadow-md hover:shadow-2xl transition duration-300 hover:bg-[#f5f5f5] cursor-pointer p-4">
                <div className="relative w-[95%] aspect-[3/4] overflow-hidden rounded-xl border border-[#ddd] mx-auto mb-4">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold font-['Playfair_Display'] text-[#3c2f2f] mb-1">
                    {product.name}
                  </h3>
                  <p className="text-green-800 font-['Playfair_Display'] text-base">{product.price}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Tablet and up: grid layout */}
        <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-10 max-w-[1700px] mx-auto px-4">
          {products.map((product, idx) => (
            <Link key={idx} href={`/product/${product.slug}`}>
              <div className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition duration-300 hover:bg-[#f5f5f5] cursor-pointer w-full max-w-sm mx-auto p-4">
                <div className="relative w-[95%] aspect-[3/4] overflow-hidden rounded-xl border border-[#ddd] mx-auto mb-4">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-semibold font-['Playfair_Display'] text-[#3c2f2f] mb-1">
                    {product.name}
                  </h3>
                  <p className="text-green-800 font-['Playfair_Display'] text-lg">{product.price}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link href="/shop">
            <button className="bg-[#2f5d50] text-white px-8 py-3 rounded-full text-lg hover:bg-[#24493f] font-['Playfair_Display'] transition">
              Shop All
            </button>
          </Link>
        </div>
      </FadeInOnScroll>
    </section>
  );
}
