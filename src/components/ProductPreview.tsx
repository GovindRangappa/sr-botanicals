// src/components/ProductPreview.tsx
import Image from 'next/image';
import Link from 'next/link';
import FadeInOnScroll from '@/components/FadeInOnScroll';

type PopularProduct = {
  name: string;
  slug: string;
  price: string;
  image: string;
  prices?: { size: string; price: string }[];
};

const products: PopularProduct[] = [
  {
    name: "Silky Lock Elixir",
    slug: "silky-lock-elixir-original",
    price: "$6.00",
    image: "/SilkyLockElixir.png",
    prices: [
      { size: "4 oz", price: "$6.00" },
      { size: "8 oz", price: "$12.00" },
    ],
  },
  { name: "Wild Rose", slug: "wild-rose", price: "$4.99", image: "/WildRose.png" },
  {
    name: "Nourish Lock Pomade",
    slug: "nourish-lock-pomade",
    price: "$10.00",
    image: "/NourishLockPomade.png",
    prices: [
      { size: "4 oz", price: "$10.00" },
      { size: "8 oz", price: "$20.00" },
    ],
  },
];

function ProductPrice({ product, className }: { product: PopularProduct; className: string }) {
  if (product.prices && product.prices.length > 1) {
    return (
      <p className={`whitespace-nowrap font-['Playfair_Display'] text-green-800 ${className}`}>
        {product.prices.map((entry, index) => (
          <span key={entry.size}>
            {index > 0 && <span className="mx-2 text-[#3c2f2f]/40">·</span>}
            <span className="font-normal text-[#3c2f2f]/75">{entry.size}</span>{" "}
            <span>{entry.price}</span>
          </span>
        ))}
      </p>
    );
  }

  return <p className={`text-green-800 font-['Playfair_Display'] ${className}`}>{product.price}</p>;
}

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
                  <ProductPrice product={product} className="text-base" />
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
                  <ProductPrice product={product} className="text-lg" />
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
