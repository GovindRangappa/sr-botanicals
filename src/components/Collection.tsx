// src/components/Collection.tsx
import Image from 'next/image';
import Link from 'next/link';
import FadeInOnScroll from '@/components/FadeInOnScroll';

const items = [
  { name: "Soaps", image: "/Collection-1.png", category: "Skin-Soaps" },
  { name: "Hair Oils", image: "/Collection-2.png", category: "Hair-Oils" },
  { name: "Hair Pomades", image: "/Collection-3.png", category: "Hair-Pomades" },
  { name: "Shampoo Bars", image: "/HibiscusShampooBar.png", category: "Hair-Shampoo-Bars" },
];

export default function Collection() {
  return (
    <section className="py-20 px-4 bg-[#f5f2e8] w-full">
      <FadeInOnScroll>
        <h2 className="py-5 text-4xl font-bold font-['Playfair_Display'] text-center text-[#3c2f2f] mb-12">
          Our Collection
        </h2>

        {/* Mobile: horizontal scroll */}
        <div className="flex gap-6 overflow-x-auto sm:hidden px-2 snap-x snap-mandatory scroll-smooth">
          {items.map((item, idx) => (
            <Link key={idx} href={`/shop#${item.category}`} passHref>
              <div className="min-w-[250px] snap-start shrink-0 bg-white hover:bg-[#f8f5ee] rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col items-center py-4 px-2">
                <div className="relative w-[90%] aspect-[3/4] overflow-hidden rounded-xl border border-[#ddd]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h3 className="mt-4 mb-2 text-xl font-semibold font-['Playfair_Display'] text-[#3c2f2f] text-center">
                  {item.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>

        {/* Desktop & Tablet: 2 or 4-column grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10 max-w-[1700px] mx-auto px-4">
          {items.map((item, idx) => (
            <Link key={idx} href={`/shop#${item.category}`} passHref>
              <div className="group cursor-pointer bg-white hover:bg-[#f8f5ee] rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col items-center w-full max-w-sm mx-auto py-4 px-2">
                <div className="relative w-[95%] aspect-[3/4] overflow-hidden rounded-xl border border-[#ddd]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h3 className="mt-4 mb-2 text-xl sm:text-2xl font-semibold font-['Playfair_Display'] text-[#3c2f2f] text-center">
                  {item.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </FadeInOnScroll>
    </section>
  );
}
